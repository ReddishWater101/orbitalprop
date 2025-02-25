import React, { useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Slider from '@mui/material/Slider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import SatelliteIcon from '@mui/icons-material/Satellite';
import PublicIcon from '@mui/icons-material/Public';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const InputPanel = ({
  tleData,
  setTleData,
  simulationParams,
  setSimulationParams,
  aoiData,
  setAoiData,
  setTrajectoryData,
  setPassAnalysisData,
  isLoading,
  setIsLoading
}) => {
  const [error, setError] = useState('');
  
  // GeoJSON file dropzone
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/json': ['.json', '.geojson'],
    },
    onDrop: acceptedFiles => {
      handleGeoJsonFiles(acceptedFiles);
    },
  });

  // Handle GeoJSON file upload
  const handleGeoJsonFiles = (files) => {
    if (files.length === 0) return;
    
    const newAois = [...aoiData];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileData = JSON.parse(reader.result);
          newAois.push({
            name: file.name,
            data: fileData
          });
          setAoiData(newAois);
        } catch (e) {
          setError(`Error parsing GeoJSON file: ${e.message}`);
        }
      };
      reader.readAsText(file);
    });
  };
  
  // Handle simulation parameter changes
  const handleParamChange = (param, value) => {
    setSimulationParams({
      ...simulationParams,
      [param]: value
    });
  };
  
  // Handle TLE data input
  const handleTleChange = (e) => {
    setTleData(e.target.value);
  };
  
  // Remove a GeoJSON file
  const handleRemoveAoi = (index) => {
    const newAois = [...aoiData];
    newAois.splice(index, 1);
    setAoiData(newAois);
  };
  
  // Run the orbital propagation
  const handlePropagate = async () => {
    if (!tleData.trim()) {
      setError('Please enter TLE data');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/propagate', {
        tle: tleData,
        start_time: simulationParams.startTime.toISOString(),
        duration: simulationParams.duration,
        step_size: simulationParams.stepSize
      });
      
      if (response.data.status === 'success') {
        setTrajectoryData(response.data.data);
      } else {
        setError(response.data.message || 'Error in propagation');
      }
    } catch (err) {
      setError(`Error connecting to server: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run the AOI pass analysis
  const handleAnalyzePasses = async () => {
    if (!tleData.trim()) {
      setError('Please enter TLE data');
      return;
    }
    
    if (aoiData.length === 0) {
      setError('Please upload at least one GeoJSON file for AOIs');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Combine all GeoJSON data (simplistic approach, could be improved)
      const combinedGeojson = {
        type: 'FeatureCollection',
        features: aoiData.flatMap(aoi => {
          if (aoi.data.type === 'FeatureCollection') {
            return aoi.data.features;
          } else if (aoi.data.type === 'Feature') {
            return [aoi.data];
          }
          return [];
        })
      };
      
      const response = await axios.post('/api/analyze-passes', {
        tle: tleData,
        start_time: simulationParams.startTime.toISOString(),
        duration: simulationParams.duration,
        geojson: combinedGeojson
      });
      
      if (response.data.status === 'success') {
        setPassAnalysisData(response.data.data);
      } else {
        setError(response.data.message || 'Error in analysis');
      }
    } catch (err) {
      setError(`Error connecting to server: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sample TLE data
  const handleLoadSampleTle = () => {
    setTleData(`GEISAT PRECURSOR
1 56934U 23084C 25027.87418999 .00010104 00000+0 40662-3 0 9991
2 56934 97.5593 152.9665 0006604 335.8733 24.2194 15.25069846 90264`);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Orbital Propagator Settings
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* TLE Input */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <SatelliteIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Satellite TLE Data</Typography>
        </Box>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Enter TLE Data (3 lines including satellite name)"
          value={tleData}
          onChange={handleTleChange}
          size="small"
        />
        <Button 
          size="small" 
          sx={{ mt: 1 }}
          onClick={handleLoadSampleTle}
        >
          Load Sample TLE
        </Button>
      </Box>
      
      {/* Time Settings */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Simulation Time</Typography>
        </Box>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <DateTimePicker
            label="Start Time (UTC)"
            value={simulationParams.startTime}
            onChange={(newValue) => handleParamChange('startTime', newValue)}
            renderInput={(params) => <TextField size="small" {...params} />}
          />
        </FormControl>
        
        <Typography gutterBottom>Duration (hours): {simulationParams.duration}</Typography>
        <Slider
          value={simulationParams.duration}
          min={1}
          max={72}
          step={1}
          onChange={(_, value) => handleParamChange('duration', value)}
          valueLabelDisplay="auto"
          size="small"
        />
        
        <Typography gutterBottom>Step Size (minutes): {simulationParams.stepSize}</Typography>
        <Slider
          value={simulationParams.stepSize}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(_, value) => handleParamChange('stepSize', value)}
          valueLabelDisplay="auto"
          size="small"
        />
      </Box>
      
      {/* GeoJSON Upload */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PublicIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Areas of Interest (GeoJSON)</Typography>
        </Box>
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed #cccccc',
            borderRadius: 1,
            padding: 2,
            textAlign: 'center',
            cursor: 'pointer',
            mb: 2,
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <input {...getInputProps()} />
          <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography>Drop GeoJSON files here, or click to select</Typography>
        </Box>
        
        {/* Display uploaded AOIs */}
        {aoiData.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Uploaded Areas of Interest:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {aoiData.map((aoi, index) => (
                <Chip
                  key={index}
                  label={aoi.name}
                  onDelete={() => handleRemoveAoi(index)}
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handlePropagate}
          disabled={isLoading || !tleData.trim()}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SatelliteIcon />}
          fullWidth
        >
          Propagate Orbit
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleAnalyzePasses}
          disabled={isLoading || !tleData.trim() || aoiData.length === 0}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <TextSnippetIcon />}
          fullWidth
        >
          Analyze AOI Passes
        </Button>
      </Box>
      
      {/* Error Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default InputPanel; 