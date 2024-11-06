let mediaRecorder;
let recordedChunks = [];

// Verifica si el botón de inicio de streaming existe y configura el evento
const startButton = document.getElementById('startStreamingButton');
if (startButton) {
    startButton.addEventListener('click', () => {
        console.log("Starting streaming...");
        // Inicia la grabación al comenzar el streaming
        startRecording(localStream); // localStream es el stream de video del host
    });
}

// Función para iniciar la grabación
function startRecording(stream) {
    recordedChunks = [];
    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        mediaRecorder.start();
        console.log("Recording started...");
    } catch (e) {
        console.error("MediaRecorder initialization failed:", e);
    }
}
