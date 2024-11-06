document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const messageSubmit = document.getElementById('chat-message-submit');
    const username = document.getElementById('username').value;
    const streamId = document.getElementById('stream-id').value;

    // WebSocket connection
    const chatSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/chat/' + streamId + '/'
    );

    // Send message when submit button is clicked
    messageSubmit.addEventListener('click', () => {
        const message = messageInput.value;
        if (message) {
            chatSocket.send(JSON.stringify({
                'message': message,
                'username': username,
                'stream_id': streamId
            }));
            messageInput.value = '';  // Clear the input field

            // Hide the "No messages yet" text if it exists
            const noMessagesText = document.getElementById('no-messages');
            if (noMessagesText) {
                noMessagesText.style.display = 'none';
            }
        }
    });

    // Receive messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.innerHTML = `<strong>${data.username}</strong>: ${data.message}`;

        // Append new message and scroll to the bottom of the chat box
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };
});
