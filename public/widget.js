document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // These would be passed in via the script tag or URL params
    const WIDGET_ID = 'widget-123'; 
    const CONVERSATION_ID = `conv-${Date.now()}`;

    // Establish WebSocket connection
    const socket = new WebSocket(`wss://${window.location.host}/api/chat/${CONVERSATION_ID}`);

    socket.onopen = () => {
        console.log('WebSocket connection established.');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'token') {
            let lastMessage = chatMessages.lastElementChild;
            if (!lastMessage || lastMessage.dataset.sender !== 'ai') {
                lastMessage = document.createElement('div');
                lastMessage.className = 'message-bubble ai';
                lastMessage.dataset.sender = 'ai';
                chatMessages.appendChild(lastMessage);
            }
            lastMessage.textContent += data.content;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else if (data.type === 'error') {
            // Handle error display
        }
    };

    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message) {
            // Display user message immediately
            const userMessageElem = document.createElement('div');
            userMessageElem.className = 'message-bubble user';
            userMessageElem.textContent = message;
            chatMessages.appendChild(userMessageElem);

            // Send message over WebSocket
            socket.send(JSON.stringify({
                widgetId: WIDGET_ID,
                conversationId: CONVERSATION_ID,
                message: message,
            }));
            
            chatInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
