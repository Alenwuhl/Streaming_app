document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing WebRTC...');

    const streamID = document.body.getAttribute('data-stream-id');
    const websocketURL = `ws://${window.location.host}/ws/stream/${streamID}/`;
    const websocket = new WebSocket(websocketURL);

    let peerConnection = null;
    let pendingICECandidates = [];
    let remoteDescriptionSet = false;
    let isReadyToStream = false;
    const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    websocket.onopen = () => {
        console.log("WebSocket is connected");
    
        const isHost = document.body.getAttribute('data-is-host') === "true";
    
        if (isHost) {
            console.log("Starting as host. Waiting for viewer to be ready...");
            initializeLocalStream();  // Asegura el video local de inmediato para el host
        } else {
            console.log("Starting as viewer.");
            websocket.send(JSON.stringify({ type: 'ready' }));
        }
    };
    

    websocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);

        if (message.type === 'ready') {
            if (document.body.getAttribute('data-is-host') === "true") {
                console.log("Viewer is ready, starting streaming.");
                isReadyToStream = true;
                await startStreaming(); 
            }
        } else if (message.type === 'offer' && !peerConnection) {
            console.log("Received offer, initializing peer connection as viewer.");
            await setupViewerPeerConnection(message.data);
        } else if (message.type === 'answer' && peerConnection) {
            console.log("Received answer, setting remote answer on host.");
            await setRemoteAnswer(message.data);
        } else if (message.type === 'ice') {
            console.log("Received ICE candidate:", message.data);
            if (peerConnection && remoteDescriptionSet) {
                await addIceCandidate(message.data);
            } else {
                pendingICECandidates.push(message.data);
            }
        }
    };

    async function initializeLocalStream() {
        try {
            console.log("Accessing local media...");
            const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('localVideo').srcObject = localStream;
            console.log("Local video stream set.");
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }

    async function startStreaming() {
        if (!isReadyToStream) {
            console.log("Waiting for viewer to be ready...");
            return;
        }
        try {
            console.log("Creating peer connection for streaming.");
            peerConnection = createPeerConnection();

            const localStream = document.getElementById('localVideo').srcObject;
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log("Host created offer and set as local description:", offer);

            websocket.send(JSON.stringify({ type: 'offer', data: offer }));
            console.log("Offer sent by host.");
        } catch (error) {
            console.error("Error starting streaming:", error);
        }
    }

    async function setupViewerPeerConnection(offer) {
        console.log("Setting up viewer peer connection...");
        peerConnection = createPeerConnection();
    
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Remote description set on viewer.");
    
        for (const candidate of pendingICECandidates) {
            await addIceCandidate(candidate);
        }
        pendingICECandidates = [];
    
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Pausa para asegurar sincronización
        setTimeout(() => {
            websocket.send(JSON.stringify({ type: 'answer', data: answer }));
            console.log("Answer sent by viewer.");
        }, 200);
    }
    

    async function setRemoteAnswer(answer) {
        try {
            // Solo procesar la respuesta si el signalingState es `have-local-offer`
            if (peerConnection.signalingState === "have-local-offer") {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log("Remote answer set on host.");
                
                // Procesa candidatos ICE pendientes
                for (const candidate of pendingICECandidates) {
                    await addIceCandidate(candidate);
                }
                pendingICECandidates = [];
            } else {
                console.warn("Skipping remote answer; signaling state:", peerConnection.signalingState);
            }
        } catch (error) {
            console.error("Error setting remote answer:", error);
        }
    }    

    async function addIceCandidate(candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("ICE candidate added.");
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    }

    function createPeerConnection() {
        const pc = new RTCPeerConnection(configuration);
        console.log("Creating new RTCPeerConnection.");

        pc.onicecandidate = event => {
            if (event.candidate) {
                websocket.send(JSON.stringify({ type: 'ice', data: event.candidate }));
                console.log("Sent ICE candidate:", event.candidate);
            }
        };

        pc.ontrack = event => {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && !remoteVideo.srcObject) {
                remoteVideo.srcObject = event.streams[0];
                console.log("Remote track assigned to video element.");
            }
        };

        return pc;
    }
});
//version13