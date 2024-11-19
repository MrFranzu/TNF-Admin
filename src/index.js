import React from 'react';
import ReactDOM from 'react-dom/client'; // Using ReactDOM.createRoot for React 18
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Create a root for rendering the app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component wrapped in React.StrictMode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
  
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
