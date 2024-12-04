from django.urls import path
from . import views

urlpatterns = [
    path('create/<int:stream_id>/', views.create_survey, name='create_survey'),
    path('vote/<int:survey_id>/', views.vote, name='vote'),
    path('end/<int:survey_id>/', views.end_survey, name='end_survey'),
]
