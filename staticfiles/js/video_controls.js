import {
  initializeScreenSharing,
  startScreenShare,
} from "./screen_share_host.js";
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
    muteButton.addEventListener("click", () =>
      toggleMute(muteButton, localVideo)
    );
  } else {
    console.warn("[WARNING] Mute button not found.");
  }

  // Initialize Fullscreen Button
  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", () =>
      toggleFullscreen(localVideo)
    );
  } else {
    console.warn("[WARNING] Fullscreen button not found.");
  }

  // Initialize Share Screen Button
  if (shareScreenButton) {
    shareScreenButton.addEventListener("click", () =>
      initializeScreenSharing()
    );
  } else {
    console.warn("[WARNING] Share Screen button not found.");
  }

  // Initialize Start/End Streaming Button
  if (startEndStreamingButton) {
    startEndStreamingButton.addEventListener("click", async (event) => {

      const button = event.target;
      const startStreaming = window.WebRTC.startStreaming;
      const stopStreaming = window.WebRTC.stopStreaming;
      const streamID = window.WebRTC.streamID;

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
          await startStreaming(); // `webrtc_host.js` function
          if (!window.WebRTC.localStream) {
            console.error("[ERROR] localStream is not initialized.");
            alert("The local video stream is not ready. Please try again.");
            return;
          }
          if (!streamID) {
            console.error("[ERROR] Stream ID is missing: ", streamID);
            return;
          }
          startRecording(window.WebRTC.localStream, streamID); // `stream_recorder.js` function
          button.textContent = "Stop Streaming";
          button.classList.replace("btn-success", "btn-danger");
        } catch (error) {
          console.error("[ERROR] Error starting stream or recording:", error);
        }
      } else {
        console.log("[INFO] Stopping stream and recording...");
        try {
          stopRecordingAndSave(streamID); /// `stream_recorder.js` function
          await stopStreaming(); // `webrtc_host.js` function
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
