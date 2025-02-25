# Orbital Propagator

A modern web application with a Flask backend and React frontend, designed as a clean foundation for building orbital mechanics and space mission applications.

## Project Structure

- `/backend`: Flask API backend
  - Simple health check endpoint
  - Ready for Python orbital mechanics implementations
  
- `/frontend`: React frontend with Material UI
  - Modern dark theme UI
  - API connectivity built-in

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

- Clean, minimalist design
- Python backend for powerful numerical calculations
- React frontend for beautiful visualization
- Easy installation and setup

## Dependencies

### Backend
- Flask
- Flask-CORS
- Other scientific libraries as needed

### Frontend
- React
- Material-UI
- Axios

## License

MIT 