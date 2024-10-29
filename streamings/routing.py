from django.urls import path
from .consumers import WebRTCConsumer

websocket_urlpatterns = [
    path('ws/stream/<str:stream_id>/', WebRTCConsumer.as_asgi()),
]
