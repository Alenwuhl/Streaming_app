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

  // Button elements
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

  /**
   * Initialize local media stream
   */
  /**
   * Initialize local media stream
   */
  async function initializeLocalStream() {
    try {
      console.log("[INFO] Accessing local media...");
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!isScreenSharing) {
        // Solo asignar al localVideo si no se está compartiendo pantalla
        localVideo.srcObject = localStream;
        localVideo.classList.add("video-large");
      } else {
        localVideo.srcObject = localStream;
        localVideo.classList.add("video-small");
        console.warn(
          "[WARNING] Screen sharing is active. Skipping local video assignment."
        );
      }

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

  /**
   * Set the remote answer from the viewer
   * @param {RTCSessionDescriptionInit} answer
   */
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

  /**
   * Add ICE candidate
   * @param {RTCIceCandidateInit} candidate
   */
  async function addIceCandidate(candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added.");
    } catch (error) {
      console.error("[ERROR] Error adding ICE candidate:", error);
    }
  }

  /**
   * Create a PeerConnection and handle local stream tracks
   * @param {MediaStream} localStream
   */
  function createPeerConnection(localStream) {
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
  }

  /**
   * Start streaming by creating an offer
   */
  async function startStreaming() {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      websocket.send(JSON.stringify({ type: "offer", data: offer }));
    } catch (error) {
      console.error("[ERROR] Error starting streaming:", error);
    }
  }

  /**
   * Start screen sharing
   */
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

      // Add screen track to PeerConnection
      screenSender = peerConnection.addTrack(screenTrack, screenStream);

      // Set shared screen source and update UI
      sharedScreen.srcObject = screenStream;
      sharedScreen.classList.remove("d-none");

      // Swap shared screen to main position
      // swapVideos(sharedScreen, localVideo);

      // Handle when screen sharing stops
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

  /**
   * Stop screen sharing
   */
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

    // Hide shared screen and revert to camera
    sharedScreen.classList.add("d-none");
    sharedScreen.srcObject = null;

    // Swap back to local video as main
    swapVideos(localVideo, sharedScreen);

    websocket.send(JSON.stringify({ type: "screen-sharing", data: false }));
    isScreenSharing = false;
    console.log("[INFO] Screen sharing stopped.");
  }

  /**
   * Swap the sizes and positions of the main video and small video
   * @param {HTMLElement} mainVideo - The main video element (to be enlarged)
   * @param {HTMLElement} smallVideo - The small video element (to be minimized)
   */
  function swapVideos(mainVideo, smallVideo) {
    if (!mainVideo || !smallVideo || !videoContainer) {
      console.error("[ERROR] Videos or container not found.");
      return;
    }

    console.log("[DEBUG] Swapping videos in the DOM...");

    // Actualizar las clases de los videos
    mainVideo.classList.remove("video-small");
    mainVideo.classList.add("video-large");

    smallVideo.classList.remove("video-large");
    smallVideo.classList.add("video-small");

    console.log("[DEBUG] Main Video Classes after swap:", mainVideo.classList);
    console.log(
      "[DEBUG] Small Video Classes after swap:",
      smallVideo.classList
    );

    // Reasignar estilos para mantener posiciones visuales
    mainVideo.style.zIndex = "2"; // Asegurar que esté al frente
    smallVideo.style.zIndex = "1"; // Asegurar que esté detrás

    console.log("[INFO] Video swap completed successfully.");
  }

  /**
   * Initialize the screen share button functionality
   */
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

  /**
   * Update button state for screen sharing
   * @param {HTMLElement} button
   * @param {boolean} isActive
   */
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
