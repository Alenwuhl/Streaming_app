import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'streaming_project.settings')
django.setup()

from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from streamings.routing import websocket_urlpatterns as streamings_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat_websocket_urlpatterns + streamings_websocket_urlpatterns
        )
    ),
})
