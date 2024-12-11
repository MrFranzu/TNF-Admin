import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssessmentIcon from '@mui/icons-material/Assessment';
import QrCodeIcon from '@mui/icons-material/QrCode';
import StoreIcon from '@mui/icons-material/Store'; // Add store icon for the supply
import { useNavigate } from 'react-router-dom';
import logo from './tnf.png';
import GroupIcon from '@mui/icons-material/Group'; // Make sure to import GroupIcon


const Sidebar = () => {
  const navigate = useNavigate();

  const handleDashboardClick = () => navigate('/dashboard');
  const handleAttendClick = () => navigate('/attend');
  const handleEventsClick = () => navigate('/events');
  const handleCalendarClick = () => navigate('/calendar');
  const handleQrGeneratorClick = () => {
    window.open('https://tnfattendance.netlify.app/', '_blank'); // Open external URL
  };
  const handleQrScannerClick = () => navigate('/qr-scanner');
  const handleAnalysisClick = () => navigate('/analytics'); // Navigate to Analytics
  const handleSupplyClick = () => navigate('/supply'); // Navigate to Supply page

  const ListItemLink = ({ icon, text, onClick }) => (
    <ListItem
      button
      onClick={onClick}
      sx={{ bgcolor: 'transparent', borderRadius: '8px', '&:hover': { bgcolor: '#ffcccb' } }}
    >
      <ListItemIcon sx={{ color: '#ff6f61' }}>{icon}</ListItemIcon>
      <ListItemText primary={text} sx={{ color: '#333' }} />
    </ListItem>
  );

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: '240px',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: '240px',
          backgroundColor: '#ffe4e1',
          color: '#333',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <img src={logo} alt="Logo" style={{ width: '80px', height: 'auto', marginRight: '10px' }} />
        <h2 style={{ fontSize: '1.5rem', color: '#ff6f61', margin: 0 }}>Admin</h2>
      </div>
      <List>
        <ListItemLink
          icon={<DashboardIcon />}
          text="Dashboard"
          onClick={handleDashboardClick}
        />
        <ListItemLink
          icon={<GroupIcon />}
          text="Attendees"
          onClick={handleAttendClick}
        />
        <ListItemLink
          icon={<EventIcon />}
          text="Booking List"
          onClick={handleEventsClick}
        />
        <ListItemLink
          icon={<CalendarTodayIcon />}
          text="Calendar"
          onClick={handleCalendarClick}
        />
        <ListItemLink
          icon={<AssessmentIcon />}
          text="Analytics"
          onClick={handleAnalysisClick} 
        />
        <ListItemLink
          icon={<StoreIcon />}
          text="Supply"
          onClick={handleSupplyClick} 
        />
        <ListItemLink
          icon={<QrCodeIcon />}
          text="QR Code Generator"
          onClick={handleQrGeneratorClick}
        />
        <ListItemLink
          icon={<QrCodeIcon />}
          text="QR Code Scanner"
          onClick={handleQrScannerClick}
        />
      </List>
    </Drawer>
  );
};

export default Sidebar;
