import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';

const EventCalendar = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());
  const [editableMenuPackage, setEditableMenuPackage] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const formatTime = (time) => {
    if (typeof time === 'string') {
      const [hour, minute] = time.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
    return 'Invalid Time';
  };

  const fetchBookings = async () => {
    try {
      const bookingsCollection = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsCollection);
      if (snapshot.empty) {
        console.log('No bookings found');
        return [];
      }
      return snapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = data.eventDate;
        let startTime = data.startTime;
        let endTime = data.endTime;
  
        // Fetching additional fields
        let location = data.location;
        let event = data.event; // Assuming 'event' refers to the event name or details
        let eventType = data.eventType; // Type of event
        let eventTheme = data.eventTheme; // Existing field
  
        // Handling timestamps
        if (eventDate instanceof Timestamp) {
          eventDate = eventDate.toDate();
        } else if (eventDate && typeof eventDate === 'string') {
          eventDate = new Date(eventDate);
        }
  
        if (startTime instanceof Timestamp) {
          startTime = startTime.toDate();
        }
  
        if (endTime instanceof Timestamp) {
          endTime = endTime.toDate();
        }
  
        return { id: doc.id, ...data, eventDate, startTime, endTime, location, event, eventType, eventTheme };
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(`Failed to fetch bookings: ${error.message || 'Please try again later.'}`);
      return [];
    }
  };
  

  useEffect(() => {
    const getBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookingsData = await fetchBookings();
        setBookings(bookingsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    getBookings();
  }, []);

  const handleDateChange = (newDate) => {
    setDate(new Date(newDate));
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      return bookings.some(event => {
        const eventDate = event.eventDate;
        return eventDate instanceof Date &&
               date.getFullYear() === eventDate.getFullYear() &&
               date.getMonth() === eventDate.getMonth() &&
               date.getDate() === eventDate.getDate();
      }) ? 'booked-date' : null;
    }
    return null;
  };

  const handleMenuPackageChange = (eventId, newMenuPackage) => {
    setEditableMenuPackage(prevState => ({
      ...prevState,
      [eventId]: newMenuPackage,
    }));
  };

  const saveMenuPackage = async (eventId, newMenuPackage) => {
    setIsSaving(true);
    try {
      const eventRef = doc(db, 'bookings', eventId);
      await updateDoc(eventRef, { menuPackage: newMenuPackage });
      setBookings(prevBookings =>
        prevBookings.map(event =>
          event.id === eventId ? { ...event, menuPackage: newMenuPackage } : event
        )
      );
      alert('Menu Package updated successfully!');
    } catch (error) {
      console.error('Error updating menu package:', error);
      alert('Failed to update menu package');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  const eventsForSelectedDate = bookings.filter(event => {
    const eventDate = event.eventDate;
    return eventDate instanceof Date && (
      eventDate.getFullYear() === date.getFullYear() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getDate() === date.getDate()
    );
  });

  return (
    <div style={styles.outerContainer}>
      <h1 style={styles.title}>Event Calendar</h1>
      <div style={styles.container}>
        <div style={styles.calendarContainer}>
          <Calendar
            onChange={handleDateChange}
            value={date}
            tileClassName={tileClassName}
            style={styles.calendar}
          />
        </div>
        <div style={styles.eventsContainer}>
          <h2 style={styles.eventsTitle}>Event on {date.toDateString()}:</h2>
          {eventsForSelectedDate.length > 0 ? (
            <ul style={styles.eventsList}>
           {eventsForSelectedDate.map(event => (
  <li key={event.id} style={styles.eventItem}>
    {/* Make eventTheme the main title */}
    <strong style={styles.eventName}>{event.eventTheme || 'Unnamed Theme'}</strong>
    <p style={styles.eventDetails}>
      Event: {event.event || 'Unnamed Event'} - 
      Type: {event.eventType || 'Unnamed Type'} - 
      <span style={styles.highlight}>
        {event.eventDate instanceof Date ? event.eventDate.toDateString() : 'N/A'}
      </span>
    </p>
    <p style={styles.eventLocation}>
      Location: <span style={styles.highlight}>{event.location || 'No location specified'}</span>
    </p>
    <p style={styles.eventTime}>
      Start Time: <span style={styles.highlight}>
        {event.startTime ? formatTime(event.startTime) : 'N/A'}
      </span>
    </p>
    <p style={styles.eventTime}>
      End Time: <span style={styles.highlight}>
        {event.endTime ? formatTime(event.endTime) : 'N/A'}
      </span>
    </p>

                  <p style={styles.eventContact}>Contact: <span style={styles.highlight}>{event.contactNumber || 'N/A'}</span></p>
                  <p style={styles.eventEmail}>Email: <span style={styles.highlight}>{event.email || 'N/A'}</span></p>
                  <p style={styles.eventPayment}>Payment Method: <span style={styles.highlight}>{event.paymentMethod || 'N/A'}</span></p>
                  <p style={styles.eventAttendees}>Number of pax: <span style={styles.highlight}>{event.numAttendees || 'N/A'}</span></p>
                  <p style={styles.eventScanned}>Scanned Count: <span style={styles.highlight}>{event.scannedCount || '0'}</span></p>

                  {event.menuPackage ? (
                    <div>
                      <p style={styles.eventMenuPackage}>Menu Package: 
                        <span style={styles.highlight}>
                          {editableMenuPackage[event.id] || event.menuPackage}
                        </span>
                      </p>
                      <input
                        type="text"
                        value={editableMenuPackage[event.id] || event.menuPackage}
                        onChange={(e) => handleMenuPackageChange(event.id, e.target.value)}
                        style={styles.input}
                      />
                      <button
                        onClick={() => saveMenuPackage(event.id, editableMenuPackage[event.id] || event.menuPackage)}
                        disabled={isSaving}
                        style={styles.saveButton}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <p>No Menu Package available</p>
                  )}

                  {event.notes && <p style={styles.eventNotes}>Notes: <span style={styles.highlight}>{event.notes}</span></p>}
                  {event.qrCode && <p style={styles.eventQr}>QR Code: <span style={styles.highlight}>{event.qrCode}</span></p>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No events for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  outerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    color: '#6a0dad',  // violet text
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#6a0dad',  // violet color
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '1200px',
  },
  calendarContainer: {
    flex: 1,
    paddingRight: '20px',
  },
  eventsContainer: {
    flex: 2,
    paddingLeft: '20px',
    maxWidth: '600px',
    maxHeight: '500px',  // Set a maximum height for the container
    overflowY: 'auto',   // Enables vertical scrolling if content overflows
  },
  eventsTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
    fontWeight: 'bold',
    color: '#6a0dad',  // violet text
  },
  eventsList: {
    listStyleType: 'none',
    padding: 0,
  },
  eventItem: {
    marginBottom: '20px',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  eventName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#6a0dad',  // violet color
  },
  eventDetails: {
    fontSize: '1rem',
    color: '#555',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#6a0dad',  // violet color
  },
  eventTime: {
    fontSize: '1rem',
    marginBottom: '10px',
  },
  eventContact: {
    fontSize: '1rem',
  },
  eventEmail: {
    fontSize: '1rem',
  },
  eventPayment: {
    fontSize: '1rem',
  },
  eventAttendees: {
    fontSize: '1rem',
  },
  eventScanned: {
    fontSize: '1rem',
  },
  eventMenuPackage: {
    fontSize: '1rem',
    marginBottom: '10px',
  },
  eventNotes: {
    fontSize: '1rem',
    marginTop: '10px',
  },
  eventQr: {
    fontSize: '1rem',
    marginTop: '10px',
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '10px',
    fontSize: '1rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  saveButton: {
    backgroundColor: '#6a0dad',  // violet color
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    marginTop: '10px',
    fontSize: '1rem',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  loading: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  error: {
    fontSize: '1.5rem',
    color: 'red',
    fontWeight: 'bold',
  },
};


export default EventCalendar;
