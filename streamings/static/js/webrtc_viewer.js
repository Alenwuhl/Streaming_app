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
  };

  websocket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("[DEBUG] Received message by viewer:", message);
    messageQueue.push(message);
    processQueue();
    switch (data.type) {
      case "offer":
        handleOffer(data.data);
        break;
      case "answer":
        handleAnswer(data.data);
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

  function handleOffer(offer) {
    console.log("[INFO] Handling offer received from host:", offer);
    setupViewerPeerConnection(offer);
  }

  function processQueue() {
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message.type === "answer") {
        handleAnswer(message.data);
      } else if (message.type === "ice") {
        handleIceCandidate(message.data);
      }
    }
  }

  async function handleAnswer(answer) {
    if (peerConnection.signalingState !== "have-local-offer") {
      console.error(
        "[ERROR] PeerConnection is not in the correct state to set remote answer:",
        peerConnection.signalingState
      );
      return;
    }

    console.log("[INFO] Handling answer received from host:", answer);

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("[INFO] Remote answer set successfully.");
      processIceQueue();
    } catch (err) {
      console.error("[ERROR] Error setting remote answer:", err);
    }
  }

  function handleIceCandidate(candidate) {
    console.log("[INFO] Adding ICE candidate received from host:", candidate);
    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .then(() => {
        console.log("[INFO] ICE candidate added successfully.");
      })
      .catch((err) => {
        console.error("[ERROR] Error adding ICE candidate:", err);
      });
  }

  async function setupViewerPeerConnection(offer) {
    console.log("[INFO] Setting up PeerConnection...");
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[DEBUG] Sending ICE candidate to host:", event.candidate);
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

    remoteVideo.onloadedmetadata = () => {
      console.log("Metadata loaded, attempting to play video.");
      remoteVideo.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    };

    peerConnection.ontrack = (event) => {
      console.log("[DEBUG] ontrack event received on viewer:", event);

      // Ensure remoteStream is initialized
      if (!remoteStream) {
        remoteStream = new MediaStream();
        console.log("[INFO] New remote stream created.");
      }

      // Add the track to the remote stream
      remoteStream.addTrack(event.track);
      console.log("[INFO] Remote stream updated with new track:", event.track);

      // Ensure remoteVideo exists and update its srcObject
      if (remoteVideo) {
        if (remoteVideo.srcObject !== remoteStream) {
          remoteVideo.srcObject = remoteStream;
          console.log(
            "[INFO] remoteVideo.srcObject updated with remoteStream:",
            remoteStream
          );
        }
      } else {
        console.error("[ERROR] Remote video element not found.");
        return;
      }

      // Handle video-specific tracks
      if (event.track.kind === "video") {
        if (event.track.label === "screen") {
          console.log("[INFO] Handling screen share track on viewer...");
          handleScreenShareTrack(event.track);
        } else {
          console.log("[INFO] Handling main video track on viewer...");
        }
      } else {
        console.warn(
          "[WARNING] Non-video track received on viewer:",
          event.track.kind
        );
      }

      // Ensure the video plays when metadata is loaded
      remoteVideo.onloadedmetadata = () => {
        console.log("[INFO] Metadata loaded. Attempting to play video...");
        remoteVideo.play().catch((err) => {
          console.error("[ERROR] Failed to play video:", err);
        });
      };

      console.log("[INFO] Viewer video setup completed.");
    };

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      console.log("[INFO] Remote description set successfully.");

      const answer = await peerConnection.createAnswer();
      console.log("[INFO] Answer created:", answer);

      await peerConnection.setLocalDescription(answer);
      console.log("[INFO] Local description set successfully:", answer);

      websocket.send(JSON.stringify({ type: "answer", data: answer }));
      console.log("[INFO] Answer sent to host.");
    } catch (err) {
      console.error("[ERROR] Error setting up PeerConnection:", err);
    }
  }

  async function addIceCandidate(candidate) {
    if (!peerConnection || !peerConnection.remoteDescription) {
      console.warn(
        "[WARNING] Remote description is not set. Queueing ICE candidate."
      );
      iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added successfully:", candidate);
    } catch (error) {
      console.error("[ERROR] Error adding ICE candidate:", error);
    }
  }

  // Procesar la cola después de establecer la descripción remota
  function processIceQueue() {
    while (iceCandidateQueue.length > 0) {
      const candidate = iceCandidateQueue.shift();
      addIceCandidate(candidate);
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
