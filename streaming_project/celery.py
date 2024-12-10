from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
import logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "streaming_project.settings")

app = Celery("streaming_project")

# Configuración de Celery
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover tasks in all apps
app.autodiscover_tasks()


logger = logging.getLogger("celery")
logger.setLevel(logging.INFO)