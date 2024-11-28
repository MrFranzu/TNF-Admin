import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig'; // Ensure db is initialized correctly
import { collection, getDocs, Timestamp } from 'firebase/firestore'; // Import Firestore methods
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Importing default styles for Calendar
import './Calendar.css';

const EventCalendar = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());

  const formatTime = (time) => {
    if (typeof time === 'string') {
      const [hour, minute] = time.split(':').map(Number);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
    return 'Invalid Time'; // Default fallback for invalid inputs
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

        // Convert eventDate if it's a Timestamp or string
        if (eventDate instanceof Timestamp) {
          eventDate = eventDate.toDate(); // Convert Firestore Timestamp to Date
        } else if (eventDate && typeof eventDate === 'string') {
          eventDate = new Date(eventDate); // Convert string to Date if it's a string
        }

        // Convert startTime and endTime from Timestamp or string to Date
        if (startTime instanceof Timestamp) {
          startTime = startTime.toDate(); // Convert Firestore Timestamp to Date
        } if (typeof startTime === 'string') {
          // Assume the string is already in "HH:mm" format
        } else if (startTime instanceof Timestamp) {
          startTime = startTime.toDate().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        } else {
          startTime = 'Invalid Time'; // Handle missing or unexpected values
        }
        
        if (typeof endTime === 'string') {
          // Assume the string is already in "HH:mm" format
        } else if (endTime instanceof Timestamp) {
          endTime = endTime.toDate().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        } else {
          endTime = 'Invalid Time'; // Handle missing or unexpected values
        }
        

        return { id: doc.id, ...data, eventDate, startTime, endTime };
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
        console.log('Fetched Bookings:', bookingsData); // Log data to verify
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
      }) ? 'booked-date' : null; // Highlight booked dates
    }
    return null;
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
      <h1 style={styles.title}>Event Calendar</h1> {/* Moved the title here */}
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
                <strong style={styles.eventName}>{event.name || 'Unnamed Event'}</strong>
                <p style={styles.eventDetails}>
                  {event.eventType || 'Unnamed Type'} - 
                  <span style={styles.highlight}>
                    {event.eventDate instanceof Date ? event.eventDate.toDateString() : 'N/A'}
                  </span>
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
                <p style={styles.eventAttendees}>Number of Attendees: <span style={styles.highlight}>{event.numAttendees || 'N/A'}</span></p>
                <p style={styles.eventScanned}>Scanned Count: <span style={styles.highlight}>{event.scannedCount || '0'}</span></p>
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
    alignItems: 'center', // Center the title
    backgroundColor: '#ffe6f2', // Light pink
    color: '#333',
    padding: '20px',
    borderRadius: '12px',
    maxWidth: '1000px', // Adjust width for better fit
    margin: '20px auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#e65100', // Light orange
    fontSize: '2.5em',
    margin: '10px 0',
    textAlign: 'center',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between', // Add space between the calendar and events
    alignItems: 'flex-start', // Align the top of the items
    width: '100%', // Ensure it takes full width
  },
  calendarContainer: {
    flex: 1, // Occupies 1/2 of the width
    marginRight: '20px',
  },
  eventsContainer: {
    flex: 1, // Occupies 1/2 of the width
    backgroundColor: '#fff', 
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    maxHeight: '500px', // Adjust the height based on your design
    overflowY: 'auto', // Enables scrolling when content exceeds the height
  },
  calendar: {
    borderRadius: '12px',
  },
  eventsTitle: {
    fontSize: '1.5em',
    marginBottom: '10px',
  },
  eventsList: {
    listStyleType: 'none',
    padding: '0',
    margin: '0',
  },
  eventItem: {
    backgroundColor: '#ffe6e6', // Light color for event item
    borderRadius: '8px',
    padding: '15px',
    margin: '10px 0',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  eventName: {
    fontWeight: 'bold',
    color: '#ff5733', // Darker orange for event name
  },
  eventDetails: {
    margin: '5px 0',
  },
  eventTime: {
    margin: '5px 0',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#ff5733', // Highlight color for important data
  },
  loading: {
    textAlign: 'center',
    margin: '20px 0',
    fontSize: '1.5em',
    color: '#ff3333', // Highlight loading in red
  },
  error: {
    color: '#ff3333', // Red for errors
    textAlign: 'center',
    margin: '20px 0',
  },
};


export default EventCalendar;
