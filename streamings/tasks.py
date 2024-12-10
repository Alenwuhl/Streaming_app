from celery import shared_task
from pathlib import Path
from django.conf import settings
import subprocess


@shared_task
def process_video(stream_id):
    print(f"[INFO] Procesando el video para el stream ID={stream_id}.")
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
    recorded_dir = Path(settings.MEDIA_ROOT) / "recorded_streams"
    recorded_dir.mkdir(parents=True, exist_ok=True)

    file_list_path = stream_temp_dir / "file_list.txt"

    # Verificar la existencia del directorio y fragmentos
    if not stream_temp_dir.exists():
        print(f"[ERROR] Directorio {stream_temp_dir} no existe.")
        return
    chunks = sorted(stream_temp_dir.glob("chunk_*.webm"))
    if not chunks:
        print(f"[ERROR] No hay fragmentos en {stream_temp_dir}.")
        return

    # Crear file_list.txt
    try:
        with open(file_list_path, "w") as file_list:
            for chunk_file in chunks:
                file_list.write(f"file '{chunk_file.name}'\n")
        print(f"[INFO] Archivo file_list.txt generado: {file_list_path}")
    except Exception as e:
        print(f"[ERROR] No se pudo generar file_list.txt: {e}")
        return

    # Usar FFmpeg para combinar fragmentos
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
            cwd=stream_temp_dir,  # Contexto: directorio temporal del stream
            check=True,
        )
        print(f"[INFO] Video procesado correctamente: {output_file}")

        # Limpiar fragmentos temporales
        for chunk_file in chunks:
            chunk_file.unlink()
        file_list_path.unlink()
        stream_temp_dir.rmdir()
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error ejecutando FFmpeg: {e}")
    except Exception as e:
        print(f"[ERROR] Error inesperado al procesar el video: {e}")
