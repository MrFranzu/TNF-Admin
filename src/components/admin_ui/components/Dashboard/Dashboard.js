import React, { useEffect, useState } from 'react';
import { db1, db } from '../../firebaseConfig';  // Adjust the path if necessary
import { collection, getDocs } from 'firebase/firestore';

// Helper function to format the timestamp into a readable date
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString();
};

// Dashboard component
const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [attendeesTotal, setAttendeesTotal] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fixed conversion rate from USD to PHP
  const conversionRate = 57;  // Example rate, adjust as needed.

  // Function to fetch bookings data from both Firestore databases
  const fetchBookings = async () => {
    try {
      const bookingsCollection1 = collection(db1, 'csvData');  // Fetch from 'csvData' collection of Project 1
      const bookingsCollection2 = collection(db, 'bookings');  // Fetch from 'bookings' collection of Project 2

      const snapshot1 = await getDocs(bookingsCollection1);
      const snapshot2 = await getDocs(bookingsCollection2);

      const bookingsData = [
        ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];

      if (bookingsData.length === 0) return [];
      return bookingsData;
    } catch (error) {
      setError(`Failed to fetch bookings: ${error.message || 'Please try again later.'}`);
      throw error;
    }
  };

  // Fetch and process bookings on component mount
  useEffect(() => {
    const getBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookingsData = await fetchBookings();
        setBookings(bookingsData);
        processMonthlyData(bookingsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getBookings();
  }, []);

  // Function to process monthly data, total attendees, and total sales
  const processMonthlyData = (data) => {
    const monthlyCounts = {};
    let totalAttendees = 0;
    let totalSales = 0;

    data.forEach(booking => {
      // Convert 'eventDate' (timestamp) to a date string
      const date = formatTimestamp(booking.eventDate);
      const month = new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' });

      // Convert 'Full Payment' string to a number (float) and 'No. of persons' string to a number (integer)
      const fullPayment = parseFloat(booking['Full Payment']) || 0;  // Ensure it’s a number, default to 0 if invalid
      const numPersons = parseInt(booking['No. of persons'], 10) || 0; // Ensure it's an integer, default to 0 if invalid

      // Add to total attendees and sales (convert to PHP)
      totalAttendees += numPersons;
      totalSales += fullPayment * conversionRate;

      // Count bookings per month
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });

    setMonthlyData(monthlyCounts);
    setAttendeesTotal(totalAttendees);
    setSalesTotal(totalSales);
  };

  // Handle month change
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // Handle year change
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // Filter monthly data based on selected month and year
  const filteredMonthlyData = Object.entries(monthlyData).filter(([month]) => {
    // Split the month and year (e.g. 'January 2024')
    const [monthName, year] = month.split(' ');

    // Get the month index from the month name
    const monthIndex = new Date(Date.parse(monthName + " 1, 2020")).getMonth();

    // Check if it matches the selected month and year
    return monthIndex === selectedMonth && parseInt(year) === selectedYear;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f8f4f9', // Soft background for the whole page
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        backgroundColor: '#ff69b4', // Pink background for header
        borderRadius: '10px',
        marginBottom: '40px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
        }}>Dashboard</h1>
        <div>
          <input
            type="number"
            value={selectedYear}
            onChange={handleYearChange}
            min="2000"
            max={new Date().getFullYear()}
            style={{
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ff69b4', // Border color matching header
              backgroundColor: '#ffffff',
              color: '#ff69b4', // Text color matching header
              marginLeft: '20px',
            }}
          />
          <select value={selectedMonth} onChange={handleMonthChange} style={{
            padding: '10px',
            borderRadius: '5px',
            border: '1px solid #ff69b4',
            backgroundColor: '#ffffff',
            color: '#ff69b4',
            marginLeft: '20px',
          }}>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index}>
                {new Date(0, index).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns layout for desktop
        gap: '30px',
        padding: '20px',
      }}>
        {loading ? (
          <div style={{ color: '#ff8c00', fontSize: '18px', fontStyle: 'italic' }}>Loading...</div>
        ) : error ? (
          <div style={{ color: '#e74c3c', fontSize: '18px' }}>{error}</div>
        ) : (
          <>
            {/* Total Bookings Box */}
            <div style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '22px', color: '#ff69b4', fontWeight: 'bold' }}>Total Bookings</h3>
              <p style={{ fontSize: '24px', color: '#333' }}>{bookings.length}</p>
            </div>

            {/* Total Attendees Box */}
            <div style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '22px', color: '#ff69b4', fontWeight: 'bold' }}>Total Attendees</h3>
              <p style={{ fontSize: '24px', color: '#333' }}>{attendeesTotal}</p>
            </div>

            {/* Total Sales Box */}
            <div style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '22px', color: '#ff69b4', fontWeight: 'bold' }}>Total Sales (₱)</h3>
              <p style={{ fontSize: '24px', color: '#333' }}>{salesTotal.toFixed(2)}</p>
            </div>

            {/* Monthly Data */}
            <div style={{
              gridColumn: 'span 3', // Full width for monthly data
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            }}>
              <h3 style={{ fontSize: '22px', color: '#ff69b4', fontWeight: 'bold' }}>Bookings by Month</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginTop: '20px',
              }}>
                {filteredMonthlyData.length > 0 ? (
                  filteredMonthlyData.map(([month, count]) => (
                    <div key={month} style={{
                      backgroundColor: '#ffebf0', // Light pink background for month cards
                      padding: '20px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                      textAlign: 'center',
                      transition: 'transform 0.2s',
                    }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} >
                      <strong style={{ fontSize: '18px', color: '#ff69b4' }}>{month}</strong>
                      <p style={{ color: '#333' }}>Bookings: {count}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#ff69b4', fontStyle: 'italic' }}>No bookings available for this period.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
