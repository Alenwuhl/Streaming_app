import { getStreamIDFromURL, handleWebSocketError } from "./utils.js";
import {
  handleScreenShareTrack,
  stopScreenShareViewer,
} from "./screen_share_viewer.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing WebRTC for Viewer...");

  const streamID = getStreamIDFromURL();
  if (!streamID) {
    console.error("[ERROR] Stream ID is missing or invalid.");
    return;
  }

  const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
  const websocket = new WebSocket(websocketURL);
  console.log(`[INFO] WebSocket URL: ${websocketURL}`);

  let peerConnection = null;
  let remoteStream = new MediaStream();
  let messageQueue = [];
  let iceCandidateQueue = [];

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const remoteVideo = document.getElementById("hostVideo");
  const sharedScreen = document.getElementById("sharedScreen");

  websocket.onopen = () => {
    console.log("[INFO] WebSocket is connected as Viewer.");
    websocket.send(JSON.stringify({ type: "ready" }));

    if (!peerConnection) {
      console.log("[INFO] Initializing PeerConnection...");
      initializePeerConnection();
    }
  };

  websocket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case "offer":
        handleOffer(data.data);
        break;
      case "ice":
        handleIceCandidate(data.data);
        break;
      case "ready":
        console.log("[INFO] Viewer received ready message from host.");
        break;
      default:
        console.warn("[WARNING] Unhandled message type received:", data.type);
    }
  };

  function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        websocket.send(JSON.stringify({ type: "ice", data: event.candidate }));
      } else {
        console.log("[INFO] ICE candidate gathering complete.");
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "[INFO] ICE connection state changed:",
        peerConnection.iceConnectionState
      );
      if (peerConnection.iceConnectionState === "failed") {
        console.error("[ERROR] ICE connection failed.");
      }
    };

    peerConnection.ontrack = (event) => {
      console.log("[DEBUG] ontrack event received on viewer:", event);

      if (event.streams && event.streams.length > 0) {
        console.log('event: ', event);
        event.streams[0].getTracks().forEach((track) => {
          handleTrack(track, event);
        });
      } else {
        console.log('dani1', event)
        // Manejar tracks sin streams asociados
        handleTrack(event.track);
      }
    };

    function handleTrack(track, event) {
      console.log("[DEBUG] Track received:", track);
      
      if (track.kind === "video") {      
        // Identificar el track de pantalla por el mid del transceiver
        if (event.transceiver && event.transceiver.mid === "2") {
          console.log("[INFO] Handling screen share track...");
          const screenStream = new MediaStream([track]);
          console.log('screenStream: ', screenStream);
          
          sharedScreen.srcObject = screenStream;
          sharedScreen.classList.remove("d-none");
          sharedScreen.classList.remove("video-small")
          // Ajustar tamaños 
          sharedScreen.classList.add("video-large");
          remoteVideo.classList.add("video-small");
          remoteVideo.classList.remove("video-large");
        } else {
          console.log("[INFO] Handling main video track...");
          if (!remoteStream) {
            remoteStream = new MediaStream();
          }
          remoteStream.addTrack(track);
          remoteVideo.srcObject = remoteStream;
        }
      } else if (track.kind === "audio") {
        console.log("[INFO] Handling audio track.");
        if (!remoteStream) {
          remoteStream = new MediaStream();
        }
        remoteStream.addTrack(track);
      }
    }
  }

  function handleOffer(offer) {
    console.log("[INFO] Handling offer received from host:", offer);

    if (!peerConnection) {
      console.error(
        "[ERROR] PeerConnection is not initialized. Initializing now..."
      );
      initializePeerConnection();
    }

    peerConnection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(async () => {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        websocket.send(JSON.stringify({ type: "answer", data: answer }));
        console.log("[INFO] Answer sent to host after handling new offer.");
      })
      .catch((error) => {
        console.error("[ERROR] Error handling new offer:", error);
      });
  }

  function handleIceCandidate(candidate) {
    console.log("[INFO] Adding ICE candidate received from host:", candidate);
    if (peerConnection && peerConnection.remoteDescription) {
      peerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          console.log("[INFO] ICE candidate added successfully.");
        })
        .catch((err) => {
          console.error("[ERROR] Error adding ICE candidate:", err);
        });
    } else {
      console.warn(
        "[WARNING] PeerConnection not ready. Queueing ICE candidate."
      );
      iceCandidateQueue.push(candidate);
    }
  }

  sharedScreen.addEventListener("click", () =>
    toggleScreenView(remoteVideo, sharedScreen)
  );

  function toggleScreenView(localVideo, sharedScreen) {
    console.log("[INFO] Toggling screen view...");

    if (sharedScreen.classList.contains("video-large")) {
      sharedScreen.classList.remove("video-large");
      sharedScreen.classList.add("video-small");

      localVideo.classList.remove("video-small");
      localVideo.classList.add("video-large");
      console.log("[INFO] Toggled screen sharing view to small.");
    } else {
      sharedScreen.classList.remove("video-small");
      sharedScreen.classList.add("video-large");

      localVideo.classList.remove("video-large");
      localVideo.classList.add("video-small");
      console.log("[INFO] Toggled screen sharing view to large.");
    }

    console.log(
      "[INFO] Toggled video view between local video and shared screen."
    );
  }

  window.ViewerWebRTC = {
    stopScreenShareViewer,
  };
});
