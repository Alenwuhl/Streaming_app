from django.db import models
from django.contrib.auth.models import User
from streamings.models import Streaming

from django.conf import settings  # Importar settings para AUTH_USER_MODEL


class Survey(models.Model):
    stream = models.ForeignKey(
        Streaming, on_delete=models.CASCADE, related_name="surveys"
    )
    question = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )  # Ajuste aquí
    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.PositiveIntegerField(null=True, blank=True)  # Duración en minutos
    is_active = models.BooleanField(
        default=True
    )  # Determina si la encuesta está activa

    def __str__(self):
        return self.question


class Option(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=100)
    votes = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.text} ({self.votes} votes)"

class Vote(models.Model):
    option = models.ForeignKey(Option, related_name="votes", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
