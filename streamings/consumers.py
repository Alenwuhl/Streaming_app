import json
from channels.generic.websocket import AsyncWebsocketConsumer

class StreamingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.group_name = f'stream_{self.stream_id}'

        # Añadir al grupo de WebSocket
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        print(f"[DEBUG] WebSocket conectado: stream_id={self.stream_id}, channel_name={self.channel_name}")

    async def disconnect(self, close_code):
        # Eliminar del grupo de WebSocket
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print(f"[DEBUG] WebSocket desconectado: stream_id={self.stream_id}, channel_name={self.channel_name}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', None)

        print(f"[DEBUG] Mensaje recibido: {text_data_json}")

        if message_type == 'ready':
            # Notificar al host que el viewer está listo
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'viewer_ready',
                    'data': text_data_json.get('data', None),
                }
            )
        elif message_type == 'offer':
            # Enviar oferta del host al viewer
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_offer',
                    'data': text_data_json.get('data', None),
                }
            )
        elif message_type == 'answer':
            # Enviar respuesta del viewer al host
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_answer',
                    'data': text_data_json.get('data', None),
                }
            )
        elif message_type == 'ice':
            # Enviar candidato ICE
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_ice_candidate',
                    'data': text_data_json.get('data', None),
                }
            )
        elif message_type == 'start_survey':
            question = text_data_json.get('question', '').strip()
            options = text_data_json.get('options', [])

            if not question or not options or any(opt.strip() == '' for opt in options):
                print(f"[ERROR] Encuesta inválida recibida. Pregunta: {question}, Opciones: {options}")
                return

            print(f"[DEBUG] Encuesta recibida. Pregunta: {question}, Opciones: {options}")

            # Formatear opciones para los clientes
            formatted_options = [{'text': option, 'votes': 0} for option in options]

            # Enviar encuesta a los clientes conectados
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'survey_message',
                    'question': question,
                    'options': [option['text'] for option in formatted_options],  # Solo enviar los textos
                }
            )

    async def viewer_ready(self, event):
        data = event['data']
        print(f"[DEBUG] Viewer está listo, enviando notificación al host.")
        await self.send(text_data=json.dumps({
            'type': 'ready',
            'data': data
        }))

    async def send_offer(self, event):
        data = event['data']
        print(f"[DEBUG] Enviando oferta al viewer.")
        await self.send(text_data=json.dumps({
            'type': 'offer',
            'data': data
        }))

    async def send_answer(self, event):
        data = event['data']
        print(f"[DEBUG] Enviando respuesta al host.")
        await self.send(text_data=json.dumps({
            'type': 'answer',
            'data': data
        }))

    async def send_ice_candidate(self, event):
        data = event['data']
        print(f"[DEBUG] Enviando candidato ICE.")
        await self.send(text_data=json.dumps({
            'type': 'ice',
            'data': data
        }))

    async def survey_message(self, event):
        print(f"[DEBUG] Difundiendo encuesta: {event}")
        await self.send(text_data=json.dumps({
            'type': 'survey_start',
            'question': event['question'],
            # Ajuste: Solo enviar el texto de las opciones
            'options': event['options'],
        }))
