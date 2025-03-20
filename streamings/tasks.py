import shutil
import time
from celery import shared_task
from pathlib import Path
from django.conf import settings
import subprocess
from streamings.models import Streaming
from django.utils import timezone

@shared_task
def process_video(stream_id):
    print(f"[INFO] Processing video for stream ID={stream_id}.")
    stream_temp_dir = Path(settings.MEDIA_TEMP_STREAMS) / str(stream_id)
    recorded_dir = Path(settings.MEDIA_ROOT) / "recorded_streams"
    recorded_dir.mkdir(parents=True, exist_ok=True)

    # Verify that the directory exists
    if not stream_temp_dir.exists():
        print(f"[ERROR] Directory {stream_temp_dir} does not exist.")
        return

    # Wait until at least one fragment is found (max wait time: 5 seconds)
    max_wait_time = 5  # Maximum time to wait for files
    wait_time = 0.5  # Interval to check for files
    total_waited = 0

    while total_waited < max_wait_time:
        chunks = sorted(stream_temp_dir.glob("chunk_*.webm"))
        
        if chunks:
            break  # Exit loop if files are found

        print(f"[INFO] Waiting for video fragments... ({total_waited}s elapsed)")
        time.sleep(wait_time)
        total_waited += wait_time

    # Final check if no files were found after waiting
    chunks = sorted(stream_temp_dir.glob("chunk_*.webm"))
    if not chunks:
        print(f"[ERROR] No video fragments found in {stream_temp_dir} after waiting {max_wait_time}s.")
        return

    print(f"[INFO] Found {len(chunks)} fragments for stream {stream_id}.")

    # Repair WebM files before processing
    fixed_chunks = []
    for chunk in chunks:
        fixed_chunk = chunk.parent / f"fixed_{chunk.name}"
        print(f"[DEBUG] Repairing fragment: {chunk}")

        result = subprocess.run(
            [
                "ffmpeg",
                "-i", str(chunk),
                "-c:v", "libvpx-vp9",  # Transcode video
                "-b:v", "1M",  # Adjust bitrate
                "-c:a", "libopus",
                "-y", str(fixed_chunk)
            ],
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"[ERROR] FFmpeg failed to process {chunk}: {result.stderr}")
            return
        
        fixed_chunks.append(fixed_chunk)

    print(f"[INFO] All fragments successfully repaired.")

    # Create file_list.txt
    file_list_path = stream_temp_dir / "file_list.txt"
    print(f"[INFO] Generating file_list.txt: {file_list_path}")
    try:
        with open(file_list_path, "w") as file_list:
            for chunk_file in fixed_chunks:
                if not chunk_file.exists():
                    print(f"[ERROR] Fragment not found: {chunk_file}")
                    return
                file_list.write(f"file '{chunk_file.resolve()}'\n")  # Use absolute path
        print(f"[INFO] file_list.txt successfully generated at: {file_list_path}")
    except Exception as e:
        print(f"[ERROR] Failed to generate file_list.txt: {e}")
        return

    # Merge fragments using FFmpeg
    output_file = recorded_dir / f"{stream_id}.webm"
    try:
        print(f"[INFO] Processing final video with FFmpeg...")
        result = subprocess.run(
            [
                "ffmpeg",
                "-f", "concat",
                "-safe", "0",
                "-i", str(file_list_path),
                "-c", "copy",
                str(output_file),
            ],
            cwd=stream_temp_dir,
            capture_output=True, text=True, check=True
        )
        print(f"[INFO] FFmpeg output: {result.stdout}")
        print(f"[INFO] Video successfully processed: {output_file}")

        # Update database
        try:
            streaming = Streaming.objects.get(id=stream_id)
            streaming.video_file = f"recorded_streams/{stream_id}.webm"
            streaming.recorded_date = timezone.now() 
            streaming.save()
            print(f"[INFO] Updated video_file field for stream ID={stream_id}.")
        except Streaming.DoesNotExist:
            print(f"[ERROR] Streaming with ID={stream_id} not found.")

        # If only one fragment exists, copy it directly instead of merging
        if len(fixed_chunks) == 1:
            print(f"[INFO] Only one fragment found, copying it to {output_file}")
            shutil.copy(fixed_chunks[0], output_file)

        # Verify that the final file exists before deleting temporary files
        if output_file.exists():
            print(f"[INFO] Final video saved successfully at {output_file}")

            # Delete all temporary files in the directory
            for file in stream_temp_dir.iterdir():
                try:
                    print(f"[INFO] Deleting file: {file}")
                    file.unlink()
                except Exception as e:
                    print(f"[ERROR] Could not delete {file}: {e}")

            # Attempt to remove the temp directory if it's empty
            try:
                stream_temp_dir.rmdir()
                print(f"[INFO] Directory {stream_temp_dir} successfully deleted.")
            except OSError:
                print(f"[WARNING] Could not delete {stream_temp_dir}, forcing deletion.")
                shutil.rmtree(stream_temp_dir, ignore_errors=True)  # Force delete

        else:
            print(f"[ERROR] Final video file was not saved at {output_file}")

    except subprocess.CalledProcessError as e:
        print(f"[ERROR] FFmpeg execution failed: {e.stderr}")
