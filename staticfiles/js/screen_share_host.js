// Function to start the screen share
async function startScreenShare() {
  try {
    if (window.WebRTC.isScreenSharing) {
      console.warn("[INFO] Screen sharing is already active.");
      return;
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    console.log(screenStream.getVideoTracks())
    const screenTrack = screenStream.getVideoTracks()[0];
    screenTrack.contentHint = "screen";

    // Agregar el track con un transceiver específico
    window.WebRTC.peerConnection.addTrack(screenTrack, screenStream);
    window.WebRTC.screenStream = screenStream;
    window.WebRTC.isScreenSharing = true;


    // Configurar visualización
    const sharedScreen = document.getElementById("sharedScreen");
    sharedScreen.srcObject = screenStream;
    sharedScreen.classList.remove("d-none", "video-small");
    sharedScreen.classList.add("video-large");

    const localVideo = document.getElementById("localVideo");
    localVideo.classList.add("video-small");
    localVideo.classList.remove("video-large");

    // Crear y enviar nueva oferta
    const newOffer = await window.WebRTC.peerConnection.createOffer();
    await window.WebRTC.peerConnection.setLocalDescription(newOffer);
    window.WebRTC.websocket.send(
      JSON.stringify({
        type: "offer",
        data: newOffer,
        screenShare: true, // Indicador para el viewer
      })
    );

    // Manejar fin de compartir pantalla
    screenTrack.onended = () => {
      stopScreenShare(window.WebRTC.peerConnection, sharedScreen);
      window.WebRTC.isScreenSharing = false;
      window.WebRTC.screenStream = null;
      console.log("[INFO] Screen sharing stopped.");
    };

    console.log("[INFO] Screen sharing started successfully");
  } catch (error) {
    console.error("[ERROR] Error starting screen share:", error);
    window.WebRTC.isScreenSharing = false;
  }
}

// Function to stop the screen share
function stopScreenShare(peerConnection, sharedScreen) {
  try {
    if (!window.WebRTC.isScreenSharing) {
      console.warn("[INFO] No hay screen share activo para detener.");
      return;
    }

    if (window.WebRTC.screenSender) {
      peerConnection.removeTrack(window.WebRTC.screenSender);
      window.WebRTC.screenSender = null;
    }

    if (sharedScreen.srcObject) {
      sharedScreen.srcObject.getTracks().forEach((track) => track.stop());
      sharedScreen.srcObject = null;
    }

    sharedScreen.classList.add("d-none");
    sharedScreen.classList.remove("video-large");
    document.getElementById("localVideo").classList.remove("video-small");
    document.getElementById("localVideo").classList.add("video-large");

    window.WebRTC.isScreenSharing = false;

    const stopMessage = JSON.stringify({ type: "screen_share_ended" });
    console.log("[DEBUG] Enviando mensaje WebRTC:", stopMessage);
    window.WebRTC.websocket.send(stopMessage);

    console.log("[INFO] Screen sharing detenido.");
  } catch (error) {
    console.error("[ERROR] Error al detener el screen sharing:", error);
  }
}


// Function to handle the screen sharing
async function initializeScreenSharing() {
  // const sharedScreen = document.getElementById("sharedScreen");
  // console.log("sharedScreen: ", sharedScreen);

  if (window.WebRTC.isScreenSharing) {
    stopScreenShare();
  } else {
    await startScreenShare();
  }
}

export { initializeScreenSharing, startScreenShare, stopScreenShare };
