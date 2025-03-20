import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SurveyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """ Se ejecuta cuando un cliente se conecta al WebSocket """
        await self.accept()
        self.survey_group_name = "survey_group"
        self.votes = {}  # Inicializar votos en memoria

        # Agregar el cliente al grupo WebSocket
        await self.channel_layer.group_add(self.survey_group_name, self.channel_name)
        print(f"[INFO] Client {self.channel_name} connected to {self.survey_group_name}")

    async def disconnect(self, close_code):
        """ Se ejecuta cuando un cliente se desconecta del WebSocket """
        await self.channel_layer.group_discard(self.survey_group_name, self.channel_name)
        print(f"[INFO] Client {self.channel_name} disconnected from {self.survey_group_name}")

    async def receive(self, text_data):
        """ Maneja los mensajes recibidos del cliente WebSocket """
        try:
            data = json.loads(text_data)
            print(f"[DEBUG] Received WebSocket message: {data}")

            if data.get("type") == "start_survey":
                # Reiniciar votos cuando se inicia una nueva encuesta
                options = [str(opt["text"]).strip() for opt in data["options"] if "text" in opt and opt["text"].strip()]
                
                if not options:
                    print("[ERROR] No valid options received, aborting survey start.")
                    return
                
                self.votes = {i: 0 for i in range(len(options))}
                print(f"[INFO] Survey started, votes reset: {self.votes}")

                # Enviar encuesta a los clientes
                await self.channel_layer.group_send(
                    self.survey_group_name,
                    {
                        "type": "survey_message",
                        "question": data["question"],
                        "options": options,
                    },
                )

            elif data.get("type") == "survey_update":
                option_id = data.get("option")
                print(f"[DEBUG] Backend received vote for option {option_id}")

                # Verificar si hay una encuesta activa
                if not self.votes:
                    print("[ERROR] No active survey found. Votes are missing or empty.")
                    return

                # Verificar que la opción sea válida
                if option_id is None or option_id not in self.votes:
                    print(f"[ERROR] Invalid option_id received: {option_id} (Valid options: {list(self.votes.keys())})")
                    return

                # Incrementar el voto
                self.votes[option_id] += 1
                total_votes = sum(self.votes.values())

                results = [
                    {
                        "option": i,
                        "votes": self.votes[i],
                        "percentage": (self.votes[i] / total_votes) * 100 if total_votes else 0,
                    }
                    for i in range(len(self.votes))
                ]
                print(f"[INFO] Broadcasting survey update: {results}")

                # Enviar actualización de votos a todos los clientes
                await self.channel_layer.group_send(
                    self.survey_group_name,
                    {
                        "type": "survey_update_message",
                        "results": results,
                    },
                )

        except Exception as e:
            print(f"[ERROR] An error occurred in receive(): {e}")

    async def survey_message(self, event):
        """ Enviar encuesta inicial a todos los clientes conectados """
        print(f"[INFO] Sending survey_start to clients: {event}")
        await self.send(
            text_data=json.dumps(
                {
                    "type": "survey_start",
                    "question": event["question"],
                    "options": event["options"],
                }
            )
        )

    async def survey_update_message(self, event):
        """ Enviar actualización de votos a todos los clientes conectados """
        print(f"[INFO] Sending survey_update to clients: {event}")
        await self.send(
            text_data=json.dumps(
                {
                    "type": "survey_update",
                    "results": event["results"],
                }
            )
        )
