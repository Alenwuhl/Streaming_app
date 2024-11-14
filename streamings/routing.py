from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/stream/(?P<stream_id>\d+)/$', consumers.StreamingConsumer.as_asgi()),
]
