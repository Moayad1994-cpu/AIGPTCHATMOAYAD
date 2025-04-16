from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

API_KEY = "09dKiElPU9ZeKDDAFbkifaYEEIdigpJ3"
API_URL = "https://api.mistralai.com/v1/chat"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send_message', methods=['POST'])
def send_message():
    user_message = request.json.get('message')
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'messages': [{'role': 'user', 'content': user_message}]
    }
    response = requests.post(API_URL, headers=headers, json=data)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({'error': 'Failed to get response from API'}), 500

if __name__ == '__main__':
    app.run(debug=True)