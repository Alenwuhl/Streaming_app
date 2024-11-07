from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .forms import StreamingForm
from .models import Streaming
from users.models import CustomUser
from django.http import Http404, JsonResponse, HttpResponse, StreamingHttpResponse
from django.utils import timezone



@login_required
def start_stream(request):
    if request.method == 'POST':
        form = StreamingForm(request.POST)
        if form.is_valid():
            stream = form.save(commit=False)
            stream.host = request.user
            stream.is_live = False  # Crear el stream en modo offline
            stream.has_ended = False
            stream.save()
            # Redirige a streaming_view con el ID del stream creado
            return redirect('streaming_view', stream_id=stream.id)
    else:
        form = StreamingForm()
    return render(request, 'streamings/start_stream.html', {'form': form})

@login_required
@require_POST
def start_stream_live(request, stream_id):
    print(f"Attempting to start stream with ID: {stream_id}")
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)
    print(f"Stream found: {stream}")
    print(f"Stream is_live: {stream.is_live}, has_ended: {stream.has_ended}")

    if not stream.is_live and not stream.has_ended:
        stream.is_live = True
        stream.save()
        print("Stream is now live.")
        return JsonResponse({"status": "success", "message": "Stream is now live."})
    
    print("Unable to start the stream.")
    return JsonResponse({"status": "error", "message": "Unable to start the stream."})


@login_required
def stream_list(request):
    current_user = request.user
    
    # Obtener streams activos
    streams = Streaming.objects.filter(is_live=True)

    # Verificar si el filtro de following está activado
    following_filter = request.GET.get('following') == 'true'  # Asegurarse de que sea booleano
    if following_filter:
        # Filtrar por los usuarios que sigue el usuario actual
        streams = streams.filter(host__in=current_user.following.all())
        no_following_streams = not streams.exists()
    else:
        no_following_streams = False

    # Búsqueda por nombre de usuario (insensible a mayúsculas)
    query = request.GET.get('query')
    user_data = []
    if query:
        # Filtrar usuarios insensible a mayúsculas
        user_results = CustomUser.objects.filter(username__icontains=query)
        
        # Crear lista de datos para cada usuario que coincida con la búsqueda
        for user in user_results:
            has_active_stream = user.streams.filter(is_live=True).exists()
            user_data.append({
                'user': user,
                'has_active_stream': has_active_stream,
                'active_stream': user.streams.filter(is_live=True).first() if has_active_stream else None
            })
        no_user_found = not user_data
    else:
        user_data = None
        no_user_found = False

    # Bandera para detectar cuando no hay streams activos
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
def manage_stream(request, stream_id):
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'start':
            stream.is_live = True  # Cambia el estado a "en vivo"
            stream.has_ended = False  # Asegura que no esté terminado
        elif action == 'end':
            stream.is_live = False  # Marca el streaming como no en vivo
            stream.has_ended = True  # Marca el streaming como finalizado

        stream.save()
        return redirect('stream_list')

    return render(request, 'streamings/manage_stream.html', {'stream': stream})


def streaming_view(request, stream_id):
    stream = get_object_or_404(Streaming, id=stream_id)

    # Permitir acceso al host o a cualquier usuario si el stream está en vivo
    if not stream.is_live and request.user != stream.host:
        raise Http404("No se ha encontrado un stream activo para esta solicitud.")

    return render(request, 'streamings/streaming_view.html', {'stream': stream})

@login_required
def end_stream(request, stream_id):
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)
    
    # Verifica si es un POST para finalizar el streaming
    if request.method == 'POST':
        stream.is_live = False
        stream.has_ended = True
        stream.recorded_date = timezone.now()
        stream.save()  # Guarda los cambios en la base de datos
        
        # Redirige a la lista de streams activos
        return redirect('stream_list')

    return redirect('streaming_view', stream_id=stream_id)

@login_required
def following_streams(request):
    following_users = request.user.following.all()
    streams = Streaming.objects.filter(is_live=True, host__in=following_users)
    return render(request, 'streamings/following_streams.html', {'streams': streams})

def save_video_file(request, stream_id):
    if request.method == "POST" and request.FILES.get('video'):
        streaming = Streaming.objects.get(id=stream_id)
        video_file = request.FILES['video'].read()  # Lee el archivo completo
        streaming.video_file = video_file
        streaming.has_ended = True
        streaming.save()
        print(f"Video file size saved in DB: {len(video_file)} bytes")
        return JsonResponse({"status": "success"}, status=200)
    return JsonResponse({"status": "error", "message": "No video file found"}, status=400)

@login_required
def view_recorded_stream(request, stream_id):
    # Obtén el stream desde la base de datos
    stream = get_object_or_404(Streaming, id=stream_id, has_ended=True)

    # Si el video existe, pasa el stream a la plantilla para reproducción
    if stream.video_file:
        return render(request, 'streamings/view_recorded_stream.html', {'stream': stream})
    else:
        return HttpResponse("This stream does not have a recorded video.")
    
@login_required

def get_stream_video(request, stream_id):
    try:
        stream = Streaming.objects.get(id=stream_id)
        video_content = stream.video_file
        response = HttpResponse(video_content, content_type='video/webm')
        response['Content-Disposition'] = f'inline; filename="stream_video_{stream_id}.webm"'
        return response
    except Streaming.DoesNotExist:
        raise Http404("Stream not found.")
