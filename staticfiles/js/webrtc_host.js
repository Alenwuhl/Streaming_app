// webrtc_host.js
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
  let isStreaming = false;
  let isScreenSharing = false;
  let localStream = null;
  let screenStream = null;
  let screenSender = null;

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const localVideo = document.getElementById("localVideo");
  const sharedScreen = document.getElementById("sharedScreen");
  const videoContainer = document.querySelector(".video-container");

  async function initializeLocalStream() {
    try {
      console.log("[INFO] Accessing local media...");
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideo.srcObject = localStream;
      localVideo.classList.add("video-large");
      return localStream;
    } catch (error) {
      console.error("[ERROR] Error accessing media devices:", error);
      alert("Could not access camera and microphone. Please check permissions.");
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
      console.log("[DEBUG] Received ICE candidate from viewer.");
      if (peerConnection && peerConnection.remoteDescription) {
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

  async function setRemoteAnswer(answer) {
    try {
      console.log("[INFO] Setting remote answer.");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("[INFO] Remote answer set successfully.");

      for (const candidate of pendingICECandidates) {
        await addIceCandidate(candidate);
      }
      pendingICECandidates = [];
    } catch (error) {
      console.error("[ERROR] Error setting remote answer:", error);
    }
  }

  async function addIceCandidate(candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added.");
    } catch (error) {
      console.error("[ERROR] Error adding ICE candidate:", error);
    }
  }

  function createPeerConnection(localStream) {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
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
  }

  async function startStreaming() {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      websocket.send(JSON.stringify({ type: "offer", data: offer }));
    } catch (error) {
      console.error("[ERROR] Error starting streaming:", error);
    }
  }

  const screenShareButton = document.getElementById("shareScreenButton");
  if (screenShareButton) {
    screenShareButton.addEventListener("click", async () => {
      if (isScreenSharing) {
        stopScreenShare();
        updateButtonState(screenShareButton, false);
      } else {
        const success = await startScreenShare();
        if (success) {
          updateButtonState(screenShareButton, true);
        }
      }
    });
  } else {
    console.error("[ERROR] Share Screen button not found.");
  }

  async function startScreenShare() {
    try {
      console.log("[INFO] Attempting to start screen sharing...");
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      if (!screenStream) {
        console.error("[ERROR] Screen stream is null or undefined.");
        alert("Failed to capture screen. Please try again.");
        return false;
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      console.log("[INFO] Screen sharing started. Track:", screenTrack);

      screenSender = peerConnection.addTrack(screenTrack, screenStream);

      // Set shared screen source
      sharedScreen.srcObject = screenStream;
      sharedScreen.classList.remove("d-none");

      // Swap videos in the DOM
      swapVideos(sharedScreen, localVideo);

      screenTrack.onended = () => {
        console.log("[INFO] Screen sharing stopped by user.");
        stopScreenShare();
      };

      websocket.send(JSON.stringify({ type: "screen-sharing", data: true }));
      isScreenSharing = true;
      return true;
    } catch (error) {
      console.error("[ERROR] Failed to share screen:", error);
      alert("Could not start screen sharing. Please check permissions.");
      return false;
    }
  }

  function stopScreenShare() {
    console.log("[INFO] Stopping screen sharing...");

    if (screenSender) {
      peerConnection.removeTrack(screenSender);
      screenSender = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      screenStream = null;
    }

    sharedScreen.classList.add("d-none");
    sharedScreen.srcObject = null;

    // Revert videos in the DOM
    swapVideos(localVideo, sharedScreen);

    websocket.send(JSON.stringify({ type: "screen-sharing", data: false }));
    isScreenSharing = false;
    console.log("[INFO] Screen sharing stopped.");
  }

  function swapVideos(mainVideo, smallVideo) {
    if (!mainVideo || !smallVideo || !videoContainer) {
      console.error("[ERROR] Videos or container not found.");
      return;
    }

    console.log("[DEBUG] Swapping videos in the DOM...");

    if (mainVideo.parentNode === videoContainer) {
      videoContainer.insertBefore(smallVideo, mainVideo);
    } else {
      videoContainer.appendChild(mainVideo);
    }

    // mainVideo.classList.add("video-large");
    // mainVideo.classList.remove("video-small");

    // smallVideo.classList.add("video-small");
    // smallVideo.classList.remove("video-large");
  }

  function updateButtonState(button, isActive) {
    if (!button) return;

    if (isActive) {
      button.classList.replace("btn-outline-warning", "btn-warning");
      button.innerHTML = '<i class="fas fa-stop"></i> Stop Sharing';
    } else {
      button.classList.replace("btn-warning", "btn-outline-warning");
      button.innerHTML = '<i class="fas fa-desktop"></i> Share Screen';
    }
  }
});
