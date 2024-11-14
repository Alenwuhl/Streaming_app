from django.shortcuts import render, get_object_or_404
from streamings.models import Streaming
from .models import ChatMessage

def chat_room(request, stream_id):
    streaming = get_object_or_404(Streaming, id=stream_id, is_live=True)

    chat_messages = ChatMessage.objects.filter(streaming=streaming).order_by('timestamp')

    return render(request, 'chat/chat_room.html', {
        'streaming': streaming,
        'chat_messages': chat_messages,
    })