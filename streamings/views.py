from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .forms import StreamingForm
from .models import Streaming
from users.models import CustomUser
from django.http import Http404, JsonResponse, HttpResponse
from django.utils import timezone


@login_required
def start_stream(request):
    print("Accediendo a la vista 'start_stream'.")
    if request.method == 'POST':
        form = StreamingForm(request.POST)
        if form.is_valid():
            stream = form.save(commit=False)
            stream.host = request.user
            stream.is_live = False
            stream.has_ended = False
            stream.save()
            print(f"Stream creado: ID={stream.id}, Título={stream.title}, Host={stream.host.username}")
            return redirect('streaming_host_view', stream_id=stream.id)
        else:
            print("Formulario inválido en 'start_stream'.")
    else:
        form = StreamingForm()
    return render(request, 'streamings/start_stream.html', {'form': form})


@login_required
@require_POST
def start_stream_live(request, stream_id):
    print(f"Intentando iniciar el stream con ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)
    if not stream.is_live and not stream.has_ended:
        stream.is_live = True
        stream.save()
        print(f"Stream ID={stream_id} ahora está en vivo.")
        return JsonResponse({"status": "success", "message": "Stream is now live."})
    print(f"No se pudo iniciar el stream ID={stream_id}. El stream ya está en vivo o ha terminado.")
    return JsonResponse({"status": "error", "message": "Unable to start the stream."})


@login_required
def end_stream(request, stream_id):
    if request.method == "POST":
        try:
            # Lógica para finalizar el stream
            stream = Streaming.objects.get(id=stream_id)
            stream.has_ended = True
            stream.save()
            return JsonResponse({"status": "success"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=400)


@login_required
def stream_list(request):
    print("Accediendo a la vista 'stream_list'.")
    current_user = request.user
    streams = Streaming.objects.filter(is_live=True)
    following_filter = request.GET.get('following') == 'true'

    if following_filter:
        streams = streams.filter(host__in=current_user.following.all())
        no_following_streams = not streams.exists()
        print("Aplicando filtro de 'following'.")
    else:
        no_following_streams = False

    query = request.GET.get('query')
    user_data = []
    if query:
        user_results = CustomUser.objects.filter(username__icontains=query)
        for user in user_results:
            has_active_stream = user.streams.filter(is_live=True).exists()
            user_data.append({
                'user': user,
                'has_active_stream': has_active_stream,
                'active_stream': user.streams.filter(is_live=True).first() if has_active_stream else None
            })
        no_user_found = not user_data
        print(f"Búsqueda realizada: query='{query}', resultados={len(user_results)}.")
    else:
        user_data = None
        no_user_found = False

    no_active_streams = not streams.exists()
    context = {
        'streams': streams,
        'user_data': user_data,
        'query': query,
        'following_filter': following_filter,
        'no_active_streams': no_active_streams,
        'no_following_streams': no_following_streams,
        'no_user_found': no_user_found,
    }
    return render(request, 'streamings/stream_list.html', context)


@login_required
def streaming_host_view(request, stream_id):
    print(f"Accediendo a la vista 'streaming_host_view' para el stream ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)
    context = {
        'stream': stream,
        'is_host': True,
        'username': request.user.username,
        'hostname': stream.host.username,
    }
    return render(request, 'streamings/streaming_host_view.html', context)


def streaming_viewer_view(request, stream_id):
    print(f"Accediendo a la vista 'streaming_viewer_view' para el stream ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id)
    if not stream.is_live:
        print(f"Stream ID={stream_id} no está activo.")
        raise Http404("El stream no está activo.")
    context = {
        'stream': stream,
        'is_host': False,
        'username': request.user.username,
        'hostname': stream.host.username,
    }
    return render(request, 'streamings/streaming_viewer_view.html', context)

@login_required
def following_streams(request):
    print("Accediendo a la vista 'following_streams'.")
    following_users = request.user.following.all()
    streams = Streaming.objects.filter(is_live=True, host__in=following_users)
    return render(request, 'streamings/following_streams.html', {'streams': streams})


def save_video_file(request, stream_id):
    print(f"Guardando archivo de video para el stream ID={stream_id}.")
    if request.method == "POST" and request.FILES.get('video'):
        streaming = get_object_or_404(Streaming, id=stream_id)
        video_file = request.FILES['video'].read()
        streaming.video_file = video_file
        streaming.has_ended = True
        streaming.save()
        print(f"Archivo de video guardado para el stream ID={stream_id}.")
        return JsonResponse({"status": "success"}, status=200)
    print("No se encontró archivo de video en la solicitud.")
    return JsonResponse({"status": "error", "message": "No video file found"}, status=400)


@login_required
def view_recorded_stream(request, stream_id):
    print(f"Accediendo al stream grabado con ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id, has_ended=True)
    if stream.video_file:
        return render(request, 'streamings/view_recorded_stream.html', {'stream': stream})
    print("No se encontró video grabado para este stream.")
    return HttpResponse("This stream does not have a recorded video.")


@login_required
def get_stream_video(request, stream_id):
    print(f"Obteniendo archivo de video para el stream ID={stream_id}.")
    try:
        stream = Streaming.objects.get(id=stream_id)
        video_content = stream.video_file
        response = HttpResponse(video_content, content_type='video/webm')
        response['Content-Disposition'] = f'inline; filename="stream_video_{stream_id}.webm"'
        return response
    except Streaming.DoesNotExist:
        print(f"Stream ID={stream_id} no encontrado.")
        raise Http404("Stream not found.")
