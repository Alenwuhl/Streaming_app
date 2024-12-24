let mediaRecorder;
let isRecording = false;
let recordedChunks = [];

// Función centralizada para obtener el token CSRF
import { getCSRFToken } from "./utils.js";

/**
 * Inicia la grabación de un stream.
 * @param {MediaStream} stream - Objeto de MediaStream válido.
 * @param {string} streamId - ID único del stream.
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

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log("[INFO] Chunk recorded:", event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("[INFO] Grabación finalizada.");
      if (recordedChunks.length > 0) {
        console.log("[INFO] Subiendo los fragmentos grabados...");
        await uploadAllChunks(streamId);
      } else {
        console.warn("[WARNING] No hay fragmentos grabados para subir.");
      }
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
 * Sube todos los fragmentos grabados al servidor.
 * @param {string} streamId - ID del stream al que pertenecen los fragmentos.
 */
async function uploadAllChunks(streamId) {
  for (let i = 0; i < recordedChunks.length; i++) {
    const chunk = recordedChunks[i];
    await uploadVideoChunk(chunk, streamId, i);
  }
  recordedChunks = []; // Limpiar los fragmentos grabados después de subirlos
  console.log("[INFO] Todos los fragmentos se subieron exitosamente.");
}

/**
 * Sube un fragmento de video al servidor.
 * @param {Blob} videoBlob - Fragmento de video en formato Blob.
 * @param {string} streamId - ID del stream al que pertenece el fragmento.
 * @param {number} chunkIndex - Índice del fragmento actual.
 */
async function uploadVideoChunk(videoBlob, streamId, chunkIndex) {
  const formData = new FormData();
  formData.append("video_chunk", videoBlob);
  formData.append("chunk_index", chunkIndex);

  console.log(`[DEBUG] Subiendo fragmento ${chunkIndex} al servidor...`);
  try {
    const response = await fetch(`/streamings/save_video/${streamId}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCSRFToken(),
      },
      body: formData,
    });

    if (response.ok) {
      console.log(`[INFO] Fragmento ${chunkIndex} subido exitosamente.`);
    } else {
      console.error(
        `[ERROR] Fallo al subir el fragmento ${chunkIndex}:`,
        response.status
      );
    }
  } catch (error) {
    console.error(
      `[ERROR] Error al subir el fragmento ${chunkIndex}:`,
      error
    );
  }
}
