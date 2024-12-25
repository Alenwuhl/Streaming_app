// webrtc_viewer.js
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
  console.log(`[DEBUG] Stream ID obtained: ${streamID}`);

  const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
  const websocket = new WebSocket(websocketURL);
  console.log(`[INFO] WebSocket URL: ${websocketURL}`);

  let peerConnection = null;
  let remoteStream = new MediaStream();
  let iceCandidateQueue = [];

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const remoteVideo = document.getElementById("hostVideo");
  const sharedScreen = document.getElementById("sharedScreen");

  websocket.onopen = () => {
    console.log("[INFO] WebSocket is connected as Viewer.");
    websocket.send(JSON.stringify({ type: "ready" }));
  };

  websocket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("[DEBUG] Received message:", data);

    switch (data.type) {
      case "offer":
        handleOffer(data.data);
        break;
      case "answer":
        console.warn("[WARNING] Viewer should not receive an answer.");
        break;
      case "ice":
        addIceCandidate(data.data);
        break;
      case "ready":
        console.log("[INFO] Viewer received ready message from host.");
        break;
      default:
        console.warn("[WARNING] Unhandled message type received:", data.type);
    }
  };

  async function handleOffer(offer) {
    console.log("[INFO] Handling offer received from host.");

    if (!peerConnection) {
      setupViewerPeerConnection();
    }

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      console.log("[INFO] Remote description set successfully.");

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("[INFO] Local description set successfully:", answer);

      websocket.send(JSON.stringify({ type: "answer", data: answer }));
      console.log("[INFO] Answer sent to host.");
    } catch (err) {
      console.error("[ERROR] Failed to handle offer:", err);
    }
  }

  function setupViewerPeerConnection() {
    console.log("[INFO] Setting up PeerConnection...");
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[INFO] Sending ICE candidate to host:", event.candidate);
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
    };

    peerConnection.ontrack = (event) => {
      console.log("[DEBUG] ontrack event received:", event);

      remoteStream.addTrack(event.track);
      if (event.track.kind === "video") {
        if (event.track.label.includes("screen")) {
          handleScreenShareTrack(event.track);
          sharedScreen.srcObject = new MediaStream([event.track]);
          sharedScreen.classList.remove("d-none");
          console.log("[INFO] Screen sharing track handled.");
        } else {
          remoteVideo.srcObject = remoteStream;
          console.log("[INFO] Main video track handled.");
        }
      } else {
        console.warn("[WARNING] Non-video track received:", event.track.kind);
      }
    };
  }

  async function addIceCandidate(candidate) {
    if (!peerConnection || !peerConnection.remoteDescription) {
      console.log(
        "[INFO] Remote description not set. Queuing ICE candidate."
      );
      iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added successfully.");
    } catch (err) {
      console.error("[ERROR] Failed to add ICE candidate:", err);
    }
  }

  function processIceQueue() {
    while (iceCandidateQueue.length > 0) {
      const candidate = iceCandidateQueue.shift();
      addIceCandidate(candidate);
    }
  }

  sharedScreen.addEventListener("click", () =>
    toggleScreenView(remoteVideo, sharedScreen)
  );

  function toggleScreenView(remoteVideo, sharedScreen) {
    if (sharedScreen.classList.contains("video-large")) {
      sharedScreen.classList.remove("video-large");
      sharedScreen.classList.add("video-small");

      remoteVideo.classList.remove("video-small");
      remoteVideo.classList.add("video-large");
    } else {
      sharedScreen.classList.remove("video-small");
      sharedScreen.classList.add("video-large");

      remoteVideo.classList.remove("video-large");
      remoteVideo.classList.add("video-small");
    }

    console.log("[INFO] Toggled view between screen and remote video.");
  }
});
