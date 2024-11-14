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
        data = text_data_json.get('data', None)

        print(f"[DEBUG] Mensaje recibido: type={message_type}, data={data}")

        if message_type == 'ready':
            # Notificar al host que el viewer está listo
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'viewer_ready',
                    'data': data,
                }
            )
        elif message_type == 'offer':
            # Enviar oferta del host al viewer
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_offer',
                    'data': data,
                }
            )
        elif message_type == 'answer':
            # Enviar respuesta del viewer al host
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_answer',
                    'data': data,
                }
            )
        elif message_type == 'ice':
            # Enviar candidato ICE
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_ice_candidate',
                    'data': data,
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
