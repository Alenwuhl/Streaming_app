import {
  getStreamIDFromURL,
  getCSRFToken,
  updateButtonState,
} from "./utils.js";
import { startRecording } from "./stream_recorder.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing WebRTC for Host...");

  const urlPath = window.location.pathname;
  const match = urlPath.match(/(\d+)/);
  const streamID = match ? match[0] : null;

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
  const videoContainer = document.querySelector(".video-container");

  const screenShareButton = document.getElementById("shareScreenButton");

  sharedScreen.addEventListener("click", () => {
    if (isScreenSharing) {
      console.log("[INFO] Shared screen clicked. Swapping with local video.");
      swapVideos(sharedScreen, localVideo);
    }
  });

  localVideo.addEventListener("click", () => {
    if (isScreenSharing) {
      console.log("[INFO] Local video clicked. Swapping with shared screen.");
      swapVideos(localVideo, sharedScreen);
    }
  });

  async function initializeLocalStream() {
    try {
      console.log("[INFO] Accessing local media...");
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localVideo.srcObject = localStream;
      localVideo.classList.add("video-large");

      console.log("[DEBUG] Local stream tracks:", localStream.getTracks());

      localStream.getVideoTracks().forEach((track) => {
        console.log(
          "Track ID:",
          track.id,
          "Enabled:",
          track.enabled,
          "Ready State:",
          track.readyState
        );
      });
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      return localStream;
    } catch (error) {
      console.error("[ERROR] Error accessing media devices:", error);
      alert(
        "Could not access camera and microphone. Please check permissions."
      );
      return null;
    }
  }

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
      if (peerConnection && peerConnection.remoteDescription) {
        await addIceCandidate(message.data);
      } else {
        pendingICECandidates.push(message.data);
        console.log("[INFO] ICE candidate queued for later.");
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

  async function addIceCandidate(candidate) {
    console.log("[INFO] Adding ICE candidate:", candidate);
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added.");
    } catch (error) {
      console.error("[ERROR] Error adding ICE candidate:", error);
    }
  }

  async function setRemoteAnswer(answer) {
    try {
      console.log("[INFO] Setting remote answer.");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("[INFO] Remote answer set successfully.");

      for (const candidate of pendingICECandidates) {
        await addIceCandidate(candidate);
        console.log(
          "[DEBUG] ICE candidate added from queue, candidate: ",
          candidate
        );
      }
      pendingICECandidates = [];
      console.log("[INFO] ICE candidates added successfully.");
    } catch (error) {
      console.error("[ERROR] Error setting remote answer:", error);
    }
  }

  function createPeerConnection(localStream) {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
      console.log(`[DEBUG] Host added track: ${track.kind}, ID: ${track.id}`);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[INFO] Sending ICE candidate to viewer:", event.candidate);
        websocket.send(
          JSON.stringify({
            type: "ice",
            data: event.candidate,
          })
        );
      } else {
        console.log("[INFO] All ICE candidates have been sent.");
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `[INFO] ICE connection state changed: ${peerConnection.iceConnectionState}`
      );
      if (peerConnection.iceConnectionState === "connected") {
        console.log("[INFO] ICE connection established successfully.");
      }
    };

    console.log("[INFO] PeerConnection created successfully.");
  }

  async function startStreaming() {
    try {
      if (!localStream || !localStream.active) {
        console.error("Local stream is not active or undefined.");
        return;
      }
      console.log("[INFO] Starting streaming.");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("[DEBUG] Sending offer to viewer:", offer);
      websocket.send(JSON.stringify({ type: "offer", data: offer }));

      // Notify backend
      console.log("[INFO] Notifying backend that stream is live.");
      const response = await fetch(
        `/streamings/stream/start_live/${streamID}/`,
        {
          method: "POST",
          headers: {
            "X-CSRFToken": getCSRFToken(),
          },
        }
      );
      console.log(
        "[DEBUG] `/streamings/stream/start_live/${streamID}/`, The response of the fetch is:",
        response
      );

      if (response.ok) {
        console.log("[INFO] Stream is now live on backend.");
      } else {
        console.error("[ERROR] Failed to notify backend:", response.status);
      }
    } catch (error) {
      console.error("[ERROR] Error starting streaming:", error);
    }
  }

  async function stopStreaming() {
    console.log("[INFO] Stopping streaming...");
    try {
      if (peerConnection) {
        peerConnection.close();
        console.log("[INFO] PeerConnection closed.");
      }
      websocket.close();
      console.log("[INFO] WebSocket closed.");

      // Notify backend
      const response = await fetch(
        `/streamings/stream/stop_live/${streamID}/`,
        {
          method: "POST",
          headers: {
            "X-CSRFToken": getCSRFToken(),
          },
        }
      );
      if (response.ok) {
        console.log("[INFO] Stream stopped successfully on backend.");
      } else {
        console.error("[ERROR] Failed to notify backend:", response.status);
      }
    } catch (error) {
      console.error("[ERROR] Error stopping streaming:", error);
    }
  }

  window.WebRTC = {
    startStreaming,
    stopStreaming,
    streamID,
    peerConnection,
    websocket,
    isScreenSharing,
  };
});

// export {startStreaming, stopStreaming};
