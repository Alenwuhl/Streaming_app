from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from .forms import StreamingForm
from .models import Streaming
from users.models import CustomUser
from django.http import Http404, JsonResponse, HttpResponse
from django.utils import timezone
import os
from django.conf import settings
import subprocess
from django.http import JsonResponse
from datetime import datetime, timedelta
import shutil
import subprocess
from pathlib import Path
from .tasks import process_video



@login_required
def start_stream(request):
    print("Accediendo a la vista 'start_stream'.")
    if request.method == "POST":
        form = StreamingForm(request.POST)
        if form.is_valid():
            stream = form.save(commit=False)
            stream.host = request.user
            stream.is_live = False
            stream.has_ended = False
            stream.save()
            print(
                f"Stream creado: ID={stream.id}, Título={stream.title}, Host={stream.host.username}"
            )

            stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream.id)
            stream_temp_dir.mkdir(parents=True, exist_ok=True)
            print(f"Directorio temporal creado: {stream_temp_dir}")

            return redirect("streaming_host_view", stream_id=stream.id)
        else:
            print("Formulario inválido en 'start_stream'.")
    else:
        form = StreamingForm()
    return render(request, "streamings/start_stream.html", {"form": form})


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
    print(
        f"No se pudo iniciar el stream ID={stream_id}. El stream ya está en vivo o ha terminado."
    )
    return JsonResponse({"status": "error", "message": "Unable to start the stream."})


@login_required
def stream_list(request):
    print("Accediendo a la vista 'stream_list'.")
    current_user = request.user
    # Filtrar streams que están en vivo y no han terminado
    streams = Streaming.objects.filter(is_live=True, has_ended=False)
    following_filter = request.GET.get("following") == "true"

    if following_filter:
        streams = streams.filter(host__in=current_user.following.all())
        no_following_streams = not streams.exists()
        print("Aplicando filtro de 'following'.")
    else:
        no_following_streams = False

    query = request.GET.get("query")
    user_data = []
    if query:
        user_results = CustomUser.objects.filter(username__icontains=query)
        for user in user_results:
            has_active_stream = user.streams.filter(
                is_live=True, has_ended=False
            ).exists()
            user_data.append(
                {
                    "user": user,
                    "has_active_stream": has_active_stream,
                    "active_stream": (
                        user.streams.filter(is_live=True, has_ended=False).first()
                        if has_active_stream
                        else None
                    ),
                }
            )
        no_user_found = not user_data
        print(f"Búsqueda realizada: query='{query}', resultados={len(user_results)}.")
    else:
        user_data = None
        no_user_found = False

    no_active_streams = not streams.exists()
    context = {
        "streams": streams,
        "user_data": user_data,
        "query": query,
        "following_filter": following_filter,
        "no_active_streams": no_active_streams,
        "no_following_streams": no_following_streams,
        "no_user_found": no_user_found,
    }
    return render(request, "streamings/stream_list.html", context)


@login_required
def streaming_host_view(request, stream_id):
    print(f"Accediendo a la vista 'streaming_host_view' para el stream ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id, host=request.user)
    context = {
        "stream": stream,
        "is_host": True,
        "username": request.user.username,
        "hostname": stream.host.username,
    }
    return render(request, "streamings/streaming_host_view.html", context)


def streaming_viewer_view(request, stream_id):
    print(
        f"Accediendo a la vista 'streaming_viewer_view' para el stream ID={stream_id}."
    )
    stream = get_object_or_404(Streaming, id=stream_id)
    if not stream.is_live:
        print(f"Stream ID={stream_id} no está activo.")
        raise Http404("El stream no está activo.")
    context = {
        "stream": stream,
        "is_host": False,
        "username": request.user.username,
        "hostname": stream.host.username,
    }
    return render(request, "streamings/streaming_viewer_view.html", context)


@login_required
def following_streams(request):
    print("Accediendo a la vista 'following_streams'.")
    following_users = request.user.following.all()
    streams = Streaming.objects.filter(is_live=True, host__in=following_users)
    return render(request, "streamings/following_streams.html", {"streams": streams})


def save_video_chunk(request, stream_id):
    print(f"Guardando archivo de video para el stream ID={stream_id}.")
    if request.method == "POST" and request.FILES.get("video_chunk"):
        streaming = get_object_or_404(Streaming, id=stream_id)

        # Crear directorio temporal para el stream si no existe
        stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
        stream_temp_dir.mkdir(parents=True, exist_ok=True)

        # Guardar el chunk en un archivo
        chunk_index = request.POST.get("chunk_index")
        chunk_file_path = stream_temp_dir / f"chunk_{chunk_index}.webm"
        with open(chunk_file_path, "wb") as chunk_file:
            for chunk in request.FILES["video_chunk"].chunks():
                chunk_file.write(chunk)

        print(f"Chunk guardado: {chunk_file_path}")
        return JsonResponse({"status": "success"}, status=200)
    print("No se encontró archivo de video en la solicitud.")
    return JsonResponse(
        {"status": "error", "message": "No video chunk found"}, status=400
    )


@login_required
def view_recorded_stream(request, stream_id):
    print(f"[INFO] Verificando stream grabado con ID={stream_id}.")
    stream = get_object_or_404(Streaming, id=stream_id)

    if not stream.video_file:
        return render(request, "streamings/waiting.html", {"stream_id": stream_id})

    recorded_file = Path(settings.MEDIA_ROOT) / str(stream.video_file)

    if not recorded_file.exists():
        print(f"[ERROR] El archivo grabado no existe: {recorded_file}")
        return render(request, "streamings/waiting.html", {"stream_id": stream_id})

    return render(request, "streamings/view_recorded_stream.html", {"stream": stream})



@login_required
def get_stream_video(request, stream_id):
    print(f"Obteniendo archivo de video para el stream ID={stream_id}.")
    try:
        stream = Streaming.objects.get(id=stream_id)
        video_content = stream.video_file
        response = HttpResponse(video_content, content_type="video/webm")
        response["Content-Disposition"] = (
            f'inline; filename="stream_video_{stream_id}.webm"'
        )
        return response
    except Streaming.DoesNotExist:
        print(f"Stream ID={stream_id} no encontrado.")
        raise Http404("Stream not found.")


@login_required
def upload_chunk(request, stream_id):
    """
    Guarda un fragmento de video recibido.
    """
    if request.method == "POST" and request.FILES.get("video_chunk"):
        stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
        stream_temp_dir.mkdir(parents=True, exist_ok=True)

        chunk_index = request.POST.get("chunk_index", "0")
        chunk_path = stream_temp_dir / f"chunk_{chunk_index}.webm"

        with open(chunk_path, "wb") as f:
            for chunk in request.FILES["video_chunk"].chunks():
                f.write(chunk)

        return JsonResponse({"status": "success", "message": f"Chunk {chunk_index} uploaded."})
    return JsonResponse({"status": "error", "message": "Invalid request."}, status=400)

@login_required
@require_POST
def finalize_stream(request, stream_id):
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)

    if not stream_temp_dir.exists():
        return JsonResponse({"status": "error", "message": "Stream temp directory not found"}, status=400)

    # Finalizar el stream en la base de datos
    stream = Streaming.objects.get(id=stream_id)
    stream.is_live = False
    stream.has_ended = True
    stream.save()
    
    print("####### EL STREAM SE HA FINALIZADO #######")

    # Lanzar la tarea en segundo plano
    print(f"[DEBUG] Invocando process_video con stream_id={stream_id}")
    process_video.delay(stream_id)

    return JsonResponse({"status": "success", "message": "Stream finalized and video is being processed."})


def clean_temp_files():
    temp_dir = settings.MEDIA_TEMP_STREAMS
    expiration_date = datetime.now() - timedelta(days=2)

    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            if datetime.fromtimestamp(os.path.getctime(file_path)) < expiration_date:
                os.remove(file_path)
        for dir in dirs:
            dir_path = os.path.join(root, dir)
            if not os.listdir(dir_path):  # Eliminar directorios vacíos
                shutil.rmtree(dir_path)


def save_video_file(request, stream_id):
    print(f"Guardando archivo de video para el stream ID={stream_id}.")
    if request.method == "POST" and request.FILES.get("video"):
        streaming = get_object_or_404(Streaming, id=stream_id)
        video_file = request.FILES["video"].read()
        streaming.video_file = video_file
        streaming.has_ended = True
        streaming.save()
        print(f"Archivo de video guardado para el stream ID={stream_id}.")
        return JsonResponse({"status": "success"}, status=200)
    print("No se encontró archivo de video en la solicitud.")
    return JsonResponse(
        {"status": "error", "message": "No video file found"}, status=400
    )


@login_required
@require_POST
def save_video(request, stream_id):

    print("Archivos recibidos:", request.FILES)
    print("POST recibido:", request.POST)

    # Lógica proporcionada para guardar los chunks
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
    if not stream_temp_dir.exists():
        return JsonResponse(
            {"status": "error", "message": "Stream temp directory not found"},
            status=400,
        )

    video_chunk = request.FILES.get("video_chunk")
    if not video_chunk:
        return JsonResponse(
            {"status": "error", "message": "No video file provided"}, status=400
        )

    chunk_index = request.POST.get("chunk_index", "0")
    chunk_path = stream_temp_dir / f"chunk_{chunk_index}.webm"
    with open(chunk_path, "wb") as chunk_file:
        for chunk in video_chunk.chunks():
            chunk_file.write(chunk)

    return JsonResponse(
        {"status": "success", "message": "Video chunk saved successfully"}
    )

def check_video_status(request, stream_id):
    recorded_file = Path(settings.MEDIA_ROOT) / "recorded_streams" / f"{stream_id}.webm"
    if recorded_file.exists():
        return JsonResponse({"status": "available"})
    return JsonResponse({"status": "processing"})
