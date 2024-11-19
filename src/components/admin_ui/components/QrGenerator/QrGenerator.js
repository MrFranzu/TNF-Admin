import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QrGenerator = () => {
  const [inputValue, setInputValue] = useState('');
  const [qrValue, setQrValue] = useState('');

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleGenerate = () => {
    setQrValue(inputValue);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px', 
      backgroundColor: '#ffe6f1', // Soft pink background
      minHeight: '100vh' 
    }}>
      <h1 style={{ color: '#fd7e14' }}>QR Code Generator</h1> {/* Orange title */}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Enter text to generate QR"
        style={{
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #fd7e14', // Orange border
          marginBottom: '15px',
          width: '300px',
          textAlign: 'center'
        }}
      />
      <button 
        onClick={handleGenerate} 
        style={{ 
          backgroundColor: '#fd7e14', // Orange button
          color: '#fff', 
          border: 'none', 
          borderRadius: '5px', 
          padding: '10px 20px', 
          cursor: 'pointer', 
          transition: 'background-color 0.3s' 
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff5722'} // Darker orange on hover
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fd7e14'}
      >
        Generate QR Code
      </button>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        {qrValue && <QRCodeSVG value={qrValue} size={256} />}
      </div>
    </div>
  );
};

export default QrGenerator;
