import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from './components/admin_ui/Sidebar';
import Login from './components/Login/Login';
import Dashboard from './components/admin_ui/components/Dashboard/Dashboard';
import Event from './components/admin_ui/components/BookingList/BookingList';
import EventCalendar from './components/admin_ui/components/Calendar/Calendar';
import QrGenerator from './components/admin_ui/components/QrGenerator/QrGenerator';
import QrScanner from './components/admin_ui/components/QrScanner/QrScanner';
import EventAnalytics from './components/admin_ui/analytics/EventAnalytics';
import './App.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <div className="container">
        {isLoggedIn && <Sidebar />}
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <div>
                  <h3>Welcome to the Dashboard</h3>
                  <p>Here you can manage your events.</p>
                  <EventAnalytics /> {/* Added EventAnalytics here */}
                </div>
              ) : (
                <div className="login-form">
                  <Login onLogin={handleLogin} />
                </div>
              )
            }
          />
          <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/events" element={isLoggedIn ? <Event /> : <Navigate to="/" />} />
          <Route path="/calendar" element={isLoggedIn ? <EventCalendar /> : <Navigate to="/" />} />
          <Route path="/qr-generator" element={isLoggedIn ? <QrGenerator /> : <Navigate to="/" />} />
          <Route path="/qr-scanner" element={isLoggedIn ? <QrScanner /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/"} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
