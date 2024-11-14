document.addEventListener("DOMContentLoaded", () => {
    console.log("[INFO] Initializing Video Controls...");
  
    const videoElement =
      document.getElementById("localVideo") ||
      document.getElementById("remoteVideo");
    const muteButton = document.getElementById("muteButton");
    const fullscreenButton = document.getElementById("fullscreenButton");
  
    // Verificar si el usuario es el host
    if (typeof isHost === "undefined" || !isHost) {
      console.log("[INFO] User is viewer. Host controls will not be initialized.");
      return;
    }
  
    console.log("[INFO] User is host. Initializing host controls.");
  
    // Inicializar flag para el estado del streaming
    let isStreaming = false;
  
    // Validar la presencia del videoElement
    if (!videoElement) {
      console.error("[ERROR] Video element not found. Exiting video controls initialization.");
      return;
    }
    console.log("[DEBUG] Video element found:", videoElement.id);
  
    // Inicializar controles del host
    initializeHostControls();
  
    /**
     * Inicializa los controles solo para el host.
     */
    function initializeHostControls() {
      if (muteButton) {
        console.log("[DEBUG] Mute button found. Adding event listener.");
        muteButton.addEventListener("click", toggleMute);
      } else {
        console.warn("[WARNING] Mute button not found. Skipping mute functionality.");
      }
  
      if (fullscreenButton) {
        console.log("[DEBUG] Fullscreen button found. Adding event listener.");
        fullscreenButton.addEventListener("click", toggleFullscreen);
      } else {
        console.warn("[WARNING] Fullscreen button not found. Skipping fullscreen functionality.");
      }
  
      // Agregar listener para finalizar el stream al cerrar la ventana
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
  
    /**
     * Alterna el estado de mute del video.
     */
    function toggleMute() {
      try {
        if (videoElement.muted) {
          videoElement.muted = false;
          muteButton.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icono de volumen activo
          console.log("[INFO] Video unmuted.");
        } else {
          videoElement.muted = true;
          muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>'; // Icono de mute
          console.log("[INFO] Video muted.");
        }
      } catch (error) {
        console.error("[ERROR] Error toggling mute:", error);
      }
    }
  
    /**
     * Alterna el modo de pantalla completa.
     */
    function toggleFullscreen() {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          console.log("[INFO] Exiting fullscreen mode.");
        } else {
          if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
          } else if (videoElement.mozRequestFullScreen) {
            videoElement.mozRequestFullScreen(); // Firefox
          } else if (videoElement.webkitRequestFullscreen) {
            videoElement.webkitRequestFullscreen(); // Chrome, Safari, Opera
          } else if (videoElement.msRequestFullscreen) {
            videoElement.msRequestFullscreen(); // IE/Edge
          }
          console.log("[INFO] Entering fullscreen mode.");
        }
      } catch (error) {
        console.error("[ERROR] Error toggling fullscreen:", error);
      }
    }
  
    /**
     * Manejador para el evento 'beforeunload'.
     * Finaliza el stream si el host intenta cerrar la ventana o recargar la página.
     */
    async function handleBeforeUnload(event) {
      try {
        if (isStreaming) {
          console.warn("[WARNING] Host is attempting to leave the page. Ending the stream.");
          const streamId = document.body.getAttribute("data-stream-id");
          if (!streamId) {
            console.error("[ERROR] Stream ID not found. Cannot end stream.");
            return;
          }
          await endStreamLive(streamId);
        }
      } catch (error) {
        console.error("[ERROR] Error ending stream on beforeunload:", error);
      }
    }
  
    /**
     * Alterna el estado de streaming y actualiza el flag isStreaming.
     */
    function toggleStreamingState() {
      isStreaming = !isStreaming;
      console.log(`[INFO] Streaming state updated: ${isStreaming}`);
    }
  
    /**
     * Finaliza el stream mediante una solicitud al servidor.
     */
    async function endStreamLive(streamId) {
      if (!streamId) {
        console.error("[ERROR] Stream ID not found. Cannot end stream.");
        return;
      }
  
      try {
        const response = await fetch(`/streamings/end/${streamId}/`, {
          method: "POST",
          headers: {
            "X-CSRFToken": getCSRFToken(),
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.status === "success") {
          console.log("[INFO] Stream has ended successfully.");
          toggleStreamingState();
        } else {
          console.error("[ERROR] Failed to end stream:", data.message);
        }
      } catch (error) {
        console.error("[ERROR] Error sending end stream request:", error);
      }
    }
  
    /**
     * Obtiene el token CSRF para solicitudes seguras.
     */
    function getCSRFToken() {
      const cookie = document.cookie.split("; ").find((row) => row.startsWith("csrftoken"));
      return cookie ? cookie.split("=")[1] : null;
    }
  });
  