import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QrReader } from 'react-qr-reader';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const QrScanner = () => {
  const [lastScannedData, setLastScannedData] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false); // New state to track scanning status
  const debounceTimeout = useRef(null);

  // Stop scanning after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setScanning(false); // Stop scanning after 30 seconds
    }, 30000); // Timeout after 30 seconds
    return () => clearTimeout(timeout);
  }, []);

  const handleResult = useCallback(
    async (scanResult, scanError) => {
      if (scanError) {
        console.error('QR Decoding Error:', scanError);
        return;
      }

      if (!scanResult?.text) {
        console.log('No valid QR code found.');
        return;
      }

      const scannedData = scanResult.text.trim();

      // Prevent handling duplicate scans
      if (scannedData === lastScannedData) {
        console.warn('Duplicate scan ignored:', scannedData);
        return;
      }

      // Update the last scanned data and trigger animation
      setLastScannedData(scannedData);
      setScanned(true); // Trigger animation
      setScanning(true); // Indicate scanning is in progress

      // Proceed with Firestore update
      const eventRef = doc(db, 'bookings', scannedData);
      try {
        const docSnap = await getDoc(eventRef);
        if (docSnap.exists()) {
          const scannedCount = docSnap.data().scannedCount || 0;
          await setDoc(eventRef, { scannedCount: scannedCount + 1 }, { merge: true });
        } else {
          await setDoc(eventRef, { scannedCount: 1 });
        }
      } catch (err) {
        console.error('Error accessing Firestore:', err);
      }

      // Reset animation state after a short delay
      setTimeout(() => {
        setScanned(false);
        setScanning(false); // Stop scanning status
      }, 1000); // Short delay for animation reset
    },
    [lastScannedData]
  );

  const handleError = (cameraError) => {
    console.error('QrReader Error:', cameraError);
    let message = 'Unable to access camera. Please check permissions.';
    if (cameraError.name === 'NotAllowedError') {
      message = 'Camera access denied. Please allow camera permissions.';
    } else if (cameraError.name === 'NotFoundError') {
      message = 'No camera detected. Please connect a camera.';
    } else {
      message = `An unexpected error occurred: ${cameraError.message}`;
    }
    console.error(message);
  };

  // Debounce logic to prevent multiple scans in quick succession
  const debounceScan = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setScanning(true); // Indicate scanning is in progress
    }, 500); // Debounce delay
  }, []);

  // Animation styling
  const scanAnimationStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#FF6F61', // Coral orange color
    animation: 'pulse 1s ease-in-out', // Pulse animation
    animationIterationCount: '1',
    margin: '0 auto', // Center animation
  };

  return (
    <div className="qr-scanner" style={{ backgroundColor: '#F8E1F4', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
      <h2 style={{ color: '#FF4081', fontSize: '2rem', marginBottom: '20px' }}>QR Code Scanner</h2>
      
      {scanned && (
        <div style={scanAnimationStyle}></div> // Animation when QR is successfully scanned
      )}

      {scanning && <p style={{ color: '#FF4081' }}>Scanning...</p>}  {/* Show "Scanning..." message */}

      <QrReader
        onResult={handleResult}
        onError={handleError}
        facingMode="environment"
        className="qr-reader"
        onScan={debounceScan} // Debounce function to avoid too many scans
        style={{ borderRadius: '8px', boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)', marginTop: '20px' }}
      />
      
      <p style={{ color: '#FF4081', marginTop: '20px' }}>Scan a QR code to update bookings</p>
    </div>
  );
};

export default QrScanner;
