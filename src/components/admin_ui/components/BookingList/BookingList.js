import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FaDownload } from 'react-icons/fa';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const BookingList = () => {
  const [bookings, setBookings] = useState({
    pending: [],
    ongoing: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const syncWithStorage = useCallback((state) => {
    localStorage.setItem('bookings', JSON.stringify(state));
  }, []);

  const fetchBookings = async () => {
    try {
      const bookingsCollection = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsCollection);
      if (snapshot.empty) return [];

      const bookings = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('Fetched booking data:', data);
        return {
          id: doc.id,
          ...data,
          scannedCount: data.scannedCount || 0,
        };
      });

      return bookings;
    } catch (err) {
      setError(`Failed to fetch bookings: ${err.message}`);
      console.error('Error fetching bookings:', err);
      throw err;
    }
  };

  const loadFromStorage = () => {
    const storedData = JSON.parse(localStorage.getItem('bookings'));
    if (storedData) {
      setBookings(storedData);
    }
  };

  const moveBooking = (booking, targetStatus) => {
    setBookings((prev) => {
      const updatedBooking = { ...booking };
      updatedBooking.scannedCount = updatedBooking.scannedCount || 0;

      const updatedState = {
        pending: prev.pending.filter((b) => b.id !== booking.id),
        ongoing: prev.ongoing.filter((b) => b.id !== booking.id),
        done: prev.done.filter((b) => b.id !== booking.id),
      };

      updatedState[targetStatus] = [...updatedState[targetStatus], updatedBooking];

      syncWithStorage(updatedState);
      return updatedState;
    });
  };

  const downloadExcel = () => {
    const allBookings = [
      ...bookings.pending,
      ...bookings.ongoing,
      ...bookings.done,
    ].map((booking) => ({
      Name: booking.name || 'N/A',
      'Event Type': booking.eventType || 'N/A',
      'Event Date': formatTimestamp(booking.eventDate),
      'Contact Number': booking.contactNumber || 'N/A',
      Email: booking.email || 'N/A',
      'Payment Method': booking.paymentMethod || 'N/A',
      'Num Attendees': booking.numAttendees || 'N/A',
      Notes: booking.notes || 'N/A',
      'Scanned Count': booking.scannedCount || 0,
    }));

    console.log('Bookings for export:', allBookings);

    const ws = XLSX.utils.json_to_sheet(allBookings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    
    XLSX.writeFile(wb, 'Bookings_List.xlsx');
  };

  useEffect(() => {
    loadFromStorage();
    const initialize = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedBookings = await fetchBookings();
        const storedBookings = JSON.parse(localStorage.getItem('bookings')) || { pending: [], ongoing: [], done: [] };

        const newBookings = fetchedBookings.filter(
          (b) =>
            ![...storedBookings.pending, ...storedBookings.ongoing, ...storedBookings.done].some(
              (existing) => existing.id === b.id
            )
        );

        const updatedBookings = { ...storedBookings, pending: [...storedBookings.pending, ...newBookings] };
        setBookings(updatedBookings);
        syncWithStorage(updatedBookings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!bookings.pending.length && !bookings.ongoing.length && !bookings.done.length) {
      initialize();
    }
  }, []);

  const renderBookings = (list, title, bgColor, targetStates) => (
    <div
      style={{
        width: '30%',
        backgroundColor: bgColor,
        borderRadius: '10px',
        padding: '15px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '15px' }}>{title}</h2>
      {list.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>No bookings</p>
      ) : (
        list.map((booking) => (
          <div
            key={booking.id}
            style={{
              backgroundColor: `${bgColor}99`,
              marginBottom: '10px',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <strong>{booking.name || 'Unnamed Booking'}</strong>
            <div style={{ marginTop: '10px' }}>
              {targetStates.map(({ label, state, color }) => (
                <button
                  key={state}
                  onClick={() => moveBooking(booking, state)}
                  style={{
                    backgroundColor: color,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginRight: '10px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fce4ec', // Light pink background for the main page
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1 style={{ color: '#d81b60', marginBottom: '20px' }}>Booking List</h1>
      <button
        onClick={downloadExcel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          backgroundColor: '#f57c00', // Orange button
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <FaDownload /> Download Bookings
      </button>
      {loading ? (
        <div style={{ color: '#f57c00' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'center' }}>
          {renderBookings(bookings.pending, 'Pending', '#fce4ec', [
            { label: 'Move to Ongoing', state: 'ongoing', color: '#ff4081' },
            { label: 'Move to Done', state: 'done', color: '#4caf50' },
          ])}
          {renderBookings(bookings.ongoing, 'Ongoing', '#fff3e0', [
            { label: 'Move to Pending', state: 'pending', color: '#ff7043' },
            { label: 'Move to Done', state: 'done', color: '#4caf50' },
          ])}
          {renderBookings(bookings.done, 'Done', '#f1f8e9', [
            { label: 'Move to Ongoing', state: 'ongoing', color: '#ff4081' },
          ])}
        </div>
      )}
    </div>
  );
};

export default BookingList;
