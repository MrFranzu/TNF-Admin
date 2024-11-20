import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';  // Import Firestore instance
import { collection, getDocs } from 'firebase/firestore';  // Firestore functions
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

// Helper function to group events by time slot for trend analysis
const groupByDateAndTime = (events) => {
  const grouped = {};
  
  events.forEach(event => {
    const date = new Date(event.Date);
    const timeSlot = `${date.getHours()}:${date.getMinutes()}`;
    if (!grouped[timeSlot]) {
      grouped[timeSlot] = 0;
    }
    grouped[timeSlot] += 1;
  });

  return grouped;
};

// Helper function to forecast seating, catering, and staff needs
const predictResources = (event) => {
  let resources = {
    seating: parseInt(event["No. of persons"], 10) || 0,
    catering: (parseInt(event["No. of persons"], 10) || 0) * 2, // Assume 2 dishes per person
    staff: Math.ceil((parseInt(event["No. of persons"], 10) || 0) / 10), // 1 staff per 10 people
  };

  // Customize catering based on the event type (e.g., "Wedding" for more servings)
  if (event["Event/Occasion"] === "Wedding") {
    resources.catering = (parseInt(event["No. of persons"], 10) || 0) * 3; // Wedding catering is 3 dishes per person
  }

  // Adjust based on the menu type (e.g., "Plated" or "Buffet")
  if (event["Package"].includes("Buffet")) {
    resources.catering = (parseInt(event["No. of persons"], 10) || 0) * 4; // Buffet events may need more servings
  }

  return resources;
};

// Simple predictive analytics using moving average for booking trend
const predictBookingTrend = (events) => {
  const timeSlots = events.map(event => new Date(event.Date));
  timeSlots.sort((a, b) => a - b); // Sort by ascending date/time

  const predictions = {};
  timeSlots.forEach(time => {
    const hour = time.getHours();
    const timeSlot = `${hour}:00`;
    if (!predictions[timeSlot]) predictions[timeSlot] = 0;
    predictions[timeSlot] += 1;
  });

  return predictions;
};

// Predict check-in patterns using QR code scan data (assuming this data exists)
const predictCheckInPatterns = (events) => {
  const checkInTimes = events.map(event => new Date(event["Check-in Time"])); // Assuming check-in time data exists
  const checkInGroups = {};

  checkInTimes.forEach(time => {
    const hour = time.getHours();
    if (!checkInGroups[hour]) checkInGroups[hour] = 0;
    checkInGroups[hour] += 1;
  });

  return checkInGroups;
};

const EventAnalytics = () => {
  const [events, setEvents] = useState([]);
  const [bookingTrend, setBookingTrend] = useState({});
  const [checkInPattern, setCheckInPattern] = useState({});
  const [resourceForecast, setResourceForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventCollection = collection(db, 'csvData');  // Firestore reference
        const snapshot = await getDocs(eventCollection);
        const eventData = snapshot.docs.map(doc => {
          const event = doc.data();

          // Convert "Date" to timestamp (milliseconds)
          event.Date = new Date(event.Date).getTime();  // Converts to Unix timestamp (milliseconds)

          // Convert "Full Payment" to a number, remove commas if present and convert to float
          event["Full Payment"] = parseFloat(event["Full Payment"].replace(/,/g, '')) || 0;  // Default to 0 if conversion fails

          // Convert "No. of persons" to a number (parse as integer)
          event["No. of persons"] = parseInt(event["No. of persons"], 10) || 0;  // Default to 0 if conversion fails

          return event;
        });

        setEvents(eventData);

        // Process booking trend (group by time)
        const trend = groupByDateAndTime(eventData);
        setBookingTrend(trend);

        // Forecast resources (seating, catering, staff)
        const resources = eventData.map(event => {
          return {
            eventName: event["Event/Occasion"],
            resources: predictResources(event),
          };
        });
        setResourceForecast(resources);

        // Predict booking trends using historical data
        const bookingPredictions = predictBookingTrend(eventData);
        setBookingTrend(bookingPredictions);

        // Predict check-in patterns using QR scan data
        const checkInPredictions = predictCheckInPatterns(eventData);
        setCheckInPattern(checkInPredictions);

      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const renderResourceForecast = () => {
    if (Array.isArray(resourceForecast) && resourceForecast.length > 0) {
      return resourceForecast.map((forecast, index) => (
        <div key={index}>
          <h3>{forecast.eventName}</h3>
          <ul>
            <li>Seating: {forecast.resources.seating} chairs</li>
            <li>Catering: {forecast.resources.catering} servings</li>
            <li>Staff: {forecast.resources.staff} staff members</li>
          </ul>
        </div>
      ));
    } else {
      return <p>No resource forecasts available.</p>;
    }
  };

  const bookingChartData = {
    labels: Object.keys(bookingTrend),
    datasets: [{
      label: 'Event Bookings by Time Slot',
      data: Object.values(bookingTrend),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const checkInChartData = {
    labels: Object.keys(checkInPattern),
    datasets: [{
      label: 'Check-ins by Hour',
      data: Object.values(checkInPattern),
      fill: false,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1
    }]
  };

  if (loading) {
    return <p>Loading data...</p>;
  }

  return (
    <div>
      <h1>Event Reservation Analytics</h1>
      
      {/* Booking Trend Visualization */}
      <h2>Booking Trend by Time Slot</h2>
      <div>
        <Line data={bookingChartData} options={{ responsive: true }} />
      </div>

      {/* Check-in Patterns Visualization */}
      <h2>Check-in Patterns</h2>
      <div>
        <Line data={checkInChartData} options={{ responsive: true }} />
      </div>

      {/* Resource Forecasting */}
      <h2>Forecasted Resources for Events</h2>
      {renderResourceForecast()}
    </div>
  );
};

export default EventAnalytics;
