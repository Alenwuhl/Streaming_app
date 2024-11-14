// webrtc_viewer.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("[INFO] Initializing WebRTC for Viewer...");

    // Obtener el streamID desde la URL
    const urlParts = window.location.pathname.split("/");
    const streamID = urlParts[urlParts.length - 2]; // Asumiendo que la URL es /streamings/watch/<streamID>/
    console.log(`[DEBUG] Stream ID obtained from URL: ${streamID}`);

    if (!streamID) {
        console.error("[ERROR] Stream ID not found. Cannot proceed with WebRTC initialization.");
        return;
    }

    const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
    console.log(`[INFO] WebSocket URL: ${websocketURL}`);
    const websocket = new WebSocket(websocketURL);

    let peerConnection = null;
    let pendingICECandidates = [];
    let remoteDescriptionSet = false;
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
        }
    };

    async function setupViewerPeerConnection(offer) {
        try {
            console.log("[INFO] Creating viewer peer connection.");
            peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    websocket.send(JSON.stringify({ type: "ice", data: event.candidate }));
                    console.log("[DEBUG] Sent ICE candidate:", event.candidate);
                }
            };

            peerConnection.ontrack = event => {
                const remoteVideo = document.getElementById("remoteVideo");
                if (remoteVideo && !remoteVideo.srcObject) {
                    remoteVideo.srcObject = event.streams[0];
                    console.log("[INFO] Remote track assigned to video element.");
                }
            };

            console.log("[INFO] Setting remote offer as description.");
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

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
});
// version_viewer_2
