from django.utils import timezone
from django.db import models
from django.conf import settings
from streamings.models import Streaming


class Survey(models.Model):
    stream = models.ForeignKey(
        Streaming, on_delete=models.CASCADE, related_name="surveys"
    )
    question = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.PositiveIntegerField(null=True, blank=True)  # en minutos
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.question

    def total_votes(self):
        return Vote.objects.filter(option__survey=self).count()


class Option(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=100)

    def __str__(self):
        return self.text

    def vote_count(self):
        return self.votes.count()

    def vote_percentage(self):
        total = self.survey.total_votes()
        if total == 0:
            return 0
        return (self.vote_count() / total) * 100


class Vote(models.Model):
    option = models.ForeignKey("Option", on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("user", "option")

    def __str__(self):
        return f"{self.user} voted for '{self.option.text}'"
