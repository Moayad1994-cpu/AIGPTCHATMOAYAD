import os
import requests
from flask import Flask, render_template, request, jsonify, session
# from dotenv import load_dotenv # Uncomment if using .env file locally

# load_dotenv() # Uncomment if using .env file locally

app = Flask(__name__)
# IMPORTANT: Set a strong secret key for session management
# You can generate one using: import os; print(os.urandom(24))
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your_default_very_secret_key') # Use environment variable or a strong default

# --- Configuration ---
# !! SECURITY WARNING !!
# Get API key from environment variable. DO NOT HARDCODE YOUR KEY HERE.
# Set the MISTRAL_API_KEY environment variable in your system.
MISTRAL_API_KEY = os.environ.get("09dKiElPU9ZeKDDAFbkifaYEEIdigpJ3")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
# You might want to choose a specific model, e.g., "mistral-small-latest", "mistral-large-latest"
# Check Mistral AI documentation for available chat models
MISTRAL_MODEL = "mistral-small-latest" # Or choose another appropriate model

if not MISTRAL_API_KEY:
    print("Error: MISTRAL_API_KEY environment variable not set.")
    # You might want to exit or handle this more gracefully
    # For demonstration, we'll allow the app to run but API calls will fail.

@app.route('/')
def index():
    """Renders the main chat page."""
    # Initialize conversation history in session if it doesn't exist
    if 'conversation' not in session:
        session['conversation'] = []
        # You could add an initial system message here if needed
        # session['conversation'].append({"role": "system", "content": "You are a helpful AI assistant."})
    return render_template('index.html', conversation=session['conversation'])

@app.route('/chat', methods=['POST'])
def chat():
    """Handles incoming chat messages and interacts with Mistral API."""
    if not MISTRAL_API_KEY:
        return jsonify({"error": "API key not configured on the server."}), 500

    try:
        user_message = request.json.get('message')
        if not user_message:
            return jsonify({"error": "No message provided."}), 400

        # Retrieve conversation history from session
        conversation_history = session.get('conversation', [])

        # Add user message to history
        conversation_history.append({"role": "user", "content": user_message})

        # --- Prepare API Request ---
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "model": MISTRAL_MODEL,
            "messages": conversation_history,
            # Add other parameters like temperature, max_tokens if needed
            # "temperature": 0.7,
            # "max_tokens": 150
        }

        # --- Make API Call ---
        response = requests.post(MISTRAL_API_URL, headers=headers, json=payload)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        # --- Process API Response ---
        api_response = response.json()

        # Ensure the response structure is as expected
        if not api_response.get('choices') or not api_response['choices'][0].get('message') or not api_response['choices'][0]['message'].get('content'):
             print("Unexpected API response structure:", api_response)
             return jsonify({"error": "Received an unexpected response structure from the API."}), 500

        assistant_message = api_response['choices'][0]['message']['content']
        role = api_response['choices'][0]['message'].get('role', 'assistant') # Get role or default to assistant

        # Add assistant message to history
        conversation_history.append({"role": role, "content": assistant_message})

        # Update session
        session['conversation'] = conversation_history
        # Optional: Limit history size to prevent overly large sessions
        # MAX_HISTORY = 20 # Keep last 10 pairs (user+assistant)
        # if len(session['conversation']) > MAX_HISTORY:
        #     session['conversation'] = session['conversation'][-MAX_HISTORY:]

        return jsonify({"reply": assistant_message})

    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        # Provide more specific error messages based on status code if possible
        error_message = f"Failed to connect to the AI service. Please try again later. Error: {e}"
        if e.response is not None:
             try:
                error_detail = e.response.json().get('message', str(e))
                error_message = f"AI service error ({e.response.status_code}): {error_detail}"
             except ValueError: # Handle cases where response is not JSON
                error_message = f"AI service error ({e.response.status_code}): {e.response.text}"

        return jsonify({"error": error_message}), 502 # 502 Bad Gateway might be appropriate
    except Exception as e:
        print(f"Server Error: {e}")
        # Log the full exception traceback here for debugging
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred."}), 500

@app.route('/clear', methods=['POST'])
def clear_conversation():
    """Clears the conversation history from the session."""
    session.pop('conversation', None) # Remove the conversation key
    session['conversation'] = [] # Re-initialize empty list
    return jsonify({"status": "cleared"})


if __name__ == '__main__':
    # Set host='0.0.0.0' to make it accessible on your network
    app.run(debug=True, host='0.0.0.0', port=5000) # Use debug=False in production
