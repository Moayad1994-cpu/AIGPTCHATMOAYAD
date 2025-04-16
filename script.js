document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessageToChatBox('user', message);
            userInput.value = '';
            fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            })
            .then(response => response.json())
            .then(data => {
                if (data.choices && data.choices.length > 0) {
                    addMessageToChatBox('bot', data.choices[0].message.content);
                } else {
                    addMessageToChatBox('bot', 'Sorry, I could not understand that.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                addMessageToChatBox('bot', 'Sorry, something went wrong.');
            });
        }
    }

    function addMessageToChatBox(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Light and Dark Mode Toggle
    const modeToggle = document.createElement('button');
    modeToggle.textContent = 'Toggle Dark Mode';
    modeToggle.style.position = 'fixed';
    modeToggle.style.top = '10px';
    modeToggle.style.right = '10px';
    modeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });
    document.body.appendChild(modeToggle);
});