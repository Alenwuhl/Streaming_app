import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import streamings.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'streaming_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            streamings.routing.websocket_urlpatterns
        )
    ),
})
