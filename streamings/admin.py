from django.contrib import admin
from .models import Streaming

@admin.register(Streaming)
class StreamingAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'description', 'host', 'is_live', 'has_ended', 'recorded_date')
