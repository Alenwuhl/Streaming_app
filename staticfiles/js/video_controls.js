import { stopRecordingAndSave } from "./stream_recorder.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing Video Controls for Host...");

  const muteButton = document.getElementById("muteButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const shareScreenButton = document.getElementById("shareScreenButton");
  const startendStreamingButton = document.getElementById("startEndStreamingButton");
  const localVideo = document.getElementById("localVideo");

  // Initialize Mute Button
  if (muteButton) {
    console.log("[DEBUG] Mute button found. Adding event listener.");
    muteButton.addEventListener("click", toggleMute);
  }

  // Initialize Fullscreen Button
  if (fullscreenButton) {
    console.log("[DEBUG] Fullscreen button found. Adding event listener.");
    fullscreenButton.addEventListener("click", toggleFullscreen);
  }

  // Initialize Share Screen Button
  if (shareScreenButton) {
    console.log("[DEBUG] Share Screen button found. Event handled in WebRTC logic.");
  }

  // Initialize End Streaming Button
  if (startendStreamingButton) {
    console.log("[DEBUG] End Streaming button found. Event handled in WebRTC logic.");
  }

  /**
   * Toggle mute for local video.
   */
  function toggleMute() {
    if (localVideo) {
      localVideo.muted = !localVideo.muted;
      const icon = muteButton.querySelector("i");
      if (icon) {
        icon.className = localVideo.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
      }
      console.log(`[INFO] Local video muted: ${localVideo.muted}`);
    } else {
      console.error("[ERROR] Local video element not found.");
    }
  }

  /**
   * Toggle fullscreen for the local video container.
   */
  function toggleFullscreen() {
    if (localVideo) {
      if (!document.fullscreenElement) {
        localVideo.requestFullscreen().catch((error) => {
          console.error("[ERROR] Failed to enter fullscreen mode:", error);
        });
      } else {
        document.exitFullscreen().catch((error) => {
          console.error("[ERROR] Failed to exit fullscreen mode:", error);
        });
      }
    } else {
      console.error("[ERROR] Local video element not found.");
    }
  }

  document.getElementById("startEndStreamingButton").addEventListener("click", async (event) => {
    const button = event.target;
    const { startStreaming, peerConnection, websocket } =
    window.WebRTC;
    if (button.textContent.includes("Start")) {
      console.log("[INFO] Starting stream...");
      await startStreaming();
      button.textContent = "Stop Streaming";
      button.classList.replace("btn-success", "btn-danger");
    } else {
      console.log("[INFO] Stopping stream...");
      stopRecordingAndSave(streamId)
      button.textContent = "Start Streaming";
      button.classList.replace("btn-danger", "btn-success");
    }
  });  
});
