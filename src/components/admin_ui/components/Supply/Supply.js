import React, { useState, useEffect } from "react";
import Calendar from "react-calendar"; // Install via npm install react-calendar
import "react-calendar/dist/Calendar.css"; // Calendar CSS
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

function EventCalendar() {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [allocatedSupplies, setAllocatedSupplies] = useState({});

  const SUPPLIES_PER_ATTENDEE = {
    chairs: 1,
    tables: 0.2,
    plates: 1.2,
    bowls: 1.1,
    napkins: 2.1,
    utensils: 2.5,
  };

  useEffect(() => {
    const fetchBookings = async () => {
      const bookingsCollection = collection(db, "bookings");
      const bookingsSnapshot = await getDocs(bookingsCollection);

      const fetchedBookings = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setBookings(fetchedBookings);
      allocateSupplies(fetchedBookings);
    };

    fetchBookings();
  }, []);

  const allocateSupplies = (bookings) => {
    const allocations = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.eventDate.seconds * 1000).toDateString();
      const numAttendees = booking.numAttendees;

      if (!allocations[date]) {
        allocations[date] = {};
      }

      Object.keys(SUPPLIES_PER_ATTENDEE).forEach((supply) => {
        const neededSupply = Math.ceil(
          numAttendees * SUPPLIES_PER_ATTENDEE[supply]
        );
        allocations[date][supply] =
          (allocations[date][supply] || 0) + neededSupply;
      });
    });

    setAllocatedSupplies(allocations);
  };

  const bookedDates = bookings.map((booking) =>
    new Date(booking.eventDate.seconds * 1000)
  );

  const renderSuppliesForDate = (date) => {
    const dateString = date.toDateString();
    const suppliesForDate = allocatedSupplies[dateString];

    if (!suppliesForDate) {
      return <p style={{ color: "#6A1B9A" }}>No bookings for this date.</p>;
    }

    return (
      <ul>
        {Object.keys(suppliesForDate).map((supply) => (
          <li
            key={supply}
            style={{
              marginBottom: "10px",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                backgroundColor: "#BA68C8",
                borderRadius: "50%",
              }}
            ></span>
            <strong>
              {supply.charAt(0).toUpperCase() + supply.slice(1)}:
            </strong>{" "}
            {suppliesForDate[supply]}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(120deg, #EDE7F6, #FFF)",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          color: "#4A148C",
          textAlign: "center",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        Supply Allocation
      </h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Calendar Section */}
        <div
          style={{
            flex: "1 1 400px",
            maxWidth: "500px",
            boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
            borderRadius: "12px",
            padding: "20px",
            backgroundColor: "white",
          }}
        >
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileClassName={({ date }) =>
              bookedDates.find(
                (bookedDate) =>
                  bookedDate.toDateString() === date.toDateString()
              )
                ? "booked"
                : null
            }
          />
          <style>
            {`
            .react-calendar {
              border: none;
              border-radius: 12px;
              overflow: hidden;
            }
            .react-calendar__tile {
              padding: 12px;
              text-align: center;
              border-radius: 8px;
              color: #4A148C;
              transition: all 0.3s ease;
            }
            .react-calendar__tile:hover {
              background-color: #E1BEE7;
              transform: scale(1.05);
            }
            .react-calendar__tile--active {
              background-color: #8E24AA !important;
              color: white !important;
              border: 2px solid #4A148C;
            }
            .booked {
              background: #BA68C8;
              color: white;
              border-radius: 50%;
            }
          `}
          </style>
        </div>

        {/* Supplies Section */}
        {selectedDate && (
          <div
            style={{
              flex: "1 1 400px",
              maxWidth: "500px",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#F3E5F5",
            }}
          >
            <h2
              style={{
                color: "#4A148C",
                fontWeight: "600",
                marginBottom: "10px",
              }}
            >
              Supplies for {selectedDate.toDateString()}
            </h2>
            {renderSuppliesForDate(selectedDate)}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCalendar;
