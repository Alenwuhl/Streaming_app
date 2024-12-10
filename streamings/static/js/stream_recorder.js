let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Función centralizada para obtener el token CSRF
import { getCSRFToken } from "./utils.js";

/**
 * Inicia la grabación de un stream.
 * @param {MediaStream} stream - Objeto de MediaStream válido.
 */
export function startRecording(stream, streamId) {
  console.log("[DEBUG] Verificando si el stream es válido...");
  if (!(stream instanceof MediaStream)) {
    console.error("[ERROR] startRecording: Objeto stream inválido:", stream);
    return;
  }

  console.log("[INFO] Inicializando MediaRecorder...");
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });
    
    let chunkIndex = 0;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        console.log("[DEBUG] Fragmento de video listo para subir.");
        await uploadVideoChunk(event.data, streamId, chunkIndex);
        chunkIndex++;
      }
    };

    mediaRecorder.onstop = () => {
      console.log("[INFO] Grabación finalizada.");
    };

    mediaRecorder.start();
    isRecording = true;
    console.log("[INFO] Grabación iniciada correctamente.");
  } catch (error) {
    console.error("[ERROR] Fallo al inicializar MediaRecorder:", error);
  }
}

/**
 * Detiene la grabación de video y notifica al servidor.
 * @param {string} streamId - ID del stream que se está grabando.
 */
export async function stopRecordingAndSave(streamId) {
  if (!isRecording || !mediaRecorder) {
    console.warn("[WARNING] No hay grabación activa para detener.");
    return;
  }

  console.log("[INFO] Deteniendo MediaRecorder...");
  mediaRecorder.stop();
  isRecording = false;

  // Finalizar el stream en el servidor
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`/streamings/stream/end/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] El stream finalizó exitosamente en el servidor.");
      console.log("[INFO] Redirigiendo a la página principal...");
      window.location.href = "/"; 
    } else {
      console.error(
        "[ERROR] Fallo al finalizar el stream en el servidor:",
        data.message
      );
    }
  } catch (error) {
    console.error(
      "[ERROR] Error al finalizar el stream en el servidor:",
      error
    );
  }
}

/**
 * Sube un fragmento de video al servidor.
 * @param {Blob} videoBlob - Fragmento de video en formato Blob.
 * @param {string} streamId - ID del stream al que pertenece el fragmento.
 */
async function uploadVideoChunk(videoBlob, streamId) {
  const formData = new FormData();
  formData.append("video_chunk", videoBlob);

  console.log("[DEBUG] FormData enviado:");
  formData.forEach((value, key) => {
    console.log(`${key}:`, value);
  });

  try {
    const response = await fetch(`/streamings/save_video/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
      body: formData,
    });

    if (response.ok) {
      console.log("[INFO] Fragmento de video subido exitosamente.");
    } else {
      console.error(
        "[ERROR] Fallo al subir el fragmento de video:",
        response.status
      );
    }
  } catch (error) {
    console.error("[ERROR] Error al subir el fragmento de video:", error);
  }
}
