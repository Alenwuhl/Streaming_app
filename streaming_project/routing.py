from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path, include
from streamings.routing import websocket_urlpatterns as streamings_ws_patterns
from chat.routing import websocket_urlpatterns as chat_ws_patterns

application = ProtocolTypeRouter({
    "websocket": AuthMiddlewareStack(
        URLRouter(
            streamings_ws_patterns + chat_ws_patterns
        )
    ),
})
