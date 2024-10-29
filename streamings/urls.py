from django.urls import path
from .views import manage_stream, start_stream, stream_list, streaming_view
from . import views


urlpatterns = [
    path('start/', start_stream, name='start_stream'),
    path('', stream_list, name='stream_list'),
    path('manage/<int:stream_id>/', manage_stream, name='manage_stream'),
    path('watch/<int:stream_id>/', streaming_view, name='streaming_view'),
    path('stream/end/<int:stream_id>/', views.end_stream, name='end_stream'),
]
