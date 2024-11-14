document.addEventListener('DOMContentLoaded', () => {
    console.log("[DEBUG] chat.js loaded");

    const container = document.querySelector(".container-fluid.d-flex.align-items-center.flex-column");

    if (!container) {
        console.error("[ERROR] No se encontró el contenedor esperado.");
        return;
    }

    const username = window.username || container?.getAttribute("data-username");
    const streamId = window.streamId || container?.getAttribute("data-stream-id");


    console.log(`[DEBUG] Username obtenido: ${username}`);
    console.log(`[DEBUG] Stream ID obtenido: ${streamId}`);
    
    if (!username || !streamId) {
        console.error("[ERROR] No se pudieron obtener 'username' o 'stream-id' desde los atributos data-.");
        return;
    }
    
    console.log(`[DEBUG] Username: ${username}, Stream ID: ${streamId}`);

    const chatBox = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const messageSubmit = document.getElementById('chat-message-submit');

    // Conexión WebSocket
    const chatSocket = new WebSocket(`ws://${window.location.host}/ws/chat/${streamId}/`);

    messageSubmit.addEventListener('click', () => {
        const message = messageInput.value;
        if (message) {
            chatSocket.send(JSON.stringify({
                'message': message,
                'username': username,
                'stream_id': streamId
            }));
            messageInput.value = '';

            const noMessagesText = document.getElementById('no-messages');
            if (noMessagesText) {
                noMessagesText.style.display = 'none';
            }
        }
    });

    chatSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${data.username}</strong>: ${data.message}`;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    chatSocket.onerror = (error) => {
        console.error("[ERROR] WebSocket encountered an error:", error);
    };

    chatSocket.onclose = (e) => {
        console.warn("[WARNING] WebSocket closed unexpectedly:", e);
    };
});
