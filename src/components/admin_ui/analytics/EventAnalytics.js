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

  if (event["Event/Occasion"] === "Wedding") {
    resources.catering = (parseInt(event["No. of persons"], 10) || 0) * 3; // Wedding catering is 3 dishes per person
  }

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
    const year = time.getFullYear();
    if (!predictions[year]) predictions[year] = 0;
    predictions[year] += 1; // Count number of bookings per year
  });

  const yearArray = Object.entries(predictions).map(([key, value]) => value);
  const predictedBookings = movingAverage(yearArray, 3); // Moving average with window size of 3 for trend smoothing

  return Object.keys(predictions).map((key, index) => ({
    year: key,
    predictedBookings: predictedBookings[index]
  }));
};

// Predict check-in patterns based on the event time
const predictCheckInPatterns = (events) => {
  const checkInTimes = events.map(event => new Date(event["Check-in Time"])); // Assuming "Check-in Time" exists
  const checkInGroups = {};

  checkInTimes.forEach(time => {
    const hour = time.getHours(); // Extract the hour (0-23)
    const hourLabel = `${hour}:00`; // Format as "hour:00" (e.g., "14:00")

    if (!checkInGroups[hourLabel]) {
      checkInGroups[hourLabel] = 0;
    }
    checkInGroups[hourLabel] += 1; // Count check-ins per hour
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
          if (!event.Date) return null;
          const date = new Date(event.Date);
          if (isNaN(date)) return null;  // Skip invalid date
          event.Date = date.getTime();  // Store as timestamp
          event["No. of persons"] = parseInt(event["No. of persons"], 10) || 0;
          event["Full Payment"] = event["Full Payment"] ? parseFloat(event["Full Payment"].replace(/,/g, '')) : 0;
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

  const isDataAvailable = (data) => {
    return Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;
  };

  const bookingChartData = {
    labels: Object.keys(rawBookingTrend).sort(), // Time slots on the X-axis
    datasets: [{
      label: 'Event Bookings by Time Slot',
      data: Object.keys(rawBookingTrend)
        .sort()
        .map(timeSlot => rawBookingTrend[timeSlot]),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const checkInChartData = {
    labels: Object.keys(checkInPattern).map((key) => {
      const time = new Date(key);
      return time.toLocaleString('en-US', { hour: 'numeric', hour12: true });
    }),
    datasets: [{
      label: 'Check-ins by Hour',
      data: Object.values(checkInPattern),
      fill: false,
      borderColor: 'rgb(255, 99, 132)',
      tension: 0.1
    }]
  };

  const predictedBookingChartData = {
    labels: predictedBookingTrend.map((entry) => entry.year),
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

  const cardStyle = {
    backgroundColor: 'white', // Set the background color to white
    border: '1px solid #ddd', // Light border color
    borderRadius: '8px', // Rounded corners
    padding: '20px', // Padding inside the card
    margin: '20px', // Space around each card
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)', // Light shadow for depth
    textAlign: 'center', // Center-align text
    flex: '1 1 30%',  // Ensure the cards take up about 30% of the row
    marginRight: '20px' // Right margin for spacing between cards
  };
  

  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  };

  return (
    <div>
      {loading ? (
        <ThreeDots height="80" width="80" radius="9" color="green" ariaLabel="three-dots-loading" />
      ) : (
        <div style={rowStyle}>
          {isDataAvailable(rawBookingTrend) && (
            <div style={cardStyle}>
              <h3>Booking Trend Analysis</h3>
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
              <h3>Check-in Patterns</h3>
              <Line data={checkInChartData} />
            </div>
          )}

          {isDataAvailable(resourceForecast) && (
            <div style={cardStyle}>
              <h3>Resource Forecast</h3>
              <Bar data={resourceForecastChartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventAnalytics;
