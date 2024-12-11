import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Pie, Bar } from "react-chartjs-2";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "chart.js/auto";
import './yep.css';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [chartData, setChartData] = useState({
    eventTypeData: { labels: [], datasets: [] },
    eventThemeData: { labels: [], datasets: [] },
  });
  const [totals, setTotals] = useState({
    totalBookings: 0,
    totalAttendees: 0,
  });

  const fetchBookings = async () => {
    try {
      const bookingsRef = collection(db, "bookings");
      const snapshot = await getDocs(bookingsRef);
      const fetchedBookings = [];
      snapshot.forEach((doc) => {
        fetchedBookings.push({ id: doc.id, ...doc.data() });
      });
      setBookings(fetchedBookings);
      processAnalytics(fetchedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchSupplies = async () => {
    try {
      const suppliesRef = collection(db, "supplies");
      const snapshot = await getDocs(suppliesRef);
      const fetchedSupplies = [];
      snapshot.forEach((doc) => {
        fetchedSupplies.push({ id: doc.id, ...doc.data() });
      });
      setSupplies(fetchedSupplies);
    } catch (error) {
      console.error("Error fetching supplies:", error);
    }
  };

  const processAnalytics = (bookingsData) => {
    if (!bookingsData || bookingsData.length === 0) return;
    const eventTypeCount = {};
    const eventThemeCount = {};
    let totalBookings = bookingsData.length;
    let totalAttendees = 0;
    const dates = [];
    bookingsData.forEach((booking) => {
      if (booking.eventType) {
        eventTypeCount[booking.eventType] =
          (eventTypeCount[booking.eventType] || 0) + 1;
      }
      if (booking.eventTheme) {
        eventThemeCount[booking.eventTheme] =
          (eventThemeCount[booking.eventTheme] || 0) + 1;
      }
      if (booking.eventDate) {
        dates.push(new Date(booking.eventDate.seconds * 1000));
      }
      totalAttendees += booking.numAttendees || 0;
    });
    setTotals({ totalBookings, totalAttendees });
    setHighlightedDates(dates);
    setChartData({
      eventTypeData: {
        labels: Object.keys(eventTypeCount),
        datasets: [
          {
            label: "Event Types",
            data: Object.values(eventTypeCount),
            backgroundColor: ["#D6B9F3", "#BBA4EE", "#9F8EDD"],
          },
        ],
      },
      eventThemeData: {
        labels: Object.keys(eventThemeCount),
        datasets: [
          {
            label: "Event Themes",
            data: Object.values(eventThemeCount),
            backgroundColor: ["#C8A2E6", "#A682D6", "#8C6CC9", "#7239B7"],
          },
        ],
      },
    });
  };

  useEffect(() => {
    fetchBookings();
    fetchSupplies();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#f9f9ff",
        padding: "30px",
        fontFamily: "'Roboto', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#4a148c", marginBottom: "20px" }}>
        Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            backgroundColor: "#D6B9F3",
            padding: "20px",
            borderRadius: "10px",
            color: "#4a148c",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            width: "45%",
          }}
        >
          <h3>Total Bookings</h3>
          <h2>{totals.totalBookings}</h2>
        </div>
        <div
          style={{
            backgroundColor: "#D6B9F3",
            padding: "20px",
            borderRadius: "10px",
            color: "#4a148c",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            width: "45%",
          }}
        >
          <h3>Total Attendees</h3>
          <h2>{totals.totalAttendees}</h2>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          width: "100%",
          gap: "20px",
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxWidth: "350px",
          }}
        >
          <h3>Supplies List</h3>
          {supplies.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      backgroundColor: "#9F8EDD",
                      color: "white",
                      padding: "10px",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      backgroundColor: "#9F8EDD",
                      color: "white",
                      padding: "10px",
                    }}
                  >
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply) => (
                  <tr key={supply.id}>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {supply.name}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {supply.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No supplies available</p>
          )}
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxWidth: "350px",
          }}
        >
          <h3>Booked Dates</h3>
          <div
            style={{
              maxWidth: "200px",
              maxHeight: "200px",
              margin: "0 auto",
            }}
          >
            <Calendar
              value={calendarDate}
              onChange={setCalendarDate}
              tileClassName={({ date }) =>
                highlightedDates.some(
                  (d) =>
                    d.getFullYear() === date.getFullYear() &&
                    d.getMonth() === date.getMonth() &&
                    d.getDate() === date.getDate()
                )
                  ? "highlight"
                  : null
              }
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxWidth: "350px",
          }}
        >
          <h3>Event Type Distribution</h3>
          {chartData.eventTypeData.labels.length > 0 ? (
            <div style={{ maxWidth: "250px", margin: "0 auto" }}>
              <Pie data={chartData.eventTypeData} />
            </div>
          ) : (
            <p>No data available</p>
          )}
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxWidth: "350px",
          }}
        >
          <h3>Event Theme Distribution</h3>
          {chartData.eventThemeData.labels.length > 0 ? (
            <div style={{ maxWidth: "250px", margin: "0 auto" }}>
              <Bar data={chartData.eventThemeData} />
            </div>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
