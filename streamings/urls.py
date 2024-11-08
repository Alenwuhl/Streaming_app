from django.urls import path
from .views import manage_stream, start_stream, stream_list, streaming_view, end_stream, save_video_file, start_stream_live, view_recorded_stream, get_stream_video

urlpatterns = [
    path('start/', start_stream, name='start_stream'),
    path('', stream_list, name='stream_list'),
    path('manage/<int:stream_id>/', manage_stream, name='manage_stream'),
    path('watch/<int:stream_id>/', streaming_view, name='streaming_view'),
    path('stream/end/<int:stream_id>/', end_stream, name='end_stream'),
    path('save_video/<int:stream_id>/', save_video_file, name='save_video'),
    path('stream/start_live/<int:stream_id>/', start_stream_live, name='start_stream_live'),
    path('view_recorded_stream/<int:stream_id>/', view_recorded_stream, name='view_recorded_stream'),
    path('get_stream_video/<int:stream_id>/', get_stream_video, name='get_stream_video'),
]
