import React, { useEffect, useState } from "react";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import * as XLSX from "xlsx"; // Import the xlsx library

const Attend = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [showDoneList, setShowDoneList] = useState(false); // State to toggle Done List view
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

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

  // Function to check if the event is done (based on event end time)
  const isEventDone = (eventDate, eventEndTime) => {
    const currentDate = new Date();
    const eventEndDate = new Date(eventDate.toDate());

    // Extract hours and minutes from eventEndTime and set them to eventEndDate
    if (eventEndTime) {
      const [eventEndHours, eventEndMinutes] = eventEndTime.split(":").map(Number);
      eventEndDate.setHours(eventEndHours, eventEndMinutes, 0, 0); // Set time on the date
    }

    // Compare the full event end date and time to the current date and time
    return eventEndDate < currentDate;
  };

  // Filter bookings into "done" and "upcoming" events
  const upcomingBookings = bookings.filter((booking) => !isEventDone(booking.eventDate, booking.endTime));
  const doneBookings = bookings.filter((booking) => isEventDone(booking.eventDate, booking.endTime));

  const totalAttendees = attendees.length;
  const totalPeople = attendees.reduce(
    (total, attendee) => total + (attendee.numPeople || 0),
    0
  );

  // Function to export attendees data to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendees.map(attendee => ({
      "Attendee Name": attendee.name || "No Name",
      "No. of People": attendee.numPeople || "No People Count",
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendees");

    // Write to file
    XLSX.writeFile(wb, `Attendees_${selectedDoc}.xlsx`);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter bookings based on search query
  const filteredBookings = (showDoneList ? doneBookings : upcomingBookings).filter((booking) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      booking.name?.toLowerCase().includes(searchLower) ||
      formatDate(booking.eventDate).toLowerCase().includes(searchLower) ||
      formatTime(booking.startTime).toLowerCase().includes(searchLower) ||
      formatTime(booking.endTime).toLowerCase().includes(searchLower)
    );
  });

  // Filter attendees based on search query
  const filteredAttendees = attendees.filter((attendee) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      attendee.name?.toLowerCase().includes(searchLower) ||
      (attendee.numPeople && attendee.numPeople.toString().includes(searchLower))
    );
  });

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#3c1361" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: "#5a189a", borderBottom: "2px solid #c77dff", paddingBottom: "10px" }}>
          Bookings 
        </h1>
        <button
          onClick={() => setShowDoneList(!showDoneList)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6a1b9a",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {showDoneList ? "Show Upcoming Events" : "Show Done Events"}
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search bookings or attendees..."
          value={searchQuery}
          onChange={handleSearchChange}
          style={{
            padding: "10px",
            width: "100%",
            maxWidth: "400px",
            border: "1px solid #c77dff",
            borderRadius: "5px",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        {/* Bookings List */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#f3f0ff",
            padding: "20px",
            borderRadius: "8px",
            maxHeight: "400px", // Set max height for scrolling
            overflowY: "auto",  // Enable vertical scrolling
          }}
        >
          <h2 style={{ color: "#6a1b9a" }}>{showDoneList ? "Done Events" : "Events"}</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {filteredBookings.map((booking) => (
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
            {filteredAttendees.length > 0 ? (
              <div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ padding: "8px", border: "1px solid #ddd" }}>Attendee Name</th>
                      <th style={{ padding: "8px", border: "1px solid #ddd" }}>No. of People</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((attendee) => (
                      <tr key={attendee.id}>
                        <td style={{ padding: "8px", border: "1px solid #ddd" }}>{attendee.name || "No Name"}</td>
                        <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                          {attendee.numPeople || "No People Count"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "20px", fontSize: "16px" }}>
                  <strong>Total Attendees: {totalAttendees}</strong>
                  <br />
                  <strong>Total People: {totalPeople}</strong>
                </div>
                <button
                  onClick={exportToExcel}
                  style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    backgroundColor: "#6a1b9a",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Export to Excel
                </button>
              </div>
            ) : (
              <p>No attendees available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attend;
