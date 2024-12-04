from django import forms
from .models import Survey, Option

class SurveyForm(forms.ModelForm):
    class Meta:
        model = Survey
        fields = ['question', 'duration']

class OptionForm(forms.ModelForm):
    class Meta:
        model = Option
        fields = ['text']
