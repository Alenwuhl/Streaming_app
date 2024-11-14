let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let localStream;

// Función para obtener el token CSRF
function getCSRFToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken"))
    ?.split("=")[1];
}

// Inicializa la captura de video
async function initializeLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log("[INFO] Local stream initialized:", localStream);
    document.getElementById("localVideo").srcObject = localStream;
  } catch (error) {
    console.error("[ERROR] Error initializing local stream:", error);
    alert("Could not access camera and microphone. Please check permissions.");
  }
}

// Verifica si localStream está inicializado y es un MediaStream antes de grabar
function startRecording(stream) {
  if (!(stream instanceof MediaStream)) {
    console.error("[ERROR] startRecording: stream is not a MediaStream.");
    return;
  }

  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
      console.log("[INFO] Data chunk recorded:", event.data.size);
    };

    mediaRecorder.onstop = async () => {
      const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
      console.log("[INFO] Blob size onstop:", videoBlob.size);
      await uploadVideoToServer(videoBlob, streamId);

      // Finalizar stream en el servidor
      await endStreamOnServer(streamId);
    };

    mediaRecorder.start();
    console.log("[INFO] Recording started...");
    isRecording = true;
    updateRecordingButton();
  } catch (error) {
    console.error("[ERROR] Failed to initialize MediaRecorder:", error);
  }
}

// Llama a initializeLocalStream al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  initializeLocalStream().then(() => {
    console.log("[INFO] Local stream ready for recording:", localStream);
  });
});

// Inicia el streaming en el servidor y actualiza el botón de grabación
async function startStream(streamId) {
  if (!streamId) {
    console.error("[ERROR] Stream ID is missing.");
    return;
  }

  try {
    const response = await fetch(`/streamings/stream/start_live/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] Stream is now live.");
      startRecording(localStream);
    } else {
      console.error("[ERROR] Failed to start stream:", data.message);
    }
  } catch (error) {
    console.error("[ERROR] Error starting stream:", error);
  }
}

// Alterna el estado del botón de grabación
function updateRecordingButton() {
  const startEndButton = document.getElementById("startEndStreamingButton");
  if (isRecording) {
    startEndButton.classList.replace("btn-success", "btn-danger");
    startEndButton.innerHTML = '<i class="fas fa-video"></i> End Streaming';
  } else {
    startEndButton.classList.replace("btn-danger", "btn-success");
    startEndButton.innerHTML = '<i class="fas fa-video"></i> Start Streaming';
  }
}

// Alterna el estado de grabación al hacer clic en el botón
// Alterna el estado de grabación al hacer clic en el botón
document
  .getElementById("startEndStreamingButton")
  .addEventListener("click", async () => {
    const button = document.getElementById("startEndStreamingButton");
    const streamId = button.getAttribute("data-stream-id");

    if (!streamId) {
      console.error("Stream ID is missing.");
      return;
    }

    // Bloquear el botón para evitar clics múltiples
    button.disabled = true;

    if (!isRecording) {
      console.log("[INFO] Attempting to start stream...");
      const result = await startStream(streamId);
      if (result) {
        isRecording = true;
        updateRecordingButton();
      }
    } else {
      console.log("[INFO] Attempting to stop stream...");
      await stopRecordingAndSave(streamId);
      isRecording = false;
      updateRecordingButton();
    }

    // Desbloquear el botón
    button.disabled = false;
  });

// Detiene la grabación y envía el archivo de video al servidor
async function stopRecordingAndSave(streamId) {
  console.log("[INFO] Enter to stopRecordingAndSave");
  if (!mediaRecorder || !isRecording) {
    console.warn("[WARNING] MediaRecorder not initialized or not recording.");
    return;
  }

  mediaRecorder.stop();
  isRecording = false;
  updateRecordingButton();
}

// Función para enviar el archivo de video al servidor
async function uploadVideoToServer(videoBlob, streamId) {
  const formData = new FormData();
  formData.append("video", videoBlob);

  try {
    console.log("[INFO] Uploading video to server...");
    const response = await fetch(`/streamings/save_video/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
      body: formData,
    });

    if (response.ok) {
      console.log("[INFO] Video uploaded successfully.");
    } else {
      console.error("[ERROR] Error uploading video:", response.statusText);
    }
  } catch (error) {
    console.error("[ERROR] Upload error:", error);
  }
}

// Finaliza el stream en el servidor
async function endStreamOnServer(streamId) {
  try {
    const response = await fetch(`/streamings/stream/end/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(
        "[ERROR] Server response is not JSON. Possible HTML error page."
      );
      alert(
        "An unexpected error occurred while ending the stream. Redirecting to the main page."
      );
      window.location.href = "/streamings/";
      return;
    }

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] Stream ended successfully on server.");
      window.location.href = "/streamings/";
    } else {
      console.error("[ERROR] Failed to end stream on server:", data.message);
      alert("Failed to end the stream on the server.");
    }
  } catch (error) {
    console.error("[ERROR] Error ending stream on server:", error);
    alert(
      "An error occurred while ending the stream. Redirecting to the main page."
    );
    window.location.href = "/streamings/";
  }
}

//version4
