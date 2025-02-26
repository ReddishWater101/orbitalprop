from flask import Flask, jsonify, send_from_directory, request, render_template_string
from flask_cors import CORS
import os
from datetime import datetime, timedelta
from skyfield.api import EarthSatellite, load, Topos
import numpy as np
import plotly
import plotly.graph_objects as go
import json

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

@app.route('/api/satellites/<int:satellite_id>/propagate', methods=['POST'])
def propagate_satellite(satellite_id):
    """Propagate satellite orbit using Skyfield"""
    # Get propagation parameters from request
    data = request.json
    
    if not data or 'start_time' not in data or 'end_time' not in data or 'step_size' not in data:
        return jsonify({'error': 'Start time, end time, and step size are required'}), 400
    
    # Find the satellite by ID
    satellite_data = None
    for sat in satellites:
        if sat['id'] == satellite_id:
            satellite_data = sat
            break
    
    if not satellite_data:
        return jsonify({'error': f"Satellite with ID {satellite_id} not found"}), 404
    
    try:
        # Parse start and end times
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        step_size = float(data['step_size'])  # In minutes
        
        # Load Skyfield time scale
        ts = load.timescale()
        
        # Parse TLE data
        tle_lines = satellite_data['tle'].strip().split('\n')
        if len(tle_lines) != 2:
            return jsonify({'error': 'Invalid TLE data format'}), 400
        
        # Create Skyfield satellite object
        satellite = EarthSatellite(tle_lines[0], tle_lines[1], satellite_data['name'], ts)
        
        # Initialize lists for results
        latitudes = []
        longitudes = []
        elevations = []
        positions = []
        velocities = []
        times = []
        
        # Propagate orbit
        current_time = start_time
        while current_time <= end_time:
            # Convert current time to Skyfield time
            t = ts.utc(
                current_time.year,
                current_time.month,
                current_time.day,
                current_time.hour,
                current_time.minute,
                current_time.second
            )
            
            # Get satellite position and velocity
            geocentric = satellite.at(t)
            subpoint = geocentric.subpoint()
            
            # Store results
            latitudes.append(subpoint.latitude.degrees)
            longitudes.append(subpoint.longitude.degrees)
            elevations.append(subpoint.elevation.m)
            
            # Get position (x, y, z) in kilometers
            position = geocentric.position.km
            positions.append({
                'x': float(position[0]),
                'y': float(position[1]),
                'z': float(position[2])
            })
            
            # Get velocity in km/s
            velocity = geocentric.velocity.km_per_s
            velocities.append({
                'x': float(velocity[0]),
                'y': float(velocity[1]),
                'z': float(velocity[2])
            })
            
            times.append(current_time.isoformat())
            
            # Increment time by step size
            current_time += timedelta(minutes=step_size)
        
        # Return propagation results
        return jsonify({
            'satellite_id': satellite_id,
            'satellite_name': satellite_data['name'],
            'propagation_data': {
                'times': times,
                'latitudes': latitudes,
                'longitudes': longitudes,
                'elevations': elevations,
                'positions': positions,
                'velocities': velocities
            }
        })
    
    except Exception as e:
        return jsonify({'error': f"Propagation failed: {str(e)}"}), 500

def plotly_map_plot(latitudes, longitudes, zoom=1, center=None):
    """Create an interactive map with satellite ground track"""
    if center is None:
        # Default center at [0, 0] if not provided
        center = [0, 0]
    
    # Handle international date line crossing by splitting the data into segments
    lat_segments = []
    lon_segments = []
    current_lat_segment = []
    current_lon_segment = []
    
    for i in range(len(longitudes)):
        # Add point to current segment
        current_lat_segment.append(latitudes[i])
        current_lon_segment.append(longitudes[i])
        
        # Check if we need to start a new segment (international date line crossing)
        if i < len(longitudes) - 1:
            # If longitude difference is more than 180 degrees, we've crossed the date line
            if abs(longitudes[i+1] - longitudes[i]) > 180:
                # End current segment
                lat_segments.append(current_lat_segment)
                lon_segments.append(current_lon_segment)
                # Start new segment
                current_lat_segment = []
                current_lon_segment = []
    
    # Add the final segment if it has points
    if current_lat_segment:
        lat_segments.append(current_lat_segment)
        lon_segments.append(current_lon_segment)
    
    # Create a trace for each segment
    traces = []
    for i in range(len(lat_segments)):
        traces.append(
            go.Scattermapbox(
                mode="markers+lines",
                lon=lon_segments[i],
                lat=lat_segments[i],
                marker=dict(size=5, color="#EDB120"),
                line=dict(width=2, color="#EDB120"),
                showlegend=False,
            )
        )
    
    # Create the figure with all traces
    fig = go.Figure(data=traces)
    
    # Update layout with mapbox configuration
    fig.update_layout(
        mapbox=dict(
            style="white-bg",
            layers=[
                {
                    "below": "traces",
                    "sourcetype": "raster",
                    "sourceattribution": "United States Geological Survey",
                    "source": [
                        "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
                    ]
                }
            ],
            center=dict(
                lon=center[0],
                lat=center[1]
            ),
            zoom=zoom,
            bearing=0,
        ),
        width=800,
        height=700,
        margin=dict(l=0, r=0, t=0, b=0),
    )
    
    return fig

@app.route('/api/satellites/<int:satellite_id>/ground-track', methods=['POST'])
def generate_ground_track(satellite_id):
    """Generate and return a ground track plot for a satellite after propagation"""
    # Get propagation parameters from request
    data = request.json
    
    if not data or 'start_time' not in data or 'end_time' not in data or 'step_size' not in data:
        return jsonify({'error': 'Start time, end time, and step size are required'}), 400
    
    # Find the satellite by ID
    satellite_data = None
    for sat in satellites:
        if sat['id'] == satellite_id:
            satellite_data = sat
            break
    
    if not satellite_data:
        return jsonify({'error': f"Satellite with ID {satellite_id} not found"}), 404
    
    try:
        # Parse start and end times
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])
        step_size = float(data['step_size'])  # In minutes
        
        # Load Skyfield time scale
        ts = load.timescale()
        
        # Parse TLE data
        tle_lines = satellite_data['tle'].strip().split('\n')
        if len(tle_lines) != 2:
            return jsonify({'error': 'Invalid TLE data format'}), 400
        
        # Create Skyfield satellite object
        satellite = EarthSatellite(tle_lines[0], tle_lines[1], satellite_data['name'], ts)
        
        # Initialize lists for results
        latitudes = []
        longitudes = []
        times = []
        
        # Propagate orbit
        current_time = start_time
        while current_time <= end_time:
            # Convert current time to Skyfield time
            t = ts.utc(
                current_time.year,
                current_time.month,
                current_time.day,
                current_time.hour,
                current_time.minute,
                current_time.second
            )
            
            # Get satellite position
            geocentric = satellite.at(t)
            subpoint = geocentric.subpoint()
            
            # Store results
            latitudes.append(float(subpoint.latitude.degrees))
            longitudes.append(float(subpoint.longitude.degrees))
            times.append(current_time.isoformat())
            
            # Increment time by step size
            current_time += timedelta(minutes=step_size)
        
        # Calculate center point (average of all lat/long points)
        center_lat = sum(latitudes) / len(latitudes)
        center_lon = sum(longitudes) / len(longitudes)
        
        # Create the plot
        fig = plotly_map_plot(latitudes, longitudes, zoom=2, center=[center_lon, center_lat])
        
        # Convert to JSON
        plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        # Return both plot data and propagation data
        return jsonify({
            'satellite_id': satellite_id,
            'satellite_name': satellite_data['name'],
            'plot_data': plot_json,
            'propagation_data': {
                'times': times,
                'latitudes': latitudes,
                'longitudes': longitudes
            }
        })
    
    except Exception as e:
        return jsonify({'error': f"Ground track generation failed: {str(e)}"}), 500

# HTML template for the main page
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Orbital Propagation App</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
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
        .button-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .propagate-btn {
            background-color: #69f0ae;
            color: black;
            margin-top: 10px;
        }
        
        .propagate-btn:hover {
            background-color: #4caf50;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.8);
        }
        
        .modal-content {
            background-color: #1e1e1e;
            margin: 15% auto;
            padding: 20px;
            border-radius: 8px;
            width: 80%;
            max-width: 600px;
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: white;
        }
        
        .form-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .form-row > div {
            flex: 1;
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .results-table th {
            background-color: #2d2d2d;
            text-align: left;
            padding: 8px;
        }
        
        .results-table td {
            padding: 8px;
            border-bottom: 1px solid #333;
        }
        
        .ground-track-btn {
            background-color: #8e44ad;
            color: white;
            margin-left: 10px;
        }
        
        .ground-track-btn:hover {
            background-color: #6c3483;
        }
        
        .plot-container {
            width: 100%;
            height: 700px;
            margin-top: 20px;
        }
        
        .ground-track-modal .modal-content {
            width: 90%;
            max-width: 900px;
            margin: 5% auto;
        }
        
        .modal-tabs {
            display: flex;
            border-bottom: 1px solid #333;
            margin-bottom: 15px;
        }
        
        .modal-tab {
            padding: 10px 20px;
            cursor: pointer;
            background-color: #2d2d2d;
            margin-right: 5px;
            border-radius: 5px 5px 0 0;
        }
        
        .modal-tab.active {
            background-color: #00b0ff;
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
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
        
        <!-- Propagation Modal -->
        <div id="propagation-modal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('propagation-modal')">&times;</span>
                <h2>Propagate Satellite Orbit</h2>
                <div id="propagation-form">
                    <div id="selected-satellite-name"></div>
                    <div class="form-row">
                        <div>
                            <label for="start-time">Start Time:</label>
                            <input type="datetime-local" id="start-time" required>
                        </div>
                        <div>
                            <label for="end-time">End Time:</label>
                            <input type="datetime-local" id="end-time" required>
                        </div>
                    </div>
                    <div>
                        <label for="step-size">Step Size (minutes):</label>
                        <input type="number" id="step-size" value="0.2" min="0.1" step="0.1" required>
                        <div class="help-text">Time interval between propagation points in minutes</div>
                    </div>
                    <div id="propagation-status"></div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="propagateSatellite()" class="propagate-btn">Propagate</button>
                        <button onclick="generateGroundTrack()" class="ground-track-btn">Propagate with Ground Track</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Results Modal -->
        <div id="results-modal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('results-modal')">&times;</span>
                <h2>Propagation Results</h2>
                <div id="results-container">
                    <!-- Results will be displayed here -->
                </div>
            </div>
        </div>
        
        <!-- Ground Track Modal -->
        <div id="ground-track-modal" class="modal ground-track-modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('ground-track-modal')">&times;</span>
                <h2>Ground Track Visualization</h2>
                
                <div class="modal-tabs">
                    <div class="modal-tab active" onclick="switchTab('map-tab')">Map View</div>
                    <div class="modal-tab" onclick="switchTab('data-tab')">Data View</div>
                </div>
                
                <div id="map-tab" class="tab-content active">
                    <div id="ground-track-container" class="plot-container">
                        <!-- Ground track map will be displayed here -->
                    </div>
                </div>
                
                <div id="data-tab" class="tab-content">
                    <div id="ground-track-data">
                        <!-- Ground track data will be displayed here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global variables for propagation
        let selectedSatelliteId = null;
        let selectedSatelliteName = null;
        let propagationResults = null;
        let groundTrackResults = null;
        
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
                                    <div class="button-container">
                                        <button class="delete-btn" onclick="deleteSatellite(${satellite.id})">Delete Satellite</button>
                                        <button class="propagate-btn" onclick="openPropagationModal(${satellite.id}, '${satellite.name}')">Propagate Orbit</button>
                                    </div>
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

        // Function to open propagation modal
        function openPropagationModal(satelliteId, satelliteName) {
            selectedSatelliteId = satelliteId;
            selectedSatelliteName = satelliteName;
            
            // Set default times (now to 24 hours from now)
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setHours(tomorrow.getHours() + 24);
            
            document.getElementById('selected-satellite-name').innerHTML = `<h3>Satellite: ${satelliteName}</h3>`;
            document.getElementById('start-time').value = now.toISOString().slice(0, 16);
            document.getElementById('end-time').value = tomorrow.toISOString().slice(0, 16);
            document.getElementById('step-size').value = '0.2';
            document.getElementById('propagation-status').innerHTML = '';
            
            document.getElementById('propagation-modal').style.display = 'block';
        }
        
        // Function to close modals
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Function to propagate satellite
        function propagateSatellite() {
            const startTime = document.getElementById('start-time').value;
            const endTime = document.getElementById('end-time').value;
            const stepSize = document.getElementById('step-size').value;
            const statusElement = document.getElementById('propagation-status');
            
            if (!startTime || !endTime || !stepSize) {
                statusElement.innerHTML = '<div class="error">All fields are required</div>';
                return;
            }
            
            statusElement.innerHTML = '<div>Propagating orbit...</div>';
            
            fetch(`/api/satellites/${selectedSatelliteId}/propagate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_time: startTime,
                    end_time: endTime,
                    step_size: parseFloat(stepSize)
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Failed to propagate orbit'); });
                }
                return response.json();
            })
            .then(data => {
                propagationResults = data;
                closeModal('propagation-modal');
                displayResults();
            })
            .catch(error => {
                statusElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            });
        }
        
        // Function to generate ground track
        function generateGroundTrack() {
            const startTime = document.getElementById('start-time').value;
            const endTime = document.getElementById('end-time').value;
            const stepSize = document.getElementById('step-size').value;
            const statusElement = document.getElementById('propagation-status');
            
            if (!startTime || !endTime || !stepSize) {
                statusElement.innerHTML = '<div class="error">All fields are required</div>';
                return;
            }
            
            statusElement.innerHTML = '<div>Generating ground track...</div>';
            
            fetch(`/api/satellites/${selectedSatelliteId}/ground-track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_time: startTime,
                    end_time: endTime,
                    step_size: parseFloat(stepSize)
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Failed to generate ground track'); });
                }
                return response.json();
            })
            .then(data => {
                groundTrackResults = data;
                closeModal('propagation-modal');
                displayGroundTrack();
            })
            .catch(error => {
                statusElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            });
        }
        
        // Function to display propagation results
        function displayResults() {
            const resultsContainer = document.getElementById('results-container');
            
            let html = `
                <h3>${propagationResults.satellite_name}</h3>
                <h4>Propagation Summary</h4>
                <p>Total points: ${propagationResults.propagation_data.times.length}</p>
                <p>Start time: ${new Date(propagationResults.propagation_data.times[0]).toLocaleString()}</p>
                <p>End time: ${new Date(propagationResults.propagation_data.times[propagationResults.propagation_data.times.length - 1]).toLocaleString()}</p>
                
                <h4>Position and Velocity Data (First 5 points)</h4>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Latitude (°)</th>
                            <th>Longitude (°)</th>
                            <th>Elevation (m)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // Add first 5 rows of data
            const maxRows = Math.min(5, propagationResults.propagation_data.times.length);
            for (let i = 0; i < maxRows; i++) {
                html += `
                    <tr>
                        <td>${new Date(propagationResults.propagation_data.times[i]).toLocaleString()}</td>
                        <td>${propagationResults.propagation_data.latitudes[i].toFixed(4)}</td>
                        <td>${propagationResults.propagation_data.longitudes[i].toFixed(4)}</td>
                        <td>${propagationResults.propagation_data.elevations[i].toFixed(2)}</td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                <div style="margin-top: 15px; color: #69f0ae;">
                    The complete propagation data can be analyzed and visualized using appropriate tools.
                </div>
            `;
            
            resultsContainer.innerHTML = html;
            document.getElementById('results-modal').style.display = 'block';
        }
        
        // Function to display ground track
        function displayGroundTrack() {
            // Display the map
            const plotData = JSON.parse(groundTrackResults.plot_data);
            Plotly.newPlot('ground-track-container', plotData.data, plotData.layout);
            
            // Display data in the data tab
            const dataContainer = document.getElementById('ground-track-data');
            
            let html = `
                <h3>${groundTrackResults.satellite_name}</h3>
                <h4>Ground Track Summary</h4>
                <p>Total points: ${groundTrackResults.propagation_data.times.length}</p>
                <p>Start time: ${new Date(groundTrackResults.propagation_data.times[0]).toLocaleString()}</p>
                <p>End time: ${new Date(groundTrackResults.propagation_data.times[groundTrackResults.propagation_data.times.length - 1]).toLocaleString()}</p>
                
                <h4>Ground Track Data</h4>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Latitude (°)</th>
                            <th>Longitude (°)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // Add rows of data
            const maxRows = Math.min(20, groundTrackResults.propagation_data.times.length);
            for (let i = 0; i < maxRows; i++) {
                html += `
                    <tr>
                        <td>${new Date(groundTrackResults.propagation_data.times[i]).toLocaleString()}</td>
                        <td>${groundTrackResults.propagation_data.latitudes[i].toFixed(4)}</td>
                        <td>${groundTrackResults.propagation_data.longitudes[i].toFixed(4)}</td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                <div style="margin-top: 15px; color: #69f0ae;">
                    Showing ${maxRows} of ${groundTrackResults.propagation_data.times.length} points.
                </div>
            `;
            
            dataContainer.innerHTML = html;
            
            // Show the ground track modal
            document.getElementById('ground-track-modal').style.display = 'block';
        }
        
        // Function to switch tabs
        function switchTab(tabId) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Deactivate all tabs
            const tabs = document.querySelectorAll('.modal-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Activate the selected tab
            document.getElementById(tabId).classList.add('active');
            
            // Activate the tab button
            const tabIndex = tabId === 'map-tab' ? 0 : 1;
            tabs[tabIndex].classList.add('active');
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