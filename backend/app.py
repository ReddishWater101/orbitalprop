from flask import Flask, jsonify, send_from_directory, request, render_template_string
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory storage for satellites
satellites = []

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend server is running correctly',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/satellites', methods=['GET'])
def get_satellites():
    """Get all satellites"""
    return jsonify(satellites)

@app.route('/api/satellites', methods=['POST'])
def create_satellite():
    """Create a new satellite"""
    data = request.json
    
    # Validate required fields
    if not data or 'name' not in data or 'tle' not in data:
        return jsonify({'error': 'Name and TLE data are required'}), 400
    
    # Create satellite object
    satellite = {
        'id': len(satellites) + 1,
        'name': data['name'],
        'tle': data['tle'],
        'created_at': datetime.now().isoformat()
    }
    
    # Add to satellites list
    satellites.append(satellite)
    
    return jsonify(satellite), 201

@app.route('/api/satellites/<int:satellite_id>', methods=['DELETE'])
def delete_satellite(satellite_id):
    """Delete a satellite by ID"""
    global satellites
    
    # Find the satellite by ID
    satellite_index = None
    for index, satellite in enumerate(satellites):
        if satellite['id'] == satellite_id:
            satellite_index = index
            break
    
    # If satellite found, remove it
    if satellite_index is not None:
        removed_satellite = satellites.pop(satellite_index)
        return jsonify({
            'message': f"Satellite '{removed_satellite['name']}' deleted successfully",
            'deleted': removed_satellite
        })
    else:
        return jsonify({'error': f"Satellite with ID {satellite_id} not found"}), 404

# HTML template for the main page
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Orbital Propagation App</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #121212;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .card {
            background-color: #1e1e1e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .success {
            color: #4caf50;
            font-weight: bold;
        }
        .error {
            color: #f44336;
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
            margin-top: 10px;
        }
        button:hover {
            background-color: #0091ea;
        }
        input, textarea {
            width: 100%;
            padding: 10px;
            margin: 8px 0;
            box-sizing: border-box;
            border-radius: 4px;
            border: 1px solid #555;
            background-color: #2d2d2d;
            color: white;
        }
        label {
            margin-top: 10px;
            display: block;
            font-weight: bold;
        }
        .satellite-list {
            list-style-type: none;
            padding: 0;
        }
        .satellite-item {
            padding: 10px;
            border-bottom: 1px solid #333;
        }
        .satellite-item:last-child {
            border-bottom: none;
        }
        .tle-data {
            font-family: monospace;
            white-space: pre;
            background-color: #2d2d2d;
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
        }
        h2 {
            color: #00b0ff;
        }
        .delete-btn {
            background-color: #f44336;
            margin-top: 10px;
        }
        .delete-btn:hover {
            background-color: #d32f2f;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Orbital Propagation App</h1>
        </div>

        <!-- Backend Status -->
        <div class="card" id="status-card">
            <h2>Backend Status</h2>
            <div id="status">Checking connection...</div>
            <button onclick="checkHealth()">Refresh Status</button>
        </div>

        <!-- Add Satellite Form -->
        <div class="card">
            <h2>Add New Satellite</h2>
            <form id="satellite-form">
                <label for="satellite-name">Satellite Name:</label>
                <input type="text" id="satellite-name" required placeholder="Enter satellite name">
                
                <label for="tle-data">TLE Data:</label>
                <textarea id="tle-data" rows="3" required placeholder="Enter TLE data (Two-Line Element Set)"></textarea>
                <div class="help-text">Enter the complete TLE data for the satellite (two lines)</div>
                
                <div id="form-status"></div>
                
                <button type="submit">Add Satellite</button>
            </form>
        </div>

        <!-- Satellite List -->
        <div class="card">
            <h2>Satellite List</h2>
            <div id="satellite-container">
                <div>Loading satellites...</div>
            </div>
            <button onclick="fetchSatellites()">Refresh List</button>
        </div>
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
                        <p class="error">Error connecting to the backend</p>
                        <p>${error.message}</p>
                    `;
                });
        }

        // Function to fetch all satellites
        function fetchSatellites() {
            const container = document.getElementById('satellite-container');
            container.innerHTML = '<div>Loading satellites...</div>';
            
            fetch('/api/satellites')
                .then(response => response.json())
                .then(satellites => {
                    if (satellites.length === 0) {
                        container.innerHTML = '<div>No satellites added yet.</div>';
                    } else {
                        let html = '<ul class="satellite-list">';
                        satellites.forEach(satellite => {
                            html += `
                                <li class="satellite-item">
                                    <h3>${satellite.name}</h3>
                                    <div><strong>TLE Data:</strong></div>
                                    <div class="tle-data">${satellite.tle}</div>
                                    <div style="color: #888;">Added: ${new Date(satellite.created_at).toLocaleString()}</div>
                                    <button class="delete-btn" onclick="deleteSatellite(${satellite.id})">Delete Satellite</button>
                                </li>
                            `;
                        });
                        html += '</ul>';
                        container.innerHTML = html;
                    }
                })
                .catch(error => {
                    container.innerHTML = `<div class="error">Error fetching satellites: ${error.message}</div>`;
                });
        }

        // Function to add a new satellite
        document.getElementById('satellite-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('satellite-name').value;
            const tle = document.getElementById('tle-data').value;
            const statusElement = document.getElementById('form-status');
            
            statusElement.innerHTML = '<div>Adding satellite...</div>';
            
            fetch('/api/satellites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, tle }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Failed to add satellite'); });
                }
                return response.json();
            })
            .then(data => {
                // Reset form
                document.getElementById('satellite-name').value = '';
                document.getElementById('tle-data').value = '';
                
                statusElement.innerHTML = '<div class="success">Satellite added successfully!</div>';
                
                // Refresh satellite list
                fetchSatellites();
            })
            .catch(error => {
                statusElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            });
        });

        // Function to delete a satellite
        function deleteSatellite(id) {
            if (!confirm('Are you sure you want to delete this satellite?')) {
                return;
            }
            
            fetch(`/api/satellites/${id}`, {
                method: 'DELETE',
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Failed to delete satellite'); });
                }
                return response.json();
            })
            .then(data => {
                alert(data.message);
                // Refresh satellite list
                fetchSatellites();
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
            });
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            checkHealth();
            fetchSatellites();
        });
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask server on port {port}...")
    print(f"Open http://localhost:{port} in your browser to view the application")
    app.run(host='0.0.0.0', port=port, debug=True) 