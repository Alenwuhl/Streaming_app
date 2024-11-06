// Verifica si el botón de fin de streaming existe y configura el evento
const streamId = document.querySelector('.container-fluid').getAttribute('data-stream-id');
const endButton = document.getElementById('endStreamingButton');
if (endButton) {
    endButton.addEventListener('click', () => {
        console.log("Ending streaming...");
        stopRecordingAndSave(streamId); // streamId es el ID del streaming actual
    });
}

// Llamada para detener la grabación y guardar el video
function stopRecordingAndSave(streamId) {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.onstop = async () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            await uploadVideoToServer(videoBlob, streamId);
        };
    }
}

// Función para enviar el archivo de video al servidor
async function uploadVideoToServer(videoBlob, streamId) {
    const formData = new FormData();
    formData.append('video', videoBlob);

    try {
        const response = await fetch(`/save_video/${streamId}/`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            console.log("Video uploaded successfully.");
        } else {
            console.error("Error uploading video:", response.statusText);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
