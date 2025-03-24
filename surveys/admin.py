from django.contrib import admin
from .models import Survey, Option, Vote

class OptionInline(admin.TabularInline):
    model = Option
    extra = 1

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ('question', 'stream', 'created_by', 'created_at', 'is_active')
    list_filter = ('is_active', 'created_at', 'stream')
    search_fields = ('question', 'stream__title', 'created_by__username')
    inlines = [OptionInline]
    readonly_fields = ('created_at',)

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('user', 'option', 'timestamp')
    list_filter = ('timestamp', 'option__survey')
    search_fields = ('user__username', 'option__text', 'option__survey__question')
    readonly_fields = ('timestamp',)
