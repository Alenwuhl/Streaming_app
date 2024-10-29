from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class CustomUser(AbstractUser):
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)