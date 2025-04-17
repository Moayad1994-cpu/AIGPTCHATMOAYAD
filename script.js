document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const clearChatButton = document.getElementById('clear-chat-button');
    const body = document.body;
    const themeIcon = themeToggleButton.querySelector('i');

    let typingIndicator = null;

    // --- Theme Handling ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    };

    const toggleTheme = () => {
        const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('chatTheme', newTheme);
        applyTheme(newTheme);
    };

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('chatTheme') || 'light';
    applyTheme(savedTheme);

    themeToggleButton.addEventListener('click', toggleTheme);

    // --- Chat Functionality ---

    const scrollToBottom = () => {
        // Use setTimeout to ensure DOM update is complete before scrolling
        setTimeout(() => {
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 0);
    };

    const displayMessage = (content, sender) => {
        removeTypingIndicator(); // Remove indicator when a new message arrives

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`); // 'user-message' or 'assistant-message' or 'error-message'

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = content.replace(/\n/g, '<br>'); // Render newlines correctly

        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
    };

    const showTypingIndicator = () => {
        if (typingIndicator) return; // Don't add multiple indicators
        typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'assistant-message', 'typing-indicator');
        typingIndicator.innerHTML = `<div class="message-content">AI is thinking...</div>`;
        chatBox.appendChild(typingIndicator);
        scrollToBottom();
    };

    const removeTypingIndicator = () => {
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
            typingIndicator = null;
        }
    };

    const sendMessage = async () => {
        const messageText = userInput.value.trim();
        if (!messageText) return; // Don't send empty messages

        // Display user message immediately
        displayMessage(messageText, 'user');

        // Clear input and reset height
        userInput.value = '';
        autoResizeTextarea(); // Reset height after clearing

        // Show typing indicator
        showTypingIndicator();
        sendButton.disabled = true; // Disable button while processing


        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            removeTypingIndicator(); // Remove indicator once response starts coming
            sendButton.disabled = false; // Re-enable button

            if (!response.ok) {
                 // Try to parse error message from server response
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg; // Use server's error if available
                } catch (e) {
                    // If response is not JSON, use the status text
                    console.error("Failed to parse error response:", e);
                }
                console.error("Chat request failed:", errorMsg);
                displayMessage(`Sorry, something went wrong: ${errorMsg}`, 'error'); // Display error in chat
                return; // Stop processing on error
            }

            const data = await response.json();

            if (data.reply) {
                displayMessage(data.reply, 'assistant');
            } else if (data.error) {
                // Handle specific errors returned in the JSON body even with a 200 OK (though Flask should use status codes)
                console.error("Chat API returned an error:", data.error);
                 displayMessage(`Sorry, an error occurred: ${data.error}`, 'error');
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
             removeTypingIndicator(); // Ensure indicator is removed on network error
             sendButton.disabled = false; // Re-enable button
             displayMessage(`Network error: Could not reach the server. Please check your connection.`, 'error');
        } finally {
             userInput.focus(); // Keep focus on input
        }
    };

    const clearConversation = async () => {
        if (!confirm("Are you sure you want to clear the entire conversation?")) {
            return;
        }
        try {
            const response = await fetch('/clear', { method: 'POST' });
            if (response.ok) {
                // Clear messages from the frontend
                chatBox.innerHTML = '';
                 // Add back the initial greeting message
                 const initialMessageDiv = document.createElement('div');
                 initialMessageDiv.classList.add('message', 'assistant-message', 'initial-message');
                 initialMessageDiv.innerHTML = `<div class="message-content">Hello! How can I help you today?</div>`;
                 chatBox.appendChild(initialMessageDiv);

                console.log("Conversation cleared.");
            } else {
                 alert("Failed to clear conversation on the server.");
            }
        } catch (error) {
            console.error('Error clearing conversation:', error);
            alert("An error occurred while trying to clear the conversation.");
        }
    }

    // --- Input Handling ---

    const autoResizeTextarea = () => {
        // Temporarily reset height to calculate scrollHeight accurately
        userInput.style.height = 'auto';
        // Set the height to the scroll height, but not exceeding max-height defined in CSS
        userInput.style.height = `${userInput.scrollHeight}px`;
    };

    userInput.addEventListener('input', autoResizeTextarea);

    userInput.addEventListener('keydown', (event) => {
        // Send message on Enter key, but allow Shift+Enter for newlines
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline insertion
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);
    clearChatButton.addEventListener('click', clearConversation);


    // Initial setup
    scrollToBottom(); // Scroll to bottom on page load (if there are pre-loaded messages)
    autoResizeTextarea(); // Adjust textarea size initially in case of pre-filled content (unlikely here)
    userInput.focus(); // Focus the input field on load
});
