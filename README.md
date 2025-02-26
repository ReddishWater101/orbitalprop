# Orbital Propagator

A modern satellite orbit analysis tool with a Flask backend and React frontend, designed for orbital mechanics and space mission applications.

## What It Does

This application allows you to:

- **Input satellite data** using Two-Line Element (TLE) sets
- **Propagate satellite orbits** over specified time periods using the Skyfield astronomy library
- **Visualize trajectories** in both 2D (ground tracks) and 3D space
- **Manage multiple satellites** for comparative orbital analysis
- **Analyze satellite passes** over areas of interest for mission planning
- **Calculate position and velocity vectors** at each time step

## Project Structure

- `/backend`: Flask API backend
  - Orbital propagation using Skyfield astronomy library
  - Satellite trajectory calculations
  - Ground track generation
  - Pass analysis functionality
  
- `/frontend`: React frontend with Material UI
  - Modern dark theme UI
  - Interactive 2D and 3D satellite visualization
  - Satellite management dashboard
  - API connectivity for real-time calculations

## Getting Started

### Windows

Run the `start_app.bat` file to automatically:
1. Set up the Python virtual environment
2. Install dependencies
3. Start the Flask server
4. Open the application in your browser

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Features

- **Satellite Management:** Add, edit, and remove satellite data using TLE format
- **Orbit Propagation:** Calculate satellite positions over time with configurable parameters
- **Visualization:** View satellite trajectories, ground tracks, and Earth-centered plots
- **Mission Analysis:** Define areas of interest and analyze satellite coverage
- **Multi-satellite Support:** Process and compare multiple satellites simultaneously
- **Clean Interface:** Intuitive UI for space mission planning and analysis

## Dependencies

### Backend
- Flask
- Flask-CORS
- Skyfield (for orbital calculations)
- NumPy
- Plotly

### Frontend
- React
- Material-UI
- Axios
- Plotly (for visualization)

## License

MIT 