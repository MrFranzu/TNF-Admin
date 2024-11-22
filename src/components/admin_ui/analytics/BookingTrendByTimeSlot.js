import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';

// Function to group events by time slot and calculate busy events
const groupByTimeSlot = (events) => {
  const grouped = {};
  let busyEventCount = 0;
  events.forEach(event => {
    const timeSlot = event.Time.split(' - ')[0]; // Capture the starting time of the event
    if (!grouped[timeSlot]) {
      grouped[timeSlot] = 0;
    }
    grouped[timeSlot] += 1;
    if (event.FullPayment >= 5000) {  // Example criteria for busy events
      busyEventCount += 1;
    }
  });
  return { grouped, busyEventCount };
};

// Moving Average function to smooth the predicted bookings
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

// Function to predict the booking trend based on date
const predictBookingTrend = (events) => {
  const timeSlots = events.map(event => new Date(event.Date));
  timeSlots.sort((a, b) => a - b);

  const predictions = {};
  timeSlots.forEach(time => {
    const year = time.getFullYear();
    if (!predictions[year]) predictions[year] = 0;
    predictions[year] += 1;
  });

  const yearArray = Object.entries(predictions).map(([key, value]) => value);
  const predictedBookings = movingAverage(yearArray, 3);

  return Object.keys(predictions).map((key, index) => ({
    year: key,
    predictedBookings: predictedBookings[index],
  }));
};

// Pricing strategy function based on predicted demand
const getPricingStrategy = (predictedBookings) => {
  const maxBooking = Math.max(...predictedBookings.map(item => item.predictedBookings));
  const pricingMultiplier = 1 + (maxBooking / 100); // Example pricing adjustment
  return pricingMultiplier;
};

const BookingTrend = () => {
  const [rawBookingTrend, setRawBookingTrend] = useState({});
  const [predictedBookingTrend, setPredictedBookingTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pricingMultiplier, setPricingMultiplier] = useState(1);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventCollection = collection(db1, 'csvData');
        const snapshot = await getDocs(eventCollection);
        const eventData = snapshot.docs.map(doc => doc.data());

        // Process raw booking trend by time slot and identify busy events
        const { grouped, busyEventCount } = groupByTimeSlot(eventData);
        setRawBookingTrend(grouped);

        // Predict booking trend based on events
        const bookingPredictions = predictBookingTrend(eventData);
        setPredictedBookingTrend(bookingPredictions);

        // Determine dynamic pricing strategy
        const pricing = getPricingStrategy(bookingPredictions);
        setPricingMultiplier(pricing);
      } catch (error) {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div>
      {loading ? (
        <div><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <div>
          <h3>Booking Trend by Time Slot</h3>
          <div style={{ width: '1000px', height: '200px', margin: '0 auto' }}>
            <Line
              data={{
                labels: Object.keys(rawBookingTrend).sort(),
                datasets: [
                  {
                    label: 'Event Bookings by Time Slot',
                    data: Object.keys(rawBookingTrend).sort().map(timeSlot => rawBookingTrend[timeSlot]),
                    borderColor: 'rgb(75, 192, 192)',
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
              height={400}
              width={600}
            />
          </div>

          <h3>Predicted Booking Trend</h3>
          <div style={{ width: '1000px', height: '400px', margin: '0 auto' }}>
            <Line
              data={{
                labels: predictedBookingTrend.map(item => item.year),
                datasets: [
                  {
                    label: 'Predicted Booking Trend',
                    data: predictedBookingTrend.map(item => item.predictedBookings),
                    borderColor: 'rgb(153, 102, 255)',
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
              height={400}
              width={600}
            />
          </div>

          <h3>Dynamic Pricing Strategy</h3>
          <div>
            <p>Pricing Multiplier: {pricingMultiplier.toFixed(2)}</p>
            <p>Adjust event pricing based on predicted demand.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTrend;
