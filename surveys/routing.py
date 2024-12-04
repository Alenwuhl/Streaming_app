from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/surveys/', consumers.SurveyConsumer.as_asgi()),
]
