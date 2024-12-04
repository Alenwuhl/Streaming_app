from channels.generic.websocket import AsyncWebsocketConsumer
import json

class SurveyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.survey_group_name = "survey_group"
        await self.channel_layer.group_add(
            self.survey_group_name,
            self.channel_name
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.survey_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Manejar los datos recibidos aquí

        # Ejemplo: Enviar mensaje de encuesta al grupo
        if data.get('type') == 'start_survey':
            await self.channel_layer.group_send(
                self.survey_group_name,
                {
                    'type': 'survey_message',
                    'question': data['question'],
                    'options': data['options'],
                }
            )

    async def survey_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'survey_start',
            'question': event['question'],
            'options': event['options'],
        }))
