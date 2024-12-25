// screen_share_host.js

async function startScreenShare() {
  try {
    const peerConnection = window.WebRTC.peerConnection;
    const sharedScreen = window.WebRTC.sharedScreen

    if (!peerConnection) {
      console.error("[ERROR] PeerConnection is not defined or initialized.");
      return;
    }
    if (window.WebRTC.isScreenSharing) {
      console.warn("[INFO] Screen sharing is already active.");
      return;
    }

    // Obtener el stream de pantalla
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    // Obtener el track de video
    const screenTrack = screenStream.getVideoTracks()[0];

    // Agregar el track al peerConnection
    window.WebRTC.screenSender = peerConnection.addTrack(screenTrack);
    console.log(
      "[DEBUG] Screen sharing track added to peer connection:",
      screenTrack
    );

    // Mostrar la pantalla compartida localmente
    sharedScreen.srcObject = screenStream;
    sharedScreen.classList.remove("d-none");
    sharedScreen.classList.remove("video-small");
    sharedScreen.classList.add("video-large");

    const localVideo = document.getElementById("localVideo");
    localVideo.classList.add("video-small");
    localVideo.classList.remove("video-large");

    // Manejar la finalización de la pantalla compartida
    screenTrack.onended = () => {
      stopScreenShare(peerConnection, sharedScreen);
      console.log("[INFO] Screen sharing stopped by user.");
    };

    // Realizar renegociación con el viewer
    await renegotiateScreenShare(peerConnection);

    window.WebRTC.isScreenSharing = true;
    console.log("[INFO] Screen sharing started successfully.");
  } catch (error) {
    console.error("[ERROR] Failed to start screen sharing:", error);
  }
}

function stopScreenShare(peerConnection, sharedScreen) {
  try {
    if (!window.WebRTC.isScreenSharing) {
      console.warn("[INFO] No active screen sharing to stop.");
      return;
    }

    // Remover el track de pantalla compartida
    if (window.WebRTC.screenSender) {
      peerConnection.removeTrack(window.WebRTC.screenSender);
      window.WebRTC.screenSender = null;
    }

    // Detener el stream de pantalla compartida
    if (sharedScreen.srcObject) {
      sharedScreen.srcObject.getTracks().forEach((track) => track.stop());
      sharedScreen.srcObject = null;
    }

    // Restaurar las clases de video
    sharedScreen.classList.add("d-none");
    sharedScreen.classList.remove("video-large");

    const localVideo = document.getElementById("localVideo");
    localVideo.classList.remove("video-small");
    localVideo.classList.add("video-large");

    window.WebRTC.isScreenSharing = false;
    console.log("[INFO] Screen sharing stopped.");
  } catch (error) {
    console.error("[ERROR] Failed to stop screen sharing:", error);
  }
}

async function renegotiateScreenShare(peerConnection) {
  try {
    // Crear una nueva oferta para renegociar
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Enviar la oferta al viewer mediante WebSocket
    const websocket = window.WebRTC.websocket;
    websocket.send(JSON.stringify({ type: "offer", data: offer }));

    console.log("[INFO] Sent renegotiation offer for screen sharing.");
  } catch (error) {
    console.error("[ERROR] Failed to renegotiate screen sharing:", error);
  }
}

function initializeScreenSharing(
  peerConnection,
  screenShareButton,
  sharedScreen
) {
  // Configurar el evento click del botón de pantalla compartida
  screenShareButton.addEventListener("click", async () => {
    if (window.WebRTC.isScreenSharing) {
      stopScreenShare(peerConnection, sharedScreen);
    } else {
      await startScreenShare(peerConnection, sharedScreen);
    }
  });
}

export { initializeScreenSharing, startScreenShare, stopScreenShare };
