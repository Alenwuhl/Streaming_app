/**
 * Obtiene el ID del stream de la URL actual.
 * @returns {string | null} El ID del stream o null si no se encuentra.
 */
export function getStreamIDFromURL() {
  const match = window.location.pathname.match(/(\d+)/);
  return match ? match[0] : null;
}

/**
 * Actualiza el estado de un botón en función de si está activo o no.
 * @param {HTMLElement} button El botón a actualizar.
 * @param {boolean} isActive Indica si el botón debe estar en estado activo.
 */
export function updateButtonState(button, isActive) {
  if (!button) return;

  if (isActive) {
    button.classList.replace("btn-outline-warning", "btn-warning");
    button.innerHTML = '<i class="fas fa-stop"></i> Stop Sharing';
  } else {
    button.classList.replace("btn-warning", "btn-outline-warning");
    button.innerHTML = '<i class="fas fa-desktop"></i> Share Screen';
  }
}

/**
 * Obtiene el token CSRF de las cookies.
 * @returns {string | null} El token CSRF o null si no se encuentra.
 */
export function getCSRFToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken"))
    ?.split("=")[1];
}

/**
 * Toggles the mute state of a video element.
 * @param {HTMLVideoElement} videoElement - The video element to toggle mute.
 * @param {HTMLElement} muteButton - The button element to update its state.
 */
export function toggleMute(videoElement, muteButton) {
  if (!videoElement) {
    console.error("[ERROR] Video element is not provided.");
    return;
  }

  videoElement.muted = !videoElement.muted;
  if (muteButton) {
    muteButton.innerHTML = videoElement.muted
      ? '<i class="fas fa-volume-up"></i>'
      : '<i class="fas fa-volume-mute"></i>';
    console.log(
      `[INFO] Video is now ${videoElement.muted ? "muted" : "unmuted"}.`
    );
  }
}

/**
 * Toggles the fullscreen mode of a video element.
 * @param {HTMLVideoElement} videoElement - The video element to toggle fullscreen.
 */
export function toggleFullscreen(videoElement) {
  if (!videoElement) {
    console.error("[ERROR] Video element is not provided.");
    return;
  }

  if (!document.fullscreenElement) {
    videoElement.requestFullscreen().catch((err) => {
      console.error("[ERROR] Unable to enter fullscreen mode:", err);
    });
    console.log("[INFO] Entering fullscreen mode.");
  } else {
    document.exitFullscreen().catch((err) => {
      console.error("[ERROR] Unable to exit fullscreen mode:", err);
    });
    console.log("[INFO] Exiting fullscreen mode.");
  }
}

/**
 * Handle WebSocket errors
 * @param {Event} error The WebSocket error event
 */
export function handleWebSocketError(error) {
  console.error("[ERROR] WebSocket error occurred:", error);
  alert("A connection error occurred. Please try refreshing the page.");
}