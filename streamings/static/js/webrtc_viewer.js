import { getStreamIDFromURL, handleWebSocketError } from './utils.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing WebRTC for Viewer...");

  const streamID = getStreamIDFromURL();
  if (!streamID) {
    console.error("[ERROR] Stream ID is missing or invalid.");
    return;
  }

  const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
  const websocket = new WebSocket(websocketURL);
  let peerConnection = null;

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const remoteVideo = document.getElementById("remoteVideo");

  websocket.onopen = () => {
    console.log("[INFO] WebSocket connected.");
  };

  websocket.onerror = (error) => {
    console.error("[ERROR] WebSocket encountered an error:", error);
    handleWebSocketError(error);
  };

  websocket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("[DEBUG] Message received:", message);

    try {
      if (message.type === "offer") {
        console.log("[INFO] Received offer. Setting up PeerConnection...");
        await setupPeerConnection(message.data);
      } else if (message.type === "ice" && peerConnection) {
        console.log("[DEBUG] Adding ICE candidate...");
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
      } else {
        console.warn("[WARNING] Unknown message type received:", message.type);
      }
    } catch (err) {
      console.error("[ERROR] Error handling WebSocket message:", err);
    }
  };

  async function setupPeerConnection(offer) {
    console.log("[INFO] Setting up PeerConnection...");
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        console.log("[INFO] Remote stream set.");
      } else {
        console.warn("[WARNING] No stream found in ontrack event.");
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[DEBUG] Sending ICE candidate...");
        websocket.send(JSON.stringify({ type: "ice", data: event.candidate }));
      }
    };

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("[INFO] Sending answer...");
      websocket.send(JSON.stringify({ type: "answer", data: answer }));
    } catch (err) {
      console.error("[ERROR] Error setting up PeerConnection:", err);
    }
  }
});
