import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Survey, Option, Vote
from streamings.models import Streaming


class SurveyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("[DEBUG] Entrando a connect() de SurveyConsumer...")
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.survey_group_name = f"survey_{self.stream_id}"
        self.user = self.scope["user"]
        print(f"[DEBUG] User: {self.user} | Authenticated: {self.user.is_authenticated}")


        await self.channel_layer.group_add(self.survey_group_name, self.channel_name)
        await self.accept()

        print(f"[INFO] Client {self.channel_name} connected to {self.survey_group_name}")

        # Enviar encuesta activa si existe
        survey = await self.get_active_survey(self.stream_id)
        if survey:
            await self.send_active_survey(survey)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.survey_group_name, self.channel_name)
        print(f"[INFO] Client {self.channel_name} disconnected from {self.survey_group_name}")

    async def receive(self, text_data):
        print(f"[DEBUG] Mensaje recibido: {text_data}")
        try:
            data = json.loads(text_data)

            if data.get("type") == "start_survey":
                await self.handle_start_survey(data)

            elif data.get("type") == "survey_update":
                await self.handle_vote(data)

        except Exception as e:
            print(f"[ERROR] receive(): {e}")


    async def handle_start_survey(self, data):
        print(f"[DEBUG] Iniciando nueva encuesta con datos: {data}")
        question = data.get("question")
        options = [opt["text"].strip() for opt in data["options"] if opt.get("text", "").strip()]

        if not question or len(options) < 2:
            print("[ERROR] Pregunta u opciones inválidas.")
            return

        # Finalizar encuestas activas anteriores
        await self.deactivate_existing_surveys()

        # Crear nueva encuesta
        survey = await self.create_survey(question, options)

        await self.channel_layer.group_send(
            self.survey_group_name,
            {
                "type": "survey_message",
                "question": survey.question,
                "options": await self.get_options_dict(survey),
            },
        )

    async def handle_vote(self, data):
        option_id = data.get("option_id")
        if not option_id or not self.user.is_authenticated:
            return

        option = await database_sync_to_async(Option.objects.select_related("survey").get)(id=option_id)
        survey = option.survey

        # Validar que la encuesta esté activa
        if not survey.is_active:
            return

        # Eliminar voto anterior del usuario (si existía)
        await database_sync_to_async(Vote.objects.filter(user=self.user, option__survey=survey).delete)()

        # Crear nuevo voto
        await database_sync_to_async(Vote.objects.create)(option=option, user=self.user)

        # Obtener resultados actualizados
        results = await self.get_survey_results(survey)

        await self.channel_layer.group_send(
            self.survey_group_name,
            {
                "type": "survey_update_message",
                "results": results,
            },
        )

    async def send_active_survey(self, survey):
        options = await self.get_options_dict(survey)
        await self.send(
            text_data=json.dumps({
                "type": "survey_start",
                "question": survey.question,
                "options": options,
            })
        )

    async def survey_message(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "survey_start",
                "question": event["question"],
                "options": event["options"],
            })
        )

    async def survey_update_message(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "survey_update",
                "results": event["results"],
            })
        )

    # ---------------------------------------
    # database sync methods
    # ---------------------------------------

    @database_sync_to_async
    def get_active_survey(self, stream_id):
        return Survey.objects.filter(stream_id=stream_id, is_active=True).prefetch_related("options").first()

    @database_sync_to_async
    def create_survey(self, question, options_texts):
        stream = Streaming.objects.get(id=self.stream_id)
        survey = Survey.objects.create(
            stream=stream,
            question=question,
            created_by=self.user,
            is_active=True
        )
        for text in options_texts[:5]:
            Option.objects.create(survey=survey, text=text)
        return survey

    @database_sync_to_async
    def deactivate_existing_surveys(self):
        Survey.objects.filter(stream_id=self.stream_id, is_active=True).update(is_active=False)

    @database_sync_to_async
    def get_options_dict(self, survey):
        return [{"id": opt.id, "text": opt.text} for opt in survey.options.all()]

    @database_sync_to_async
    def get_survey_results(self, survey, show_votes=False):
        results = []
        total = Vote.objects.filter(option__survey=survey).count()
        for opt in survey.options.all():
            count = opt.votes.count()
            percent = (count / total) * 100 if total > 0 else 0
            result = {
                "option_id": opt.id,
                "percentage": percent,
                "votes": count
            }
            if show_votes:
                result["votes"] = count
            results.append(result)
        return results
