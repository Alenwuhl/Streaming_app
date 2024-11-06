let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let localStream;

// Función para obtener el token CSRF
function getCSRFToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken'))
        ?.split('=')[1];
}

// Inicializa la captura de video
async function initializeLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log("Local stream initialized:", localStream);
        document.getElementById('localVideo').srcObject = localStream;  // Muestra el stream en el video local
    } catch (error) {
        console.error("Error initializing local stream:", error);
    }
}

// Verifica si localStream está inicializado y es un MediaStream antes de grabar
function startRecording(stream) {
    if (!(stream instanceof MediaStream)) {
        console.error("startRecording error: stream is not a MediaStream.");
        return;
    }
    
    recordedChunks = [];
    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
            console.log("Data chunk recorded:", event.data.size);
        };
        mediaRecorder.start();
        console.log("Recording started...");
    } catch (error) {
        console.error("Failed to initialize MediaRecorder:", error);
    }
}

// Llama a initializeLocalStream al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    initializeLocalStream().then(() => {
        console.log("Local stream ready for recording:", localStream);
    });
});

// Inicia el streaming en el servidor y actualiza el botón de grabación
async function startStream(streamId) {
    if (!streamId) {
        console.error("Stream ID is missing.");
        return;
    }
    try {
        const response = await fetch(`/streamings/stream/start_live/${streamId}/`, { 
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            },
        });
        
        const data = await response.json();
        
        if (data.status === "success") {
            console.log("Stream is now live.");
            toggleRecordingButton();
            startRecording(localStream);
        } else {
            console.error("Error starting stream:", data.message);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Alterna el botón de grabación entre iniciar y finalizar
function toggleRecordingButton() {
    const startEndButton = document.getElementById('startEndStreamingButton');
    if (startEndButton.classList.contains('btn-success')) {
        startEndButton.classList.replace('btn-success', 'btn-danger');
        startEndButton.textContent = "End Streaming";
    } else {
        startEndButton.classList.replace('btn-danger', 'btn-success');
        startEndButton.textContent = "Start Streaming";
    }
}

// Alterna el estado de grabación al hacer clic en el botón
document.getElementById('startEndStreamingButton').addEventListener('click', async () => {
    const button = document.getElementById('startEndStreamingButton');
    const streamId = button.getAttribute('data-stream-id');

    if (!streamId) {
        console.error("Stream ID is missing.");
        return;
    }

    if (!isRecording) {
        // Inicia el streaming y la grabación
        await startStream(streamId);
    } else {
        // Finaliza el streaming y la grabación
        await stopRecordingAndSave(streamId);
    }
    isRecording = !isRecording;
});

// Detiene la grabación y envía el archivo de video al servidor
async function stopRecordingAndSave(streamId) {
    console.log("Enter to stopRecordingAndSave");
    if (!mediaRecorder) {
        console.warn("MediaRecorder not initialized. Cannot stop recording.");
        return;
    }
    
    mediaRecorder.stop();

    mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        console.log("Recorded video blob size:", videoBlob.size);

        await uploadVideoToServer(videoBlob, streamId);

        // Actualiza el estado del stream en el servidor para finalizar
        await endStreamOnServer(streamId);
    };
}

// Función para enviar el archivo de video al servidor
async function uploadVideoToServer(videoBlob, streamId) {
    const formData = new FormData();
    formData.append('video', videoBlob);

    try {
        console.log("Uploading video to server...");
        const response = await fetch(`/streamings/save_video/${streamId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),  // Incluye el token CSRF aquí
            },
            body: formData,
        });

        if (response.ok) {
            console.log("Video uploaded successfully.");
        } else {
            console.error("Error uploading video:", response.statusText);
        }
    } catch (error) {
        console.error("Upload error:", error);
    }
}


// Actualiza el estado del stream en el servidor para finalizarlo
async function endStreamOnServer(streamId) {
    try {
        const response = await fetch(`/streamings/stream/end/${streamId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
            },
        });

        if (response.ok) {
            console.log("Stream ended successfully on server.");
            window.location.href = '/streamings/';
        } else {
            console.error("Failed to end stream on server:", response.statusText);
        }
    } catch (error) {
        console.error("Error ending stream on server:", error);
    }
}
