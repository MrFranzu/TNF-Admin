import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
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
    try {
      localStorage.setItem('bookings', JSON.stringify(state));
    } catch (err) {
      console.error('Failed to sync with local storage:', err);
    }
  }, []);

  const fetchBookings = async () => {
    try {
      const bookingsCollection = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsCollection);
      if (snapshot.empty) return [];

      const bookings = snapshot.docs.map((doc) => {
        const data = doc.data();
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
    try {
      const storedData = JSON.parse(localStorage.getItem('bookings'));
      if (storedData) {
        setBookings(storedData);
      }
    } catch (err) {
      console.error('Error loading from storage:', err);
      setError('Failed to load local storage data.');
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
      return updatedState;
    });
  };

  const deleteBooking = async (bookingId) => {
    try {
      // Reference to the booking document
      const bookingRef = doc(db, 'bookings', bookingId);
      
      // Get the attendees subcollection
      const attendeesCollection = collection(bookingRef, 'attendees');
      const attendeesSnapshot = await getDocs(attendeesCollection);
      
      // Delete all documents in the attendees subcollection
      const deleteAttendeesPromises = attendeesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteAttendeesPromises);  // Wait for all deletions to complete

      // Now delete the booking document itself
      await deleteDoc(bookingRef);

      // Update the local state to remove the booking from the UI
      setBookings((prev) => {
        const updatedState = {
          pending: prev.pending.filter((b) => b.id !== bookingId),
          ongoing: prev.ongoing.filter((b) => b.id !== bookingId),
          done: prev.done.filter((b) => b.id !== bookingId),
        };
        return updatedState;
      });
    } catch (err) {
      setError(`Failed to cancel booking: ${err.message}`);
      console.error('Error deleting booking:', err);
    }
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
  }, [syncWithStorage]);

  useEffect(() => {
    syncWithStorage(bookings);
  }, [bookings, syncWithStorage]);

  const renderBookings = (list, title, bgColor, targetStates) => (
    <div
      style={{
        width: '30%',
        backgroundColor: bgColor,
        borderRadius: '10px',
        padding: '15px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxHeight: '400px',
        overflowY: 'auto',
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
              <p><strong>Event Date:</strong> {formatTimestamp(booking.eventDate)}</p>
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
              {title === 'Pending' && (
                <button
                  onClick={() => deleteBooking(booking.id)}
                  style={{
                    backgroundColor: '#f44336',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginTop: '10px',
                  }}
                >
                  Cancel Booking
                </button>
              )}
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
        backgroundColor: '#fce4ec',
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
          backgroundColor: '#f57c00',
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
          {renderBookings(bookings.ongoing, 'Ongoing', '#e3f2fd', [
            { label: 'Move to Done', state: 'done', color: '#4caf50' },
            { label: 'Move to Pending', state: 'pending', color: '#ff4081' },
          ])}
          {renderBookings(bookings.done, 'Done', '#e8f5e9', [
            { label: 'Move to Pending', state: 'pending', color: '#ff4081' },
            { label: 'Move to Ongoing', state: 'ongoing', color: '#03a9f4' },
          ])}
        </div>
      )}
    </div>
  );
};

export default BookingList;
