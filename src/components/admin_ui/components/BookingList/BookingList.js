import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FaDownload } from 'react-icons/fa';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp.seconds * 1000);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString();
};

const BookingList = () => {
  const [bookings, setBookings] = useState({
    pending: [],
    ongoing: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
  
      // Remove the booking from all states
      const updatedState = {
        pending: prev.pending.filter((b) => b.id !== booking.id),
        ongoing: prev.ongoing.filter((b) => b.id !== booking.id),
        done: prev.done.filter((b) => b.id !== booking.id),
      };
  
      // Add it to the target status
      updatedState[targetStatus] = [...updatedState[targetStatus], updatedBooking];
  
      // Save updated state to localStorage
      localStorage.setItem('bookings', JSON.stringify(updatedState));
  
      return updatedState;
    });
  };

  const updateBookingStatus = async (booking, targetStatus) => {
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, { status: targetStatus });
  };

  const deleteBooking = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const attendeesCollection = collection(bookingRef, 'attendees');
      const attendeesSnapshot = await getDocs(attendeesCollection);
      const deleteAttendeesPromises = attendeesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteAttendeesPromises);
      await deleteDoc(bookingRef);

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
      'Start Time': booking.startTime || 'N/A',
      'End Time': booking.endTime || 'N/A',
      'Contact Number': booking.contactNumber || 'N/A',
      Email: booking.email || 'N/A',
      'Payment Method': booking.paymentMethod || 'N/A',
      'Num Attendees': booking.numAttendees || 'N/A',
      Notes: booking.notes || 'N/A',
      'Menu Package': booking.menuPackage || 'N/A',
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
          (b) => ![...storedBookings.pending, ...storedBookings.ongoing, ...storedBookings.done].some(
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

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = new Date().setHours(0, 0, 0, 0); // Start of today
  
      setBookings((prevState) => {
        const updatedState = { ...prevState };
  
        // Move bookings from "pending" to "ongoing" based on the event date
        updatedState.pending = updatedState.pending.filter((booking) => {
          const eventDate = new Date(booking.eventDate.seconds * 1000).setHours(0, 0, 0, 0); // Normalize to just date (no time)
  
          if (eventDate === currentDate) {
            moveBooking(booking, 'ongoing');
            return false; // Remove from pending
          }
          return true;
        });
  
        // Move bookings from "ongoing" to "done" based on the event date
        updatedState.ongoing = updatedState.ongoing.filter((booking) => {
          const eventDate = new Date(booking.eventDate.seconds * 1000).setHours(0, 0, 0, 0); // Normalize to just date (no time)
          
          if (eventDate < currentDate) {
            moveBooking(booking, 'done');
            return false; // Remove from ongoing
          }
          return true;
        });
  
        // Move bookings from "pending" to "done" if event date has already passed
        updatedState.pending = updatedState.pending.filter((booking) => {
          const eventDate = new Date(booking.eventDate.seconds * 1000).setHours(0, 0, 0, 0); // Normalize to just date (no time)
          
          if (eventDate < currentDate) {
            moveBooking(booking, 'done');
            return false; // Remove from pending
          }
          return true;
        });
  
        return updatedState;
      });
    }, 1000); // Run every 1 second
  
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [moveBooking]);
  
  // Search function
  const filterBookings = (bookingsList) => {
    if (!searchQuery) return bookingsList; // If searchQuery is empty, return the full list
    return bookingsList.filter((booking) => {
      const searchLower = searchQuery.toLowerCase();

      return (
        (booking.name && booking.name.toLowerCase().includes(searchLower)) ||
        (booking.eventType && booking.eventType.toLowerCase().includes(searchLower)) ||
        (booking.startTime && booking.startTime.toLowerCase().includes(searchLower)) ||
        (booking.endTime && booking.endTime.toLowerCase().includes(searchLower)) ||
        (booking.contactNumber && typeof booking.contactNumber === 'string' && booking.contactNumber.toLowerCase().includes(searchLower)) || // Only call .toLowerCase() on strings
        (booking.email && booking.email.toLowerCase().includes(searchLower))
      );
    });
  };

  const renderBookings = (list, title, bgColor) => (
    <div
      style={{
        width: '30%',
        backgroundColor: bgColor,
        borderRadius: '10px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxHeight: '400px',
        overflowY: 'auto',
        margin: '10px',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '15px', fontWeight: 'lighter' }}>{title}</h2>
      {list.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>No bookings</p>
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
            <strong style={{ color: '#e1bee7', fontWeight: 'lighter' }}>{booking.name || 'Unnamed Booking'}</strong>
            <div style={{ marginTop: '10px' }}>
              <p style={{ color: '#d1c4e9' }}><strong>Event Date:</strong> {formatTimestamp(booking.eventDate)}</p>
              <p style={{ color: '#d1c4e9' }}><strong>Start Time:</strong> {booking.startTime}</p>
              <p style={{ color: '#d1c4e9' }}><strong>End Time:</strong> {booking.endTime}</p>
              {title === 'Pending' && (
                <button
                  onClick={() => deleteBooking(booking.id)}
                  style={{
                    backgroundColor: '#e91e63',
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
        padding: '40px',
        backgroundColor: '#f3e5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ color: '#9c27b0', marginBottom: '20px', fontWeight: 'lighter' }}>Booking List</h1>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search bookings..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: '8px 12px',
          fontSize: '16px',
          marginBottom: '20px',
          width: '60%',
          borderRadius: '5px',
          border: '1px solid #ccc',
        }}
      />
<div
  style={{
    backgroundColor: '#ffeb3b',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontWeight: 'bold',
    display: bookings.pending.length > 0 ? 'block' : 'none',
    textAlign: 'center',
  }}
>
  You have {bookings.pending.length} pending bookings.
</div>

      <button
        onClick={downloadExcel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          backgroundColor: '#9c27b0',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'lighter',
        }}
      >
        <FaDownload /> Download Bookings
      </button>

      {loading ? (
        <div style={{ color: '#9c27b0' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#e91e63' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'center' }}>
          {renderBookings(filterBookings(bookings.pending), 'Pending', '#9c27b0')}
          {renderBookings(filterBookings(bookings.ongoing), 'Todays Event', '#7e57c2')}
          {renderBookings(filterBookings(bookings.done), 'Done', '#673ab7')}
        </div>
      )}
    </div>
  );
};

export default BookingList;
