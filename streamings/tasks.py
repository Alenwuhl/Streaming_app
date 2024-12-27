from celery import shared_task
from pathlib import Path
from django.conf import settings
import subprocess
from streamings.models import Streaming
from django.utils import timezone

@shared_task
def process_video(stream_id):
    print(f"[INFO] Procesando el video para el stream ID={stream_id}.")
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
    recorded_dir = Path(settings.MEDIA_ROOT) / "recorded_streams"
    recorded_dir.mkdir(parents=True, exist_ok=True)

    file_list_path = stream_temp_dir / "file_list.txt"

    # Check for directory and fragment existence
    if not stream_temp_dir.exists():
        print(f"[ERROR] Directorio {stream_temp_dir} no existe.")
        return
    chunks = sorted(stream_temp_dir.glob("chunk_*.webm"))
    if not chunks:
        print(f"[ERROR] No hay fragmentos en {stream_temp_dir}.")
        return

    # Create file_list.txt
    try:
        with open(file_list_path, "w") as file_list:
            for chunk_file in chunks:
                file_list.write(f"file '{chunk_file.name}'\n")
        print(f"[INFO] Archivo file_list.txt generado: {file_list_path}")
    except Exception as e:
        print(f"[ERROR] No se pudo generar file_list.txt: {e}")
        return

    # Use FFmpeg to combine fragments
    output_file = recorded_dir / f"{stream_id}.webm"
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                "file_list.txt",
                "-c",
                "copy",
                str(output_file),
            ],
            cwd=stream_temp_dir,
            check=True,
        )
        print(f"[INFO] Video procesado correctamente: {output_file}")

        # Update video_file field in Streaming model
        try:
            streaming = Streaming.objects.get(id=stream_id)
            streaming.video_file = f"recorded_streams/{stream_id}.webm"
            streaming.recorded_date = timezone.now() 
            streaming.save()
            print(f"[INFO] Campo video_file actualizado para stream ID={stream_id}.")
        except Streaming.DoesNotExist:
            print(f"[ERROR] Streaming con ID={stream_id} no encontrado.")

        # Clear temporary fragments
        for chunk_file in chunks:
            chunk_file.unlink()
        file_list_path.unlink()
        stream_temp_dir.rmdir()
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error ejecutando FFmpeg: {e}")
    except Exception as e:
        print(f"[ERROR] Error inesperado al procesar el video: {e}")
