import json
from channels.generic.websocket import AsyncWebsocketConsumer

class WebRTCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.room_group_name = f'stream_{self.stream_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'ready':
            # Solo envía el mensaje de 'ready' a otros miembros del grupo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'stream_message',
                    'data': {'type': 'ready'}
                }
            )
        else:
            # Transmite el mensaje recibido a todos los miembros del grupo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'stream_message',
                    'data': data
                }
            )

    async def stream_message(self, event):
        await self.send(text_data=json.dumps(event['data']))
