import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Theme configuration
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00b0ff',
    },
    secondary: {
      main: '#69f0ae',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError('Failed to connect to the backend server. Make sure it is running!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check health when component mounts
    checkHealth();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Simple App
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            ) : healthData ? (
              <Box sx={{ my: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Connected to backend successfully!
                </Alert>
                <Typography variant="body1" align="left" paragraph>
                  Status: {healthData.status}
                </Typography>
                <Typography variant="body1" align="left" paragraph>
                  Message: {healthData.message}
                </Typography>
                <Typography variant="body2" align="left" color="text.secondary">
                  Timestamp: {new Date(healthData.timestamp).toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No data available
              </Typography>
            )}
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={checkHealth}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Refresh Status
            </Button>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 