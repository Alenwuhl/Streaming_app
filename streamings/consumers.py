import json
from channels.generic.websocket import AsyncWebsocketConsumer

class StreamingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope["url_route"]["kwargs"]["stream_id"]
        self.group_name = f"stream_{self.stream_id}"

        # Add to WebSocket Group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Remove from WebSocket group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get("type", None)

        if message_type == "ready":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "viewer_ready", "data": text_data_json.get("data", None)},
            )
        elif message_type == "offer":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "send_offer", "data": text_data_json.get("data", None)},
            )
        elif message_type == "answer":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "send_answer", "data": text_data_json.get("data", None)},
            )
        elif message_type == "ice":
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "send_ice_candidate", "data": text_data_json.get("data", None)},
            )

    async def viewer_ready(self, event):
        await self.send(text_data=json.dumps({"type": "ready", "data": event["data"]}))

    async def send_offer(self, event):
        await self.send(text_data=json.dumps({"type": "offer", "data": event["data"]}))

    async def send_answer(self, event):
        await self.send(text_data=json.dumps({"type": "answer", "data": event["data"]}))

    async def send_ice_candidate(self, event):
        await self.send(text_data=json.dumps({"type": "ice", "data": event["data"]}))
