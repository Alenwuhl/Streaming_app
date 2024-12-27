from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.utils.timezone import now
from .models import Survey, Option
from .forms import SurveyForm, OptionForm

def create_survey(request, stream_id):
    if request.method == 'POST':
        survey_form = SurveyForm(request.POST)
        options = request.POST.getlist('options')  # Receive the options
        if survey_form.is_valid() and options:
            survey = survey_form.save(commit=False)
            survey.created_by = request.user
            survey.stream_id = stream_id
            survey.save()

            for option_text in options[:5]:  # Maximum of 5 options
                Option.objects.create(survey=survey, text=option_text)

            return JsonResponse({'message': 'Survey created successfully'}, status=201)
    return JsonResponse({'error': 'Invalid data'}, status=400)

def vote(request, survey_id):
    if request.method == 'POST':
        option_id = request.POST.get('option_id')
        option = get_object_or_404(Option, id=option_id, survey_id=survey_id)
        option.votes += 1
        option.save()
        return JsonResponse({'votes': option.votes}, status=200)
    return JsonResponse({'error': 'Invalid request'}, status=400)

def end_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    survey.is_active = False
    survey.save()
    return JsonResponse({'message': 'Survey ended successfully'}, status=200)
