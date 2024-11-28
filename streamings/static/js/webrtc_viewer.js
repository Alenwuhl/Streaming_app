// webrtc_viewer.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("[INFO] Initializing WebRTC for Viewer...");

  // Obtener el streamID desde la URL
  const urlParts = window.location.pathname.split("/");
  const streamID = urlParts[urlParts.length - 2]; // Asumiendo que la URL es /streamings/watch/<streamID>/
  console.log(`[DEBUG] Stream ID obtained from URL: ${streamID}`);

  if (!streamID) {
    console.error(
      "[ERROR] Stream ID not found. Cannot proceed with WebRTC initialization."
    );
    return;
  }

  const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
  console.log(`[INFO] WebSocket URL: ${websocketURL}`);
  const websocket = new WebSocket(websocketURL);

  let peerConnection = null;
  let pendingICECandidates = [];
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const hostVideo = document.getElementById("hostVideo");
  const sharedScreen = document.getElementById("sharedScreen");

  websocket.onopen = () => {
    console.log("[INFO] WebSocket is connected as Viewer.");
    websocket.send(JSON.stringify({ type: "ready" }));
  };

  websocket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("[DEBUG] Received message:", message);

    if (message.type === "offer") {
      console.log("[INFO] Received offer, setting up viewer connection.");
      await setupViewerPeerConnection(message.data);
    } else if (message.type === "ice" && peerConnection) {
      console.log("[DEBUG] Received ICE candidate.");
      await addIceCandidate(message.data);
    } else if (message.type === "screen-sharing") {
      console.log("[INFO] Screen sharing state changed:", message.data);
      adjustScreenShareView(message.data);
    }
  };

  /**
   * Configure PeerConnection for the viewer
   * @param {RTCSessionDescriptionInit} offer
   */
  async function setupViewerPeerConnection(offer) {
    try {
      console.log("[INFO] Creating viewer peer connection.");
      peerConnection = new RTCPeerConnection(configuration);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          websocket.send(
            JSON.stringify({ type: "ice", data: event.candidate })
          );
          console.log("[DEBUG] Sent ICE candidate:", event.candidate);
        }
      };

      peerConnection.ontrack = (event) => {
        const hostVideo = document.getElementById("hostVideo");
        const sharedScreen = document.getElementById("sharedScreen");

        if (!hostVideo || !sharedScreen) {
          console.error("[ERROR] Video elements not found in the DOM.");
          return;
        }

        // Asignar las pistas al video correcto
        if (event.track.kind === "video") {
          if (!sharedScreen.srcObject) {
            sharedScreen.srcObject = event.streams[0];
            console.log("[INFO] Screen sharing track assigned.");
          } else if (!hostVideo.srcObject) {
            hostVideo.srcObject = event.streams[0];
            console.log("[INFO] Host video track assigned.");
          }
        }
      };

      console.log("[INFO] Setting remote offer as description.");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log("[INFO] Sending answer to host.");
      websocket.send(JSON.stringify({ type: "answer", data: answer }));
    } catch (error) {
      console.error("[ERROR] Error setting up viewer connection:", error);
    }
  }

  /**
   * Handle remote track events from the host
   * @param {RTCTrackEvent} event
   */
  function handleRemoteTrack(event) {
    if (event.track.kind === "video") {
      if (!hostVideo.srcObject) {
        console.log("[INFO] Assigning host video stream.");
        hostVideo.srcObject = event.streams[0];
      } else if (!sharedScreen.srcObject) {
        console.log("[INFO] Assigning screen sharing stream.");
        sharedScreen.srcObject = event.streams[0];
      } else {
        console.warn("[WARNING] Extra video track received. Ignoring.");
      }
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
   * Adjust the view based on screen sharing state
   * @param {boolean} isScreenSharingActive
   */
  function adjustScreenShareView(isScreenSharingActive) {
    const hostVideo = document.getElementById("hostVideo");
    const sharedScreen = document.getElementById("sharedScreen");

    if (!hostVideo || !sharedScreen) {
      console.error("[ERROR] Video elements not found in the DOM.");
      return;
    }

    if (isScreenSharingActive) {
      console.log("[INFO] Switching to screen sharing view.");
      switchVideoSizes(sharedScreen, hostVideo);
      hostVideo.classList.add("d-none");
      sharedScreen.classList.remove("d-none");
    } else {
      console.log("[INFO] Returning to host video view.");
      switchVideoSizes(hostVideo, sharedScreen);
      sharedScreen.classList.add("d-none");
      hostVideo.classList.remove("d-none");
    }
  }

  /**
   * Switch the sizes of the main video and small video
   * @param {HTMLElement} mainVideo - The main video element
   * @param {HTMLElement} smallVideo - The small video element
   */
  function switchVideoSizes(mainVideo, smallVideo) {
    if (!mainVideo || !smallVideo) return;

    console.log("[DEBUG] Switching video sizes.");
    mainVideo.classList.add("video-large");
    mainVideo.classList.remove("video-small");

    smallVideo.classList.add("video-small");
    smallVideo.classList.remove("video-large");
  }
});
