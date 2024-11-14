from django.db import models
from django.conf import settings
from streamings.models import Streaming  

class ChatMessage(models.Model):
    streaming = models.ForeignKey(Streaming, on_delete=models.CASCADE, related_name="chat_messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"
