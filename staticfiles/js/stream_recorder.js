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
  console.log("[DEBUG] Attempting to initialize local stream...");
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log("[INFO] Local stream initialized successfully:", localStream);
    document.getElementById("localVideo").srcObject = localStream;
  } catch (error) {
    console.error("[ERROR] Failed to initialize local stream:", error);
    alert("Could not access camera and microphone. Please check permissions.");
  }
}

// Verifica si localStream está inicializado y es un MediaStream antes de grabar
function startRecording(stream) {
  console.log("[DEBUG] Checking if stream is valid...");
  if (!(stream instanceof MediaStream)) {
    console.error("[ERROR] startRecording: Invalid stream object:", stream);
    return;
  }

  console.log("[INFO] Starting MediaRecorder...");
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });

    mediaRecorder.ondataavailable = async (event) => {
      console.log("[DEBUG] Chunk available. Size:", event.data.size);
      if (event.data.size > 0) {
        const formData = new FormData();
        formData.append("video_chunk", event.data);
        formData.append("chunk_index", recordedChunks.length.toString());
        recordedChunks.push(event.data);

        try {
          const response = await fetch(
            `/streamings/upload_chunk/${streamId}/`,
            {
              method: "POST",
              headers: {
                "X-CSRFToken": getCSRFToken(),
              },
              body: formData,
            }
          );
          if (response.ok) {
            console.log("[INFO] Video chunk uploaded successfully.");
          } else {
            console.error(
              "[ERROR] Failed to upload chunk:",
              response.statusText
            );
          }
        } catch (error) {
          console.error("[ERROR] Network error while uploading chunk:", error);
        }
      }
    };

    mediaRecorder.start();
    console.log("[INFO] Recording started successfully.");
    isRecording = true;
    updateRecordingButton();
  } catch (error) {
    console.error("[ERROR] MediaRecorder initialization failed:", error);
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
  console.log("[INFO] Stopping recording...");
  if (!mediaRecorder || !isRecording) {
    console.warn("[WARNING] MediaRecorder is not recording.");
    return;
  }

  mediaRecorder.stop();
  console.log("[INFO] MediaRecorder stopped.");

  try {
    console.log("[INFO] Notifying server to finalize stream...");
    const response = await fetch(`/streamings/finalize_stream/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
    });

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] Stream finalized successfully.");
      alert("The stream has ended. Processing the recording in the background.");
      window.location.href = "/streamings/";
    } else {
      console.error("[ERROR] Server failed to finalize stream:", data.message);
    }
  } catch (error) {
    console.error("[ERROR] Error finalizing stream on server:", error);
  }
}

// Función para enviar el archivo de video al servidor

async function uploadVideoToServer(videoBlob, streamId) {
  console.log("[DEBUG] Preparing to upload video blob...");
  console.log("[DEBUG] Blob size:", videoBlob.size);

  const formData = new FormData();
  formData.append("video_chunk", videoBlob);
  formData.append("chunk_index", 0);

  try {
    console.log("[INFO] Sending chunk to server...");
    const response = await fetch(`/streamings/save_video/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
      body: formData,
    });

    if (response.ok) {
      console.log("[INFO] Video chunk uploaded successfully.");
    } else {
      console.error("[ERROR] Server responded with status:", response.status);
    }
  } catch (error) {
    console.error("[ERROR] Failed to upload video chunk:", error);
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

async function checkVideoAvailability(streamId) {
  try {
    const response = await fetch(`/streamings/check_video/${streamId}/`, {
      method: "GET",
    });

    const data = await response.json();
    if (data.status === "available") {
      console.log("[INFO] Video is ready for playback.");
      window.location.href = `/streamings/view_recorded_stream/${streamId}/`;
    } else {
      console.log("[INFO] Video is still processing.");
      alert("The recording is still being processed. Please check back later.");
    }
  } catch (error) {
    console.error("[ERROR] Failed to check video availability:", error);
  }
}
//version 5
