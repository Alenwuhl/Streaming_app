from django.urls import path
from . import views

urlpatterns = [
    path('room/<str:stream_id>/', views.chat_room, name='chat_room'),
]