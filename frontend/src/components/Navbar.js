import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';

const Navbar = () => {
  return (
    <AppBar position="static" color="primary" elevation={4}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SatelliteAltIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
            Orbital Propagator
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="inherit">
          Mission Analysis Tool
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 