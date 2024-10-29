from django import forms
from .models import Streaming

class StreamingForm(forms.ModelForm):
    class Meta:
        model = Streaming
        fields = ['title', 'description']
