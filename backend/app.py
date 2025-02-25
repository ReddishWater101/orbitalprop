from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend server is running correctly',
        'timestamp': datetime.now().isoformat()
    })

# Serve a static HTML page directly from Flask
@app.route('/', methods=['GET'])
def index():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple App</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #121212;
                color: white;
            }
            .container {
                max-width: 600px;
                padding: 20px;
                background-color: #1e1e1e;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
            }
            .card {
                padding: 15px;
                background-color: #2d2d2d;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            .success {
                color: #4caf50;
                font-weight: bold;
            }
            button {
                background-color: #00b0ff;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            button:hover {
                background-color: #0091ea;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Simple App</h1>
            </div>
            <div class="card" id="status-card">
                <h3>Backend Status</h3>
                <div id="status">Checking connection...</div>
            </div>
            <button onclick="checkHealth()">Refresh Status</button>
        </div>

        <script>
            // Function to check the health of the backend
            function checkHealth() {
                document.getElementById('status').innerHTML = 'Checking connection...';
                
                fetch('/api/health')
                    .then(response => response.json())
                    .then(data => {
                        const statusElement = document.getElementById('status');
                        statusElement.innerHTML = `
                            <p class="success">Connected to backend successfully!</p>
                            <p>Status: ${data.status}</p>
                            <p>Message: ${data.message}</p>
                            <p style="color: #888;">Timestamp: ${new Date(data.timestamp).toLocaleString()}</p>
                        `;
                    })
                    .catch(error => {
                        document.getElementById('status').innerHTML = `
                            <p style="color: #f44336;">Error connecting to the backend</p>
                            <p>${error.message}</p>
                        `;
                    });
            }

            // Check health when page loads
            window.onload = checkHealth;
        </script>
    </body>
    </html>
    """

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask server on port {port}...")
    print(f"Open http://localhost:{port} in your browser to view the application")
    app.run(host='0.0.0.0', port=port, debug=True) 