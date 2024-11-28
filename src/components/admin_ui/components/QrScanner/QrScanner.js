import React, { useState, useCallback, useRef } from 'react';
import { QrReader } from 'react-qr-reader';
import { db } from '../../firebaseConfig'; // Adjust path if necessary
import { doc, setDoc, getDoc } from 'firebase/firestore';

const QrScanner = () => {
  const [lastScannedData, setLastScannedData] = useState('');
  const [isScanning, setIsScanning] = useState(false); // Track scanning status
  const [statusMessage, setStatusMessage] = useState(''); // Store status message
  const debounceTimeout = useRef(null);

  const handleResult = useCallback(
    async (scanResult) => {
      if (!scanResult?.text) return;

      // Indicate that scanning has started
      setIsScanning(true);

      const scannedData = scanResult.text.trim();
      setLastScannedData(scannedData);

      try {
        const { eventCode, name, numPeople } = JSON.parse(scannedData);
        const eventRef = doc(db, 'bookings', eventCode);

        const docSnap = await getDoc(eventRef);
        const attendeeRef = doc(db, 'bookings', eventCode, 'attendees', name);

        if (docSnap.exists()) {
          await setDoc(attendeeRef, {
            name,
            numPeople,
            scannedAt: new Date().toISOString(),
          }, { merge: true });
          setStatusMessage('Attendee successfully scanned and saved.');
        } else {
          setStatusMessage('Event not found in the database.');
        }
      } catch (err) {
        console.error('Error handling scanned data:', err);
        setStatusMessage('Invalid QR code data.');
      }

      // Reset scanning status after a short delay
      setTimeout(() => {
        setIsScanning(false);
        setStatusMessage(''); // Clear status message after a while
      }, 3000);
    },
    []
  );

  const debounceScan = useCallback(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setLastScannedData(''), 1000);
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>QR Code Scanner</h2>
      <QrReader
        onResult={handleResult}
        facingMode="environment"
        style={styles.qrReader}
      />
      <p style={styles.instruction}>Point your camera at a QR code</p>

      {/* Show scanning indication */}
      {isScanning && <p style={styles.scanningText}>Scanning...</p>}

      {/* Display status message */}
      {statusMessage && <p style={styles.statusMessage}>{statusMessage}</p>}
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '500px',
    margin: '50px auto',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #ddd',
  },
  header: {
    fontSize: '2rem',
    color: '#6A4C9C', // Violet color
    marginBottom: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  instruction: {
    marginTop: '10px',
    color: '#555',
    fontSize: '1.1rem',
  },
  scanningText: {
    marginTop: '10px',
    color: '#4B8DFF', // A light blue to indicate scanning
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  statusMessage: {
    marginTop: '15px',
    color: '#FF5722', // Orange-red for error or success messages
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  qrReader: {
    width: '100%',
    maxWidth: '400px',
    marginTop: '20px',
    border: '2px solid #6A4C9C',
    borderRadius: '8px',
  },
};

export default QrScanner;
