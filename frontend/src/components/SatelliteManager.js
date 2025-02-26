import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const SatelliteManager = () => {
  const [satellites, setSatellites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [tleData, setTleData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Propagation state
  const [propagationDialog, setPropagationDialog] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [stepSize, setStepSize] = useState('0.2');
  const [propagating, setPropagating] = useState(false);
  const [propagationResult, setPropagationResult] = useState(null);
  const [propagationError, setPropagationError] = useState(null);
  const [resultsDialog, setResultsDialog] = useState(false);

  // Fetch all satellites
  const fetchSatellites = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/satellites');
      if (!response.ok) {
        throw new Error('Failed to fetch satellites');
      }
      const data = await response.json();
      setSatellites(data);
    } catch (err) {
      setError('Failed to fetch satellites. ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create new satellite
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/satellites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          tle: tleData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create satellite');
      }
      
      // Reset form
      setName('');
      setTleData('');
      setSuccess(true);
      
      // Refresh satellite list
      fetchSatellites();
    } catch (err) {
      setError('Failed to create satellite: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Open propagation dialog
  const handleOpenPropagation = (satellite) => {
    setSelectedSatellite(satellite);
    
    // Set default times (now to 24 hours from now)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);
    
    setStartTime(now.toISOString().slice(0, 16));
    setEndTime(tomorrow.toISOString().slice(0, 16));
    setStepSize('0.2');
    setPropagationError(null);
    setPropagationResult(null);
    
    setPropagationDialog(true);
  };

  // Close propagation dialog
  const handleClosePropagation = () => {
    setPropagationDialog(false);
  };

  // Handle propagation
  const handlePropagate = async () => {
    setPropagating(true);
    setPropagationError(null);
    
    try {
      const response = await fetch(`/api/satellites/${selectedSatellite.id}/propagate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          step_size: parseFloat(stepSize)
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to propagate orbit');
      }
      
      const result = await response.json();
      setPropagationResult(result);
      setPropagationDialog(false);
      setResultsDialog(true);
    } catch (err) {
      setPropagationError('Propagation failed: ' + err.message);
      console.error(err);
    } finally {
      setPropagating(false);
    }
  };

  // Close results dialog
  const handleCloseResults = () => {
    setResultsDialog(false);
  };

  // Fetch satellites on component mount
  useEffect(() => {
    fetchSatellites();
  }, []);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Satellite Manager
      </Typography>
      
      {/* Add Satellite Form */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Satellite
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            label="Satellite Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          
          <TextField
            label="TLE Data"
            variant="outlined"
            fullWidth
            margin="normal"
            value={tleData}
            onChange={(e) => setTleData(e.target.value)}
            required
            multiline
            rows={3}
            placeholder="Enter TLE data (Two-Line Element Set)"
            helperText="Enter the complete TLE data for the satellite (two lines)"
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
              Satellite added successfully!
            </Alert>
          )}
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
            sx={{ mt: 2 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Add Satellite'}
          </Button>
        </form>
      </Paper>
      
      {/* Satellite List */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Satellite List
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : satellites.length > 0 ? (
          <List>
            {satellites.map((satellite, index) => (
              <React.Fragment key={satellite.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={satellite.name}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          TLE Data:
                        </Typography>
                        <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1, overflow: 'auto' }}>
                          {satellite.tle}
                        </Box>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pb: 1 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleOpenPropagation(satellite)}
                  >
                    Propagate Orbit
                  </Button>
                </Box>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No satellites added yet.
          </Typography>
        )}
        
        <Button
          variant="outlined"
          color="primary"
          onClick={fetchSatellites}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          Refresh List
        </Button>
      </Paper>
      
      {/* Propagation Dialog */}
      <Dialog open={propagationDialog} onClose={handleClosePropagation} maxWidth="sm" fullWidth>
        <DialogTitle>
          Propagate Satellite Orbit
          <IconButton
            aria-label="close"
            onClick={handleClosePropagation}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedSatellite && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Satellite: {selectedSatellite.name}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Time"
                    type="datetime-local"
                    fullWidth
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="End Time"
                    type="datetime-local"
                    fullWidth
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Step Size (minutes)"
                    type="number"
                    fullWidth
                    value={stepSize}
                    onChange={(e) => setStepSize(e.target.value)}
                    inputProps={{ min: 0.1, step: 0.1 }}
                    helperText="Time interval between propagation points in minutes"
                  />
                </Grid>
              </Grid>
              
              {propagationError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {propagationError}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePropagation}>Cancel</Button>
          <Button 
            onClick={handlePropagate} 
            variant="contained" 
            color="primary"
            disabled={propagating || !startTime || !endTime || !stepSize}
          >
            {propagating ? <CircularProgress size={24} /> : 'Propagate'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Results Dialog */}
      <Dialog 
        open={resultsDialog} 
        onClose={handleCloseResults} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Propagation Results
          <IconButton
            aria-label="close"
            onClick={handleCloseResults}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {propagationResult && (
            <>
              <Typography variant="h6" gutterBottom>
                {propagationResult.satellite_name}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>
                Propagation Summary
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Total points: {propagationResult.propagation_data.times.length}
                </Typography>
                <Typography variant="body2">
                  Start time: {new Date(propagationResult.propagation_data.times[0]).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  End time: {new Date(propagationResult.propagation_data.times[propagationResult.propagation_data.times.length - 1]).toLocaleString()}
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Position and Velocity Data (First 5 points)
              </Typography>
              
              <Box sx={{ mt: 2, mb: 2, maxHeight: '300px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e1e1e' }}>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333' }}>Time</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333' }}>Latitude (°)</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333' }}>Longitude (°)</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #333' }}>Elevation (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propagationResult.propagation_data.times.slice(0, 5).map((time, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '8px' }}>{new Date(time).toLocaleString()}</td>
                        <td style={{ padding: '8px' }}>{propagationResult.propagation_data.latitudes[index].toFixed(4)}</td>
                        <td style={{ padding: '8px' }}>{propagationResult.propagation_data.longitudes[index].toFixed(4)}</td>
                        <td style={{ padding: '8px' }}>{propagationResult.propagation_data.elevations[index].toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              
              <Alert severity="info">
                The complete propagation data can be analyzed and visualized using appropriate tools.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResults}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SatelliteManager; 