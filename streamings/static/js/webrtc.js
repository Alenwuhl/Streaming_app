document.addEventListener('DOMContentLoaded', () => {
    const streamID = document.body.getAttribute('data-stream-id');
    const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
    
    const websocket = new WebSocket(websocketURL);
    let localStream;
    let peerConnection;
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };

    websocket.onopen = function() {
        console.log("WebSocket is connected");
    };

    websocket.onerror = function(error) {
        console.error("WebSocket error observed:", error);
    };

    websocket.onclose = function() {
        console.log("WebSocket is closed");
    };

    // Configuración de WebRTC
    async function startStreaming() {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;

        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                websocket.send(JSON.stringify({ 'candidate': event.candidate }));
            }
        };

        peerConnection.ontrack = event => {
            document.getElementById('remoteVideo').srcObject = event.streams[0];
        };
    }

    if (document.body.getAttribute('data-is-host') === "true") {
        startStreaming();
    }
});
