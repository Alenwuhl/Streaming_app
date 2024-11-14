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
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // Inicializar el stream local
  async function initializeLocalStream() {
    try {
      console.log("[INFO] Accessing local media...");
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      document.getElementById("localVideo").srcObject = localStream;
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
    const localStream = await initializeLocalStream();
    if (localStream) {
      createPeerConnection(localStream);
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
      if (
        !peerConnection.remoteDescription ||
        peerConnection.signalingState !== "stable"
      ) {
        pendingICECandidates.push(candidate);
        return;
      }
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[DEBUG] ICE candidate added successfully.");
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

  // Botón para iniciar/finalizar el streaming
  const startEndButton = document.getElementById("startEndStreamingButton");

  if (startEndButton) {
    startEndButton.addEventListener("click", async () => {
      startEndButton.disabled = true; // Deshabilitar el botón temporalmente
      const streamId = startEndButton.getAttribute("data-stream-id");

      if (!isStreaming) {
        const result = await startStreamLive(streamId);
        if (result) {
          isStreaming = true;
          updateButtonState();
        }
      } else {
        const result = await endStreamLive(streamId);
        if (result) {
          isStreaming = false;
          updateButtonState();
        }
      }

      startEndButton.disabled = false; // Rehabilitar el botón
    });
  }

  function updateButtonState() {
    if (isStreaming) {
      startEndButton.classList.replace("btn-success", "btn-danger");
      startEndButton.innerHTML = '<i class="fas fa-video"></i> End Streaming';
    } else {
      startEndButton.classList.replace("btn-danger", "btn-success");
      startEndButton.innerHTML = '<i class="fas fa-video"></i> Start Streaming';
    }
  }

  async function startStreamLive(streamId) {
    try {
      const response = await fetch(
        `/streamings/stream/start_live/${streamId}/`,
        {
          method: "POST",
          headers: {
            "X-CSRFToken": getCSRFToken(),
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error("[ERROR] Error starting stream:", error);
      return false;
    }
  }

  // Finalizar stream en el backend
  // Finalizar stream en el backend
  // Finalizar stream en el backend
  async function endStreamLive(streamId) {
    streamId = streamId || document.body.getAttribute("data-stream-id");

    if (!streamId) {
      console.error("[ERROR] Stream ID not found. Cannot end stream.");
      return false;
    }

    const url = `/streamings/stream/end/${streamId}/`;
    console.log(`[DEBUG] Sending end stream request to: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCSRFToken(),
          "Content-Type": "application/json",
        },
      });

      // Verificar si la respuesta es JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(
          "[ERROR] Server response is not JSON. Possible HTML error page."
        );
        alert(
          "An unexpected error occurred while ending the stream. Please try again."
        );
        window.location.href = "/streamings/";
        return false;
      }

      const data = await response.json();
      if (data.status === "success") {
        console.log("[INFO] Stream has ended successfully.");
        window.location.href = "/streamings/";
        return true;
      } else {
        console.error("[ERROR] Failed to end stream:", data.message);
        alert(
          "Failed to end the stream. Please check the console for more details."
        );
        return false;
      }
    } catch (error) {
      console.error("[ERROR] Error sending end stream request:", error);
      alert("An error occurred while trying to end the stream.");
      window.location.href = "/streamings/";
      return false;
    }
  }
});
