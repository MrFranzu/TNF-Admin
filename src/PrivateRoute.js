// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ isAuthenticated, component: Component }) => {
    return isAuthenticated ? <Component /> : <Navigate to="/login" />;
};

export default PrivateRoute;
