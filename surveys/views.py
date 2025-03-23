from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Survey
from streamings.models import Streaming


@login_required
def end_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)

    # Validar que quien finaliza la encuesta sea quien la creó
    if survey.created_by != request.user:
        return JsonResponse({'error': 'Unauthorized'}, status=403)

    survey.is_active = False
    survey.save()
    return JsonResponse({'message': 'Survey ended successfully'}, status=200)
