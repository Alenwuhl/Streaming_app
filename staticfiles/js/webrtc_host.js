import {
  getStreamIDFromURL,
  updateButtonState,
  getCSRFToken,
} from "./utils.js";
import { startRecording } from "./stream_recorder.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing WebRTC for Host...");

  // Obtener el ID del stream
  const streamID = getStreamIDFromURL();
  if (!streamID) {
    console.error("[ERROR] Stream ID is missing or invalid.");
    return;
  }
  console.log(`[DEBUG] Stream ID obtained: ${streamID}`);

  const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
  const websocket = new WebSocket(websocketURL);
  console.log(`[INFO] WebSocket URL: ${websocketURL}`);

  let peerConnection = null;
  let pendingICECandidates = [];
  let localStream = null;
  let screenStream = null;
  let screenSender = null;
  let isScreenSharing = false;

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const localVideo = document.getElementById("localVideo");
  const sharedScreen = document.getElementById("sharedScreen");
  const screenShareButton = document.getElementById("shareScreenButton");

  // Inicializar el stream local
  async function initializeLocalStream() {
    try {
      console.log("[INFO] Accessing local media...");
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localStream) {
        localVideo.srcObject = localStream;
        localVideo.classList.add("video-large");
        console.log("[INFO] Local stream initialized successfully.");
      }
      return localStream;
    } catch (error) {
      console.error("[ERROR] Failed to initialize local stream:", error);
      alert(
        "Could not access camera and microphone. Please check permissions."
      );
      return null;
    }
  }

  // Configuración del WebSocket
  websocket.onopen = async () => {
    console.log("[INFO] WebSocket is connected as Host.");
    const stream = await initializeLocalStream();
    if (stream) {
      createPeerConnection(stream);
    } else {
      console.error("[ERROR] Local stream initialization failed.");
    }
  };

  websocket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("[DEBUG] Received message:", message);

    if (message.type === "ready") {
      console.log("[INFO] Viewer is ready, starting streaming.");
      await startStreaming();
    } else if (message.type === "answer" && peerConnection) {
      console.log("[INFO] Received answer from viewer.");
      await setRemoteAnswer(message.data);
    } else if (message.type === "ice") {
      console.log("[DEBUG] Host received ICE candidate from viewer.");
      if (peerConnection?.remoteDescription) {
        await addIceCandidate(message.data);
      } else {
        pendingICECandidates.push(message.data);
      }
    }
  };

  websocket.onerror = (error) => {
    console.error("[ERROR] WebSocket encountered an error:", error);
  };

  websocket.onclose = (event) => {
    console.warn("[WARNING] WebSocket closed unexpectedly:", event);
    cleanupPeerConnection();
  };

  // Crear y configurar PeerConnection
  function createPeerConnection(localStream) {
    if (!localStream) {
      console.error("[ERROR] Local stream is null or undefined.");
      return;
    }

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
      console.log(`[DEBUG] Host added track: ${track.kind}, ID: ${track.id}`);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        websocket.send(JSON.stringify({ type: "ice", data: event.candidate }));
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === "failed") {
        peerConnection.restartIce();
      }
    };

    console.log("[INFO] PeerConnection initialized successfully.");
  }

  // Iniciar el streaming
  async function startStreaming() {
    try {
      if (!peerConnection) {
        console.error("[ERROR] PeerConnection is not initialized.");
        return;
      }

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      websocket.send(JSON.stringify({ type: "offer", data: offer }));
      console.log("[INFO] Streaming started successfully.");

      // Actualizar estado a is_live=true en el backend
      const response = await fetch(
        `/streamings/stream/start_live/${streamID}/`,
        {
          method: "POST",
          headers: {
            "X-CSRFToken": getCSRFToken(),
          },
        }
      );

      if (response.ok) {
        console.log("[INFO] Stream is now live on backend.");
      } else {
        console.error(
          "[ERROR] Failed to set stream live:",
          response.statusText
        );
      }
      if (localStream) {
        startRecording(localStream, streamID);
      } else {
        console.error("[ERROR] Local stream is not available for recording.");
      }
    } catch (error) {
      console.error("[ERROR] Error starting streaming:", error);
    }
  }

  // Configuración de intercambio de pantalla
  async function startScreenShare() {
    try {
      console.log("[INFO] Attempting to start screen sharing...");
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      if (screenStream) {
        const screenTrack = screenStream.getVideoTracks()[0];
        screenSender = peerConnection.addTrack(screenTrack, screenStream);

        sharedScreen.srcObject = screenStream;
        sharedScreen.classList.remove("d-none");

        screenTrack.onended = () => {
          console.log("[INFO] Screen sharing stopped.");
          stopScreenShare();
        };

        isScreenSharing = true;
      }
    } catch (error) {
      console.error("[ERROR] Failed to share screen:", error);
    }
  }

  function stopScreenShare() {
    if (screenSender) {
      peerConnection.removeTrack(screenSender);
      screenSender = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      screenStream = null;
    }

    sharedScreen.classList.add("d-none");
    isScreenSharing = false;
  }

  // Agregar eventos al botón de compartir pantalla
  screenShareButton.addEventListener("click", async () => {
    if (isScreenSharing) {
      stopScreenShare();
      updateButtonState(screenShareButton, false);
    } else {
      await startScreenShare();
      updateButtonState(screenShareButton, true);
    }
  });

  // Exponer variables necesarias globalmente
  window.WebRTC = {
    startStreaming,
    peerConnection,
    websocket,
  };
});
