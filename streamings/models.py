from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

class Streaming(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streams')
    start_time = models.DateTimeField(auto_now_add=True)
    is_live = models.BooleanField(default=False)  # Si el streaming está en vivo
    has_ended = models.BooleanField(default=False)  # Si el streaming ha terminado

    def __str__(self):
        return self.title
