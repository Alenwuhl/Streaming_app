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
            # Notify host that viewer is ready
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "viewer_ready",
                    "data": text_data_json.get("data", None),
                },
            )
        elif message_type == "offer":
            # Send host offer to viewer
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "send_offer",
                    "data": text_data_json.get("data", None),
                },
            )
        elif message_type == "answer":
            # Send viewer response to host
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "send_answer",
                    "data": text_data_json.get("data", None),
                },
            )
        elif message_type == "ice":
            # Send ICE candidate
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "send_ice_candidate",
                    "data": text_data_json.get("data", None),
                },
            )
        elif message_type == "start_survey":
            question = text_data_json.get("question", "").strip()
            options = text_data_json.get("options", [])

            if not question or not options or any(opt.strip() == "" for opt in options):
                return

            # Format options for clients
            formatted_options = [{"text": option, "votes": 0} for option in options]

            # Send survey to connected customers
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "survey_message",
                    "question": question,
                    "options": [option["text"] for option in formatted_options],
                },
            )

    async def viewer_ready(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps({"type": "ready", "data": data}))

    async def send_offer(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps({"type": "offer", "data": data}))

    async def send_answer(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps({"type": "answer", "data": data}))

    async def send_ice_candidate(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps({"type": "ice", "data": data}))

    async def survey_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "survey_start",
                    "question": event["question"],
                    # Ajuste: Solo enviar el texto de las opciones
                    "options": event["options"],
                }
            )
        )
