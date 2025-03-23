let mediaRecorder;
let isRecording = false;
let recordedChunks = [];

import { getCSRFToken } from "./utils.js";

/**
 * Starts recording a given MediaStream.
 * @param {MediaStream} stream - The media stream to be recorded.
 * @param {string} streamID - Unique ID for the stream session.
 */
export function startRecording(stream, streamID) {
  if (!(stream instanceof MediaStream)) {
    console.error("[ERROR] startRecording: Invalid stream object:", stream);
    return;
  }

  console.log("[INFO] Initializing MediaRecorder...");
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
      console.log("[INFO] MediaRecorder has stopped. Uploading chunks...");
      if (recordedChunks.length > 0) {
        await uploadAllChunks(streamID);
      } else {
        console.warn("[WARNING] No recorded chunks found to upload.");
      }

      console.log("[INFO] Notifying backend to finalize stream...");
      await notifyBackendToFinalize(streamID);
    };

    mediaRecorder.start();
    isRecording = true;
    console.log("[INFO] Recording started successfully.");
  } catch (error) {
    console.error("[ERROR] Failed to initialize MediaRecorder:", error);
  }
}

/**
 * Stops the recording and triggers finalization once done.
 * @param {string} streamID - ID of the stream.
 */
export async function stopRecordingAndSave(streamID) {
  if (!isRecording || !mediaRecorder) {
    console.warn("[WARNING] No active recording to stop.");
    return;
  }

  console.log("[INFO] Stopping MediaRecorder...");
  mediaRecorder.stop(); // Will trigger onstop
  isRecording = false;
}

/**
 * Uploads all recorded video chunks to the server sequentially.
 * @param {string} streamID - ID of the stream to associate with.
 */
async function uploadAllChunks(streamID) {
  for (let i = 0; i < recordedChunks.length; i++) {
    const chunk = recordedChunks[i];
    await uploadVideoChunk(chunk, streamID, i);
  }
  recordedChunks = []; // Clear buffer after upload
  console.log("[INFO] All chunks uploaded successfully.");
}

/**
 * Uploads a single video chunk to the backend.
 * @param {Blob} videoBlob - Chunk of video in Blob format.
 * @param {string} streamID - ID of the stream.
 * @param {number} chunkIndex - Index of the chunk being uploaded.
 */
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
      console.log(`[INFO] Chunk ${chunkIndex} uploaded successfully.`);
    } else {
      console.error(`[ERROR] Failed to upload chunk ${chunkIndex}:`, response.status);
    }
  } catch (error) {
    console.error(`[ERROR] Error uploading chunk ${chunkIndex}:`, error);
  }
}

/**
 * Notifies the Django backend to finalize the stream.
 * @param {string} streamID - ID of the stream to finalize.
 */
async function notifyBackendToFinalize(streamID) {
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
      alert("Failed to finalize the stream. Please try again.");
      return;
    }

    const data = await response.json();
    if (data.status === "success") {
      console.log("[INFO] Stream finalized successfully on the server.");
      alert("Stream has been finalized successfully.");
      window.location.href = "/";
    } else {
      console.error("[ERROR] Server failed to finalize stream:", data.message);
    }
  } catch (error) {
    console.error("[ERROR] Error notifying backend to finalize stream:", error);
  }
}
