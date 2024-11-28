import React, { useEffect, useState } from "react";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [attendees, setAttendees] = useState([]);

  // Fetch bookings collection
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsCollection = collection(db, "bookings");
        const bookingsSnapshot = await getDocs(bookingsCollection);
        const bookingsData = bookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, []);

  // Fetch attendees collection for a selected document
  const fetchAttendees = async (docId) => {
    try {
      const docRef = doc(db, "bookings", docId);
      const attendeesCollection = collection(docRef, "attendees");
      const attendeesSnapshot = await getDocs(attendeesCollection);
      const attendeesData = attendeesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAttendees(attendeesData);
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  };

  const handleDocClick = (docId) => {
    setSelectedDoc(docId);
    fetchAttendees(docId);
  };

  // Function to format timestamp into a readable date string
  const formatDate = (timestamp) => {
    if (!timestamp) return "No Date";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to format time into 12-hour format with AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr) return "No Time";

    const [hours, minutes] = timeStr.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const totalAttendees = attendees.length;
  const totalPeople = attendees.reduce(
    (total, attendee) => total + (attendee.numPeople || 0),
    0
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#3c1361" }}>
      <h1 style={{ color: "#5a189a", borderBottom: "2px solid #c77dff", paddingBottom: "10px" }}>
        Bookings Dashboard
      </h1>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        {/* Bookings List */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#f3f0ff",
            padding: "20px",
            borderRadius: "8px",
            maxHeight: "400px",  // Set max height for scrolling
            overflowY: "auto",  // Enable vertical scrolling
          }}
        >
          <h2 style={{ color: "#6a1b9a" }}>Bookings</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {bookings.map((booking) => (
              <li
                key={booking.id}
                onClick={() => handleDocClick(booking.id)}
                style={{
                  margin: "10px 0",
                  padding: "15px",
                  backgroundColor: selectedDoc === booking.id ? "#9d4edd" : "#d0bfff",
                  color: selectedDoc === booking.id ? "white" : "#3c1361",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong>{booking.name || "No Event Name"}</strong>
                  <div>{`Event Date: ${formatDate(booking.eventDate)}`}</div>
                  <div>{`Start Time: ${formatTime(booking.startTime) || "No Start Time"}`}</div>
                  <div>{`End Time: ${formatTime(booking.endTime) || "No End Time"}`}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Attendees List */}
        {selectedDoc && (
          <div
            style={{
              flex: 2,
              backgroundColor: "#f3f0ff",
              padding: "20px",
              borderRadius: "8px",
              maxHeight: "400px", // Set max height for scrolling
              overflowY: "auto",  // Enable vertical scrolling
            }}
          >
            <h2 style={{ color: "#6a1b9a" }}>Attendees for {selectedDoc}</h2>
            {attendees.length > 0 ? (
              <div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "10px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#d0bfff", color: "#3c1361" }}>
                      <th style={{ padding: "10px", textAlign: "left" }}>Attendee Name</th>
                      <th style={{ padding: "10px", textAlign: "left" }}>No. of People</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((attendee) => (
                      <tr key={attendee.id} style={{ borderBottom: "1px solid #c77dff" }}>
                        <td style={{ padding: "10px" }}>{attendee.name || "No Name"}</td>
                        <td style={{ padding: "10px" }}>{attendee.numPeople || "No People Count"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "20px", fontWeight: "bold" }}>
                  <p>Total Attendees: {totalAttendees}</p>
                  <p>Total No. of People: {totalPeople}</p>
                </div>
              </div>
            ) : (
              <p style={{ color: "#6a1b9a" }}>No attendees found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
