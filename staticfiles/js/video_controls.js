import { stopRecordingAndSave, startRecording } from "./stream_recorder.js";
// import { startStreaming, stopStreaming } from "./webrtc_host.js";

// Initialize video controls when the DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing Video Controls for Host...");

  const muteButton = document.getElementById("muteButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const shareScreenButton = document.getElementById("shareScreenButton");
  const startEndStreamingButton = document.getElementById(
    "startEndStreamingButton"
  );
  const localVideo = document.getElementById("localVideo");

  if (!localVideo) {
    console.error(
      "[ERROR] Local video element not found. Initialization aborted."
    );
    return;
  }

  // Initialize Mute Button
  if (muteButton) {
    console.log("[DEBUG] Mute button found. Adding event listener.");
    muteButton.addEventListener("click", () =>
      toggleMute(muteButton, localVideo)
    );
  } else {
    console.warn("[WARNING] Mute button not found.");
  }

  // Initialize Fullscreen Button
  if (fullscreenButton) {
    console.log("[DEBUG] Fullscreen button found. Adding event listener.");
    fullscreenButton.addEventListener("click", () =>
      toggleFullscreen(localVideo)
    );
  } else {
    console.warn("[WARNING] Fullscreen button not found.");
  }

  // Initialize Share Screen Button
  if (shareScreenButton) {
    console.log(
      "[DEBUG] Share Screen button found. Event handled in WebRTC logic."
    );
  } else {
    console.warn("[WARNING] Share Screen button not found.");
  }

  // Initialize Start/End Streaming Button
  if (startEndStreamingButton) {
    console.log(
      "[DEBUG] Start/End Streaming button found. Adding event listener."
    );
    startEndStreamingButton.addEventListener("click", async (event) => {
      console.log("[DEBUG] Start/End Streaming button clicked.");

      const button = event.target;
      const startStreaming = window.WebRTC.startStreaming;
      const stopStreaming = window.WebRTC.stopStreaming;
      const streamID = window.WebRTC.streamID;
      console.log("[DEBUG] WebRTC object:", window.WebRTC);

      if (!window.WebRTC) {
        console.error("[ERROR] WebRTC object is not defined.");
        return;
      }

      if (!window.WebRTC.startStreaming || !window.WebRTC.stopStreaming) {
        console.error(
          "[ERROR] startStreaming or stopStreaming is not defined in WebRTC."
        );
        return;
      }
      if (button.textContent.includes("Start")) {
        console.log("[INFO] Starting stream and recording...");
        try {
          console.log("[DEBUG] Checking WebRTC object:", window.WebRTC);
          await startStreaming(); // Función de `webrtc_host.js`
          startRecording(streamID); // Función de `stream_recorder.js`
          button.textContent = "Stop Streaming";
          button.classList.replace("btn-success", "btn-danger");
        } catch (error) {
          console.error("[ERROR] Error starting stream or recording:", error);
        }
      } else {
        console.log("[INFO] Stopping stream and recording...");
        try {
          stopRecordingAndSave(); // Función de `stream_recorder.js`
          await stopStreaming(); // Función de `webrtc_host.js`
          button.textContent = "Start Streaming";
          button.classList.replace("btn-danger", "btn-success");
        } catch (error) {
          console.error("[ERROR] Error stopping stream or recording:", error);
        }
      }
    });
  } else {
    console.error("[ERROR] Start/End Streaming button not found.");
  }
});

// Toggle mute for the local video element
function toggleMute(muteButton, localVideo) {
  localVideo.muted = !localVideo.muted;
  const icon = muteButton.querySelector("i");
  if (icon) {
    icon.className = localVideo.muted
      ? "fas fa-volume-mute"
      : "fas fa-volume-up";
  }
  console.log(`[INFO] Local video muted: ${localVideo.muted}`);
}

// Toggle fullscreen mode for the local video element
function toggleFullscreen(localVideo) {
  if (!document.fullscreenElement) {
    localVideo.requestFullscreen().catch((error) => {
      console.error("[ERROR] Failed to enter fullscreen mode:", error);
    });
  } else {
    document.exitFullscreen().catch((error) => {
      console.error("[ERROR] Failed to exit fullscreen mode:", error);
    });
  }
}
