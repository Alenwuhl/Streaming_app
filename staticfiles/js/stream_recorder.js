let mediaRecorder;
let isRecording = false;
let recordedChunks = [];

// Centralized function to obtain CSRF token
import { getCSRFToken } from "./utils.js";

/**
* Starts recording a stream.
* @param {MediaStream} stream - A valid MediaStream object.
* @param {string} streamID - A unique ID for the stream.
* @param {Blob} videoBlob - A video chunk in blob format.
* @param {number} chunkIndex - Index of the current chunk.
*/
// Function to start recording a stream
export function startRecording(stream, streamID) {
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
        await uploadAllChunks(streamID);
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

// Function to stop the recording and the stream
export async function stopRecordingAndSave(streamID) {
  if (!isRecording || !mediaRecorder) {
    console.warn("[WARNING] No hay grabación activa para detener.");
    return;
  }

  console.log("[INFO] Deteniendo MediaRecorder...");
  mediaRecorder.stop();
  isRecording = false;

  console.log("[INFO] Subiendo fragmentos grabados...");
  await uploadAllChunks(streamID);

  console.log(
    "[INFO] Notificando al servidor sobre la finalización del stream..."
  );
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`/streamings/stream/end/${streamID}/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/json",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[ERROR] Server response is not JSON.");
      alert("Failed to end the stream. Please try again.");
      return;
    }

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] El stream finalizó exitosamente en el servidor.");
      alert("Stream has been finalized successfully.");
      window.location.href = "/";
    } else {
      console.error("[ERROR] Failed to end stream on server:", data.message);
    }
  } catch (error) {
    console.error("[ERROR] Error ending stream on server:", error);
  }
}

/**
* Upload all recorded fragments to the server.
* @param {string} streamID - ID of the stream to which the fragments belong.
*/
async function uploadAllChunks(streamID) {
  for (let i = 0; i < recordedChunks.length; i++) {
    const chunk = recordedChunks[i];
    await uploadVideoChunk(chunk, streamID, i);
  }
  recordedChunks = []; // Clean up recorded fragments after uploading
  console.log("[INFO] Todos los fragmentos se subieron exitosamente.");
}

// Helper function to upload a single video chunk
async function uploadVideoChunk(videoBlob, streamID, chunkIndex) {
  const formData = new FormData();
  formData.append("video_chunk", videoBlob);
  formData.append("chunk_index", chunkIndex);

  try {
    const response = await fetch(`/streamings/save_video/${streamID}/`, {
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
    console.error(`[ERROR] Error al subir el fragmento ${chunkIndex}:`, error);
  }
}
