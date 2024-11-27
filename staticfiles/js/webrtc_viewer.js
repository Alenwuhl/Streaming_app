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
    } else if (message.type === "screen_share_started") {
      console.log("[INFO] Screen sharing started notification received.");
      adjustScreenShareView(true);
    } else if (message.type === "screen_share_stopped") {
      console.log("[INFO] Screen sharing stopped notification received.");
      adjustScreenShareView(false);
    }
  };

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

        // Asignar las pistas de video adecuadas
        if (!hostVideo.srcObject && event.track.kind === "video") {
          hostVideo.srcObject = event.streams[0];
          console.log("[INFO] Host video track assigned.");
        } else if (!sharedScreen.srcObject && event.track.kind === "video") {
          sharedScreen.srcObject = event.streams[0];
          console.log("[INFO] Screen sharing track assigned.");
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

  async function addIceCandidate(candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[INFO] ICE candidate added.");
    } catch (error) {
      console.error("[ERROR] Error adding ICE candidate:", error);
    }
  }

  // Alternar entre videos grandes y pequeños
  const hostVideo = document.getElementById("hostVideo");
  const sharedScreen = document.getElementById("sharedScreen");

  hostVideo.addEventListener("click", () => {
    switchVideoSizes(sharedScreen, hostVideo);
  });

  sharedScreen.addEventListener("click", () => {
    switchVideoSizes(hostVideo, sharedScreen);
  });

  function switchVideoSizes(mainVideo, smallVideo) {
    if (!mainVideo || !smallVideo) return;

    console.log("[DEBUG] Switching video sizes.");
    mainVideo.classList.add("video-large");
    mainVideo.classList.remove("video-small");

    smallVideo.classList.add("video-small");
    smallVideo.classList.remove("video-large");
  }

  function adjustScreenShareView(isScreenSharingActive) {
    const hostVideoContainer = document.getElementById("hostVideo");
    const sharedScreenContainer = document.getElementById("sharedScreen");

    if (!hostVideoContainer || !sharedScreenContainer) {
      console.error("[ERROR] Video containers not found in the DOM.");
      return;
    }

    if (isScreenSharingActive) {
      console.log("[INFO] Adjusting view for screen sharing.");
      switchVideoSizes(sharedScreenContainer, hostVideoContainer);
    } else {
      console.log("[INFO] Adjusting view to show only host video.");
      switchVideoSizes(hostVideoContainer, sharedScreenContainer);
      sharedScreenContainer.srcObject = null;
    }
  }
});
