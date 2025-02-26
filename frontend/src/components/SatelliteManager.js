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
  CircularProgress
} from '@mui/material';

const SatelliteManager = () => {
  const [satellites, setSatellites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [tleData, setTleData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
    </Box>
  );
};

export default SatelliteManager; 