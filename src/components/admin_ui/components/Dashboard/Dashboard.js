import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Pie, Bar } from "react-chartjs-2";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "chart.js/auto";
import "./yep.css";
import DashboardFilter from "./DashboardFilter";

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState([]);
  const [chartData, setChartData] = useState({
    eventTypeData: { labels: [], datasets: [] },
    eventThemeData: { labels: [], datasets: [] },
    menuPackageData: { labels: [], datasets: [] },
    paymentMethodData: { labels: [], datasets: [] },
  });
  const [totals, setTotals] = useState({
    totalBookings: 0,
    totalAttendees: 0,
  });
  const [filter, setFilter] = useState({ month: null, year: null });

  const fetchBookings = async () => {
    try {
      const bookingsRef = collection(db, "bookings");
      const snapshot = await getDocs(bookingsRef);
      const fetchedBookings = [];
      snapshot.forEach((doc) => {
        fetchedBookings.push({ id: doc.id, ...doc.data() });
      });
      setBookings(fetchedBookings);
      setFilteredBookings(fetchedBookings);
      processAnalytics(fetchedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const processAnalytics = (bookingsData) => {
    if (!bookingsData || bookingsData.length === 0) return;
    const eventTypeCount = {};
    const eventThemeCount = {};
    const menuPackageCount = {};
    const paymentMethodCount = {};
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
      if (booking.menuPackage) {
        menuPackageCount[booking.menuPackage] =
          (menuPackageCount[booking.menuPackage] || 0) + 1;
      }
      if (booking.paymentMethod) {
        paymentMethodCount[booking.paymentMethod] =
          (paymentMethodCount[booking.paymentMethod] || 0) + 1;
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
      menuPackageData: {
        labels: Object.keys(menuPackageCount),
        datasets: [
          {
            label: "Menu Packages",
            data: Object.values(menuPackageCount),
            backgroundColor: ["#FFD700", "#FF8C00", "#FF4500", "#FF6347"],
          },
        ],
      },
      paymentMethodData: {
        labels: Object.keys(paymentMethodCount),
        datasets: [
          {
            label: "Payment Methods",
            data: Object.values(paymentMethodCount),
            backgroundColor: ["#00CED1", "#20B2AA", "#4682B4", "#5F9EA0"],
          },
        ],
      },
    });
  };

  const applyFilter = () => {
    const { month, year } = filter;
    const filtered = bookings.filter((booking) => {
      if (!booking.eventDate) return false;
      const eventDate = new Date(booking.eventDate.seconds * 1000);
      return (
        (month === null || eventDate.getMonth() === month - 1) &&
        (year === null || eventDate.getFullYear() === year)
      );
    });
    setFilteredBookings(filtered);
    processAnalytics(filtered);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter]);

    return (
      <div
        style={{
          backgroundColor: "#f9f9ff",
          fontFamily: "'Roboto', sans-serif",
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: "1200px", // Set a max-width for consistent layout
            height: "80vh", // Adjust height to fit the viewport
            overflowY: "auto", // Enable vertical scrolling
            overflowX: "hidden", // Prevent horizontal overflow
            padding: "30px",
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ textAlign: "center", color: "#4a148c", marginBottom: "20px" }}>
            Dashboard
          </h1>
    
          {/* Display Total Bookings */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              backgroundColor: "#e0e0e0",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ color: "#4a148c", margin: 0 }}>
              Total Bookings: {totals.totalBookings}
            </h2>
            <h3 style={{ color: "#6a1b9a", margin: 0 }}>
              Total Attendees: {totals.totalAttendees}
            </h3>
          </div>
    
          <DashboardFilter
            onFilterChange={({ month, year }) => setFilter({ month, year })}
          />
    
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {[ // Chart mapping logic remains unchanged
              { label: "Event Type Distribution", data: chartData.eventTypeData, Component: Pie },
              { label: "Event Theme Distribution", data: chartData.eventThemeData, Component: Bar },
              {
                label: "Menu Packages",
                data: chartData.menuPackageData,
                Component: Pie,
              },
              { label: "Payment Methods", data: chartData.paymentMethodData, Component: Bar },
            ].map((chart, idx) => (
              <div
                key={idx}
                style={{
                  flex: "1 1 calc(50% - 20px)",
                  backgroundColor: "#fff",
                  padding: "20px",
                  borderRadius: "10px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  textAlign: "center",
                  minWidth: "300px",
                  maxWidth: "600px",
                  height: "350px",
                }}
              >
                <h3>{chart.label}</h3>
                {chart.data.labels.length > 0 ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <chart.Component
                      data={chart.data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: "bottom",
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    
};

export default Dashboard;
