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

  // Get the past years' data for trend forecasting
  const yearArray = Object.entries(predictions).map(([key, value]) => value);

  // Moving Average for smoothing the data
  const predictedBookings = movingAverage(yearArray, 3);

  // Predict the trend for the next 1 year (12 months)
  const latestYear = Math.max(...Object.keys(predictions).map(year => parseInt(year)));
  const nextYear = latestYear + 1;

  // Estimate next year's bookings based on the trend of the past years
  const estimatedBookingsForNextYear = predictedBookings[predictedBookings.length - 1] * 1.05;  // Assuming a 5% growth

  // Add the predicted year and the bookings estimate
  const futurePrediction = {
    year: nextYear.toString(),
    predictedBookings: estimatedBookingsForNextYear
  };

  // Return predictions with the added next year prediction
  return Object.keys(predictions).map((key, index) => ({
    year: key,
    predictedBookings: predictedBookings[index]
  })).concat(futurePrediction);
};

// Pricing strategy function based on predicted demand with price elasticity
const getRefinedPricingStrategy = (predictedBookings) => {
  const maxBooking = Math.max(...predictedBookings.map(item => item.predictedBookings));
  const minBooking = Math.min(...predictedBookings.map(item => item.predictedBookings));

  const basePrice = 100; // Base price for an event (this could also be dynamic based on event type or seasonality)
  
  // Simple Demand-based pricing adjustment
  let pricingMultiplier = 1 + (maxBooking - minBooking) * 0.01; // Increase by 1% per event for max-min difference
  
  // Seasonal adjustments - if bookings exceed certain thresholds, increase the multiplier
  if (maxBooking > 15) pricingMultiplier *= 1.2;  // 20% increase if bookings exceed 15
  if (minBooking < 5) pricingMultiplier *= 0.9;  // 10% decrease if bookings are too low

  // Cap multiplier to avoid excessive price hikes
  const finalPriceMultiplier = Math.min(pricingMultiplier, 2); 

  return finalPriceMultiplier; // Return only the multiplier
};

const BookingTrend = () => {
  const [rawBookingTrend, setRawBookingTrend] = useState({});
  const [predictedBookingTrend, setPredictedBookingTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pricingMultiplier, setPricingMultiplier] = useState(1);

  const USD_TO_PHP = 56; // Example exchange rate (can be fetched from an API if needed)

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

        // Determine dynamic pricing strategy based on demand
        const pricing = getRefinedPricingStrategy(bookingPredictions);
        setPricingMultiplier(pricing); // Store only the multiplier, not the final price
      } catch (error) {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Predictive insights based on predicted bookings
  const renderPredictiveInsights = () => {
    const lastPrediction = predictedBookingTrend[predictedBookingTrend.length - 1];
    const trend = lastPrediction ? lastPrediction.predictedBookings : 0;

    // Predictive insights based on trend analysis
    if (trend > 10) {
      return (
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
          <h4 style={{ color: '#155724', fontSize: '20px' }}>Predictive Insight: Strong Growth Ahead</h4>
          <p style={{ fontSize: '16px' }}>The predicted booking trend suggests a strong growth trajectory. We anticipate a continued rise in bookings for the upcoming year. To capitalize on this, consider increasing event pricing during peak demand periods, focusing marketing efforts on high-demand time slots, and preparing for potential resource constraints.</p>
        </div>
      );
    } else if (trend > 5) {
      return (
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeeba' }}>
          <h4 style={{ color: '#856404', fontSize: '20px' }}>Predictive Insight: Stable Market with Moderate Growth</h4>
          <p style={{ fontSize: '16px' }}>The predicted bookings are stable, with moderate growth expected in the coming months. This indicates a consistent demand, but not a rapid increase. You can expect steady business, but major spikes or downturns are unlikely.</p>
        </div>
      );
    } else {
      return (
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
          <h4 style={{ color: '#721c24', fontSize: '20px' }}>Predictive Insight: Declining Trend - Risk of Decreased Demand</h4>
          <p style={{ fontSize: '16px' }}>The trend indicates a potential decrease in bookings. This could result from factors such as market saturation, changing customer preferences, or external events affecting demand.</p>
        </div>
      );
    }
  };

  return (
    <div style={{ overflowY: 'auto', maxHeight: '80vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {loading ? (
        <div style={{ textAlign: 'center' }}><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>{error}</div>
      ) : (
        <div>
          <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Booking Trend by Time Slot</h3>
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

          <h3 style={{ fontSize: '24px', marginTop: '40px' }}>Predicted Booking Trend</h3>
          <div style={{ width: '1000px', height: '400px', margin: '0 auto' }}>
            <Line
              data={{
                labels: predictedBookingTrend.map(item => item.year),
                datasets: [
                  {
                    label: 'Actual Booking Trend',
                    data: predictedBookingTrend.slice(0, -1).map(item => item.predictedBookings),
                    borderColor: 'rgb(75, 192, 192)',
                    fill: false,
                  },
                  {
                    label: 'Predicted Booking Trend',
                    data: predictedBookingTrend.map(item => item.predictedBookings),
                    borderColor: 'rgb(255, 99, 132)',
                    fill: false,
                    borderDash: [5, 5],
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

          {renderPredictiveInsights()}

          <div>
            <h4 style={{ fontSize: '20px', marginTop: '40px' }}>Dynamic Pricing Strategy</h4>
            <p style={{ fontSize: '18px' }}><strong>Current Multiplier:</strong> {pricingMultiplier.toFixed(2)}</p>
            <p style={{ fontSize: '16px' }}>This multiplier adjusts the base price based on predicted booking trends and demand fluctuations. As demand rises, the multiplier increases to maximize revenue during peak periods.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTrend;
