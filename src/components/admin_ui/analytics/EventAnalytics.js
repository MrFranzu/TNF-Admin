import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig'; // Import Firestore instance
import { collection, getDocs } from 'firebase/firestore'; // Firestore functions
import { Line, Bar } from 'react-chartjs-2'; // Import chart components
import { Chart as ChartJS } from 'chart.js/auto';
import { ThreeDots } from 'react-loader-spinner'; // Import the spinner for loading state

// Helper function for moving average (to smooth trends)
const movingAverage = (data, windowSize) => {
  let result = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= windowSize) {
      sum -= data[i - windowSize];
    }
    result.push(sum / Math.min(i + 1, windowSize));
  }
  return result;
};

// Helper function to group events by time (for trend analysis)
const groupByTimeSlot = (events) => {
  const grouped = {};

  events.forEach(event => {
    const timeSlot = event.Time.split(' - ')[0]; // Get the start time (e.g., "2:00 pm")
    if (!grouped[timeSlot]) {
      grouped[timeSlot] = 0;
    }
    grouped[timeSlot] += 1; // Count number of bookings per time slot
  });

  return grouped;
};

// Helper function to predict resources (seating, catering, staff)
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

// Predict booking trends based on historical data
const predictBookingTrend = (events) => {
  const timeSlots = events.map(event => new Date(event.Date));
  timeSlots.sort((a, b) => a - b); // Sort by ascending date/time

  const predictions = {};
  timeSlots.forEach(time => {
    const hour = time.getHours();
    const timeSlot = `${hour}:00`;
    if (!predictions[timeSlot]) predictions[timeSlot] = 0;
    predictions[timeSlot] += 1; // Count number of bookings per hour
  });

  const timeSlotArray = Object.entries(predictions).map(([key, value]) => value);
  const predictedBookings = movingAverage(timeSlotArray, 3); // Moving average with window size of 3 for trend smoothing

  return Object.keys(predictions).map((key, index) => ({
    timeSlot: key,
    predictedBookings: predictedBookings[index]
  }));
};

// Predict check-in patterns based on the event time (can be enhanced with QR scan data)
const predictCheckInPatterns = (events) => {
  const checkInTimes = events.map(event => new Date(event["Check-in Time"])); // Assuming "Check-in Time" exists
  const checkInGroups = {};

  checkInTimes.forEach(time => {
    const hour = time.getHours();
    if (!checkInGroups[hour]) checkInGroups[hour] = 0;
    checkInGroups[hour] += 1; // Count check-ins per hour
  });

  const checkInArray = Object.entries(checkInGroups).map(([key, value]) => value);
  const predictedCheckIns = movingAverage(checkInArray, 3); // Use moving average

  return Object.keys(checkInGroups).map((key, index) => ({
    hour: key,
    predictedCheckIns: predictedCheckIns[index]
  }));
};

const EventAnalytics = () => {
  const [events, setEvents] = useState([]);
  const [rawBookingTrend, setRawBookingTrend] = useState({});
  const [predictedBookingTrend, setPredictedBookingTrend] = useState([]);
  const [checkInPattern, setCheckInPattern] = useState({});
  const [resourceForecast, setResourceForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventCollection = collection(db1, 'csvData');  // Firestore reference
        const snapshot = await getDocs(eventCollection);
        const eventData = snapshot.docs.map(doc => {
          const event = doc.data();

          // Validate and parse Date
          if (!event.Date) return null;
          const date = new Date(event.Date);
          if (isNaN(date)) return null;  // Skip invalid date
          event.Date = date.getTime();  // Store as timestamp

          // Validate and parse "No. of persons"
          event["No. of persons"] = parseInt(event["No. of persons"], 10) || 0;

          // Validate "Full Payment"
          event["Full Payment"] = event["Full Payment"] ? parseFloat(event["Full Payment"].replace(/,/g, '')) : 0;

          // Check for "Check-in Time"
          event["Check-in Time"] = event["Check-in Time"] ? new Date(event["Check-in Time"]) : null;

          return event;
        }).filter(Boolean); // Remove invalid entries

        setEvents(eventData);

        // Process booking trend (group by time slots)
        const trend = groupByTimeSlot(eventData);
        setRawBookingTrend(trend);

        // Forecast resources (seating, catering, staff)
        const resources = eventData.map(event => ({
          eventName: event["Event/Occasion"] || "Unknown Event",
          resources: predictResources(event),
        }));
        setResourceForecast(resources);

        // Predict booking trends using historical data
        const bookingPredictions = predictBookingTrend(eventData);
        setPredictedBookingTrend(bookingPredictions);

        // Predict check-in patterns using "Check-in Time"
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

  // Check if data exists before rendering the charts
  const isDataAvailable = (data) => {
    return Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;
  };

  const bookingChartData = {
    labels: Object.keys(rawBookingTrend),
    datasets: [{
      label: 'Event Bookings by Time Slot',
      data: Object.values(rawBookingTrend),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const checkInChartData = {
    labels: Object.keys(checkInPattern).map((key) => `${key}:00`),
    datasets: [{
      label: 'Check-ins by Hour',
      data: Object.values(checkInPattern),
      fill: false,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1
    }]
  };

  const predictedBookingChartData = {
    labels: predictedBookingTrend.map((entry) => entry.timeSlot),
    datasets: [{
      label: 'Predicted Bookings',
      data: predictedBookingTrend.map((entry) => entry.predictedBookings),
      fill: false,
      borderColor: 'rgb(153, 102, 255)',
      tension: 0.1
    }]
  };

  const resourceForecastChartData = {
    labels: resourceForecast.map(forecast => forecast.eventName),
    datasets: [{
      label: 'Seating Forecast',
      data: resourceForecast.map(forecast => forecast.resources.seating),
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }, {
      label: 'Catering Forecast',
      data: resourceForecast.map(forecast => forecast.resources.catering),
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgb(255, 99, 132)',
      borderWidth: 1
    }, {
      label: 'Staff Forecast',
      data: resourceForecast.map(forecast => forecast.resources.staff),
      backgroundColor: 'rgba(153, 102, 255, 0.2)',
      borderColor: 'rgb(153, 102, 255)',
      borderWidth: 1
    }]
  };

  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: '20px',
  };

  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    margin: '10px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#fff',
    flex: '1 1 45%',
    minWidth: '300px',
  };

  return (
    <div>
      <h1>Event Analytics</h1>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
          <ThreeDots color="#00BFFF" height={100} width={100} />
        </div>
      ) : (
        <div style={containerStyle}>
          {isDataAvailable(rawBookingTrend) && (
            <div style={cardStyle}>
              <h3>Booking Trend by Time Slot</h3>
              <Line data={bookingChartData} />
            </div>
          )}

          {isDataAvailable(predictedBookingTrend) && (
            <div style={cardStyle}>
              <h3>Predicted Booking Trend</h3>
              <Line data={predictedBookingChartData} />
            </div>
          )}

          {isDataAvailable(checkInPattern) && (
            <div style={cardStyle}>
              <h3>Check-in Pattern</h3>
              <Line data={checkInChartData} />
            </div>
          )}

          {isDataAvailable(resourceForecast) && (
            <div style={cardStyle}>
              <h3>Resource Forecast (Seating, Catering, Staff)</h3>
              <Bar data={resourceForecastChartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventAnalytics;
