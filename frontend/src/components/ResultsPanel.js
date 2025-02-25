import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Plot from 'react-plotly.js';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';

// Fix for Leaflet marker icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const ResultsPanel = ({ trajectoryData, passAnalysisData, isLoading }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Render ground track map
  const renderGroundTrackMap = () => {
    if (!trajectoryData) return null;

    const { latitudes, longitudes } = trajectoryData;
    const positions = latitudes.map((lat, i) => [lat, longitudes[i]]);

    return (
      <Box sx={{ height: 500, width: '100%' }}>
        <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={positions}
            pathOptions={{ color: 'blue', weight: 3 }}
          />
          <Marker position={positions[0]}>
            <Popup>Start Point</Popup>
          </Marker>
          <Marker position={positions[positions.length - 1]}>
            <Popup>End Point</Popup>
          </Marker>
        </MapContainer>
      </Box>
    );
  };

  // Render altitude chart
  const renderAltitudeChart = () => {
    if (!trajectoryData) return null;

    const { times, altitudes } = trajectoryData;
    
    // Format times for better display
    const formattedTimes = times.map(timeStr => {
      const date = new Date(timeStr);
      return date.toLocaleTimeString();
    });

    return (
      <Box sx={{ height: 400, width: '100%' }}>
        <Plot
          data={[
            {
              x: formattedTimes,
              y: altitudes,
              type: 'scatter',
              mode: 'lines',
              marker: { color: '#00b0ff' },
              name: 'Altitude'
            }
          ]}
          layout={{
            title: 'Satellite Altitude Over Time',
            xaxis: {
              title: 'Time (UTC)',
              tickangle: -45
            },
            yaxis: {
              title: 'Altitude (km)'
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
              color: '#ffffff'
            },
            autosize: true,
            margin: { t: 50, b: 70, l: 60, r: 30 }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </Box>
    );
  };

  // Render 3D orbit view
  const render3DOrbitView = () => {
    if (!trajectoryData) return null;

    const { positions_eci } = trajectoryData;
    
    // Extract x, y, z coordinates
    const x = positions_eci.map(pos => pos[0] / 1000); // Convert to km
    const y = positions_eci.map(pos => pos[1] / 1000);
    const z = positions_eci.map(pos => pos[2] / 1000);

    // Create Earth sphere
    const earthRadius = 6371; // km
    
    // Generate points for Earth sphere
    const phi = [];
    const theta = [];
    for (let i = 0; i <= 20; i++) {
      phi.push(i * Math.PI / 10);
    }
    for (let i = 0; i <= 20; i++) {
      theta.push(i * 2 * Math.PI / 20);
    }
    
    const earthX = [];
    const earthY = [];
    const earthZ = [];
    
    for (let i = 0; i < phi.length; i++) {
      for (let j = 0; j < theta.length; j++) {
        earthX.push(earthRadius * Math.sin(phi[i]) * Math.cos(theta[j]));
        earthY.push(earthRadius * Math.sin(phi[i]) * Math.sin(theta[j]));
        earthZ.push(earthRadius * Math.cos(phi[i]));
      }
    }

    return (
      <Box sx={{ height: 500, width: '100%' }}>
        <Plot
          data={[
            // Satellite orbit
            {
              type: 'scatter3d',
              mode: 'lines',
              x: x,
              y: y,
              z: z,
              line: {
                width: 4,
                color: '#00b0ff'
              },
              name: 'Satellite Orbit'
            },
            // Earth representation
            {
              type: 'scatter3d',
              mode: 'markers',
              x: earthX,
              y: earthY,
              z: earthZ,
              marker: {
                size: 2,
                color: 'lightblue',
                opacity: 0.8
              },
              name: 'Earth'
            }
          ]}
          layout={{
            title: '3D Orbit Visualization',
            scene: {
              xaxis: { title: 'X (km)' },
              yaxis: { title: 'Y (km)' },
              zaxis: { title: 'Z (km)' },
              aspectratio: { x: 1, y: 1, z: 1 }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
              color: '#ffffff'
            },
            autosize: true,
            margin: { t: 50, b: 0, l: 0, r: 0 }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </Box>
    );
  };

  // Render orbit parameters
  const renderOrbitParameters = () => {
    if (!trajectoryData) return null;

    // Calculate basic orbit statistics
    const { altitudes, name } = trajectoryData;
    
    const avgAltitude = altitudes.reduce((sum, alt) => sum + alt, 0) / altitudes.length;
    const minAltitude = Math.min(...altitudes);
    const maxAltitude = Math.max(...altitudes);

    return (
      <Box sx={{ p: 2 }}>
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardHeader title="Satellite Information" sx={{ pb: 0 }} />
          <CardContent>
            <Typography variant="body1">Name: {name}</Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardHeader title="Orbit Statistics" sx={{ pb: 0 }} />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Average Altitude</Typography>
                <Typography variant="h6">{avgAltitude.toFixed(2)} km</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Minimum Altitude</Typography>
                <Typography variant="h6">{minAltitude.toFixed(2)} km</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Maximum Altitude</Typography>
                <Typography variant="h6">{maxAltitude.toFixed(2)} km</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Render pass analysis
  const renderPassAnalysis = () => {
    if (!passAnalysisData) return null;

    const { satellite, aoi_passes } = passAnalysisData;

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pass Analysis for {satellite}
        </Typography>
        
        {aoi_passes.map((aoiPass, index) => (
          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardHeader 
              title={aoiPass.aoi_name} 
              subheader={`Total Passes: ${aoiPass.total_passes}`} 
            />
            <Divider />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Total Coverage: {formatDuration(aoiPass.total_coverage_seconds)}
              </Typography>
              
              {aoiPass.passes.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Pass #</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Max Elevation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {aoiPass.passes.map((pass, passIndex) => (
                        <TableRow key={passIndex}>
                          <TableCell>{passIndex + 1}</TableCell>
                          <TableCell>{formatTime(pass.start_time)}</TableCell>
                          <TableCell>{formatTime(pass.end_time)}</TableCell>
                          <TableCell>{formatDuration(pass.duration_seconds)}</TableCell>
                          <TableCell>{(pass.max_elevation / 1000).toFixed(2)} km</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No passes detected for this AOI
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Helper function to format time
  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  // Helper function to format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Processing...</Typography>
        </Box>
      </Paper>
    );
  }

  // If no data, show initial message
  if (!trajectoryData && !passAnalysisData) {
    return (
      <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to Orbital Propagator
          </Typography>
          <Typography variant="body1" paragraph>
            Enter satellite TLE data and simulation parameters on the left panel, 
            then click "Propagate Orbit" to visualize the trajectory.
          </Typography>
          <Typography variant="body1">
            For mission analysis, upload GeoJSON files defining your Areas of Interest 
            and click "Analyze AOI Passes".
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Ground Track" disabled={!trajectoryData} />
          <Tab label="Altitude Profile" disabled={!trajectoryData} />
          <Tab label="3D Orbit" disabled={!trajectoryData} />
          <Tab label="Orbit Parameters" disabled={!trajectoryData} />
          <Tab label="AOI Pass Analysis" disabled={!passAnalysisData} />
        </Tabs>
      </Box>
      
      <Box sx={{ p: 0 }}>
        {tabValue === 0 && trajectoryData && renderGroundTrackMap()}
        {tabValue === 1 && trajectoryData && renderAltitudeChart()}
        {tabValue === 2 && trajectoryData && render3DOrbitView()}
        {tabValue === 3 && trajectoryData && renderOrbitParameters()}
        {tabValue === 4 && passAnalysisData && renderPassAnalysis()}
      </Box>
    </Paper>
  );
};

export default ResultsPanel; 