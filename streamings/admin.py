from django.contrib import admin
from .models import Streaming

@admin.register(Streaming)
class StreamingAdmin(admin.ModelAdmin):
    list_display = ('title', 'description', 'host', 'is_live', 'has_ended', 'video_file')
