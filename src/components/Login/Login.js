import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import tnfLogo from './tnf.png';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        const hardcodedEmail = 'ailingraceordonezdimacuha@gmail.com';
        const hardcodedPassword = 'admin123';

        if (email === hardcodedEmail && password === hardcodedPassword) {
            onLogin();
            navigate('/Dashboard'); // Navigate to main content
        } else {
            alert('Invalid email or password!');
        }
    };

    return (
        <div className="container">
            <div className="form-container">
                <img src={tnfLogo} alt="TNF Logo" className="logo" />
                <h1 className="title">Welcome!</h1>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="button">Log In</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
