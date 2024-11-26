from celery import shared_task
from pathlib import Path
from django.conf import settings
import subprocess

@shared_task
def process_video(stream_id):
    """
    Tarea de Celery para procesar chunks de video y generar un archivo final.
    """
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
    output_file = Path(settings.MEDIA_ROOT) / "recorded_streams" / f"{stream_id}.webm"

    if not stream_temp_dir.exists() or not any(stream_temp_dir.iterdir()):
        return {"status": "error", "message": "No chunks found"}

    # Crear el archivo file_list.txt
    file_list_path = stream_temp_dir / "file_list.txt"
    with open(file_list_path, "w") as file_list:
        for chunk_file in sorted(stream_temp_dir.glob("chunk_*.webm")):
            file_list.write(f"file '{chunk_file}'\n")

    # Usar ffmpeg para combinar los chunks
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(file_list_path),
                "-c",
                "copy",
                str(output_file),
            ],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"FFmpeg failed: {str(e)}"}

    # Limpia los archivos temporales
    for file in stream_temp_dir.iterdir():
        file.unlink()
    stream_temp_dir.rmdir()

    return {"status": "success", "message": "Video processed successfully"}
