import React, { useState, useEffect, useMemo } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';

// Moving Average function for smoothing historical data
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

// Exponential Smoothing for better future predictions
const exponentialSmoothing = (data, alpha) => {
  let result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

// Predict future booking trends based on historical data
const predictBookingTrendByMonth = (events) => {
  const timeSlots = events.map(event => new Date(event.Date));
  timeSlots.sort((a, b) => a - b);

  const predictions = {};
  timeSlots.forEach(time => {
    const year = time.getFullYear();
    const month = time.getMonth();

    if (!predictions[year]) predictions[year] = Array(12).fill(0);
    predictions[year][month] += 1;
  });

  // Apply smoothing to improve prediction accuracy
  const monthlyPredictions = Object.entries(predictions).flatMap(([year, months]) =>
    months.map((monthBookings, monthIndex) => ({
      year: parseInt(year),
      month: monthIndex,
      predictedBookings: exponentialSmoothing([monthBookings], 0.8)[0]
    }))
  );

  return monthlyPredictions;
};

// Calculate resource needs based on booking predictions
const determineResourceNeeds = (predictions) => {
  const resourceFactor = 2; // Adjust as needed for your use case
  return predictions.map(month => ({
    month: month.month,
    resources: Math.ceil(month.predictedBookings * resourceFactor)
  }));
};

// Suggest dynamic pricing strategies based on demand
const suggestPricingAdjustments = (predictions, baseRate) => {
  const baseDemandThreshold = 5; // Threshold to adjust prices
  return predictions.map(month => ({
    month: month.month,
    suggestedPrice: baseRate + (month.predictedBookings / baseDemandThreshold) * baseRate
  }));
};

// Generate actionable insights and strategies for users
const generateInsights = (predictions, resources, pricing) => {
  const sortedByDemand = [...predictions].sort((a, b) => b.predictedBookings - a.predictedBookings);

  // Identify top 3 high and low demand months
  const topHighDemand = sortedByDemand.slice(0, 3).map(item =>
    new Date(0, item.month).toLocaleString('en-US', { month: 'long' })
  );
  const topLowDemand = sortedByDemand.slice(-3).map(item =>
    new Date(0, item.month).toLocaleString('en-US', { month: 'long' })
  );

  return (
    <div>
      <h3 style={{ fontSize: '20px', marginBottom: '10px', fontWeight: '600', color: '#333' }}>Predictive Insights:</h3>
      <p style={{ fontSize: '14px', marginBottom: '20px', color: '#666' }}>
        Based on predicted bookings, here are the top months to focus on and strategic advice for optimizing resources and pricing.
      </p>
      <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555' }}>
        {topHighDemand.length > 0 && (
          <li>
            <strong style={{ color: '#2d2d2d' }}>Top 3 High Demand Months:</strong>
            <p>These months are predicted to have the highest bookings:</p>
            <ul>
              {topHighDemand.map((monthName, index) => (
                <li key={index}>{monthName}</li>
              ))}
            </ul>
            <p>Strategies for high-demand months:</p>
            <ul>
              <li>Increase prices to maximize revenue.</li>
              <li>Ensure sufficient staffing and resources.</li>
              <li>Offer promotions to encourage early bookings.</li>
            </ul>
          </li>
        )}

        {topLowDemand.length > 0 && (
          <li>
            <strong style={{ color: '#2d2d2d' }}>Top 3 Low Demand Months:</strong>
            <p>These months are predicted to have the lowest bookings:</p>
            <ul>
              {topLowDemand.map((monthName, index) => (
                <li key={index}>{monthName}</li>
              ))}
            </ul>
            <p>Strategies for low-demand months:</p>
            <ul>
              <li>Offer discounts or flash sales to attract customers.</li>
              <li>Optimize resource allocation to minimize costs.</li>
              <li>Focus on targeted marketing to boost demand.</li>
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
};

const BookingTrend = () => {
  const [predictedBookingTrendByMonth, setPredictedBookingTrendByMonth] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventCollection = collection(db1, 'csvData');
        const snapshot = await getDocs(eventCollection);
        const eventData = snapshot.docs.map(doc => doc.data());

        const bookingPredictionsByMonth = predictBookingTrendByMonth(eventData);
        setPredictedBookingTrendByMonth(bookingPredictionsByMonth);
      } catch (error) {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const predictedBookingTrendByMonthMemo = useMemo(() => predictedBookingTrendByMonth, [predictedBookingTrendByMonth]);

  const getAggregatedMonthlyData = () => {
    const monthlyAggregates = Array(12).fill(0);
    predictedBookingTrendByMonthMemo.forEach(item => {
      monthlyAggregates[item.month] += item.predictedBookings;
    });
    return monthlyAggregates.map((total, month) => ({ month, predictedBookings: total }));
  };

  const filteredMonthlyTrend = selectedYear
    ? predictedBookingTrendByMonthMemo.filter(item => item.year === selectedYear)
    : getAggregatedMonthlyData();

  const availableYears = [...new Set(predictedBookingTrendByMonthMemo.map(item => item.year))];

  const resourceNeeds = useMemo(() => determineResourceNeeds(filteredMonthlyTrend), [filteredMonthlyTrend]);
  const pricingStrategies = useMemo(() => suggestPricingAdjustments(filteredMonthlyTrend, 100), [filteredMonthlyTrend]);

  return (
    <div style={{ overflowY: 'auto', maxHeight: '80vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {loading ? (
        <div style={{ textAlign: 'center' }}><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>{error}</div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <label htmlFor="year-filter" style={{ fontSize: '18px', marginRight: '10px', color: '#333' }}>Select Year:</label>
            <select
              id="year-filter"
              value={selectedYear || ''}
              onChange={e => setSelectedYear(parseInt(e.target.value) || null)}
              style={{
                padding: '8px',
                fontSize: '16px',
                fontFamily: 'Arial, sans-serif',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>Predicted Booking Trend (Monthly)</h3>
          <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
            The graph below shows the predicted number of bookings for each month, helping you plan resources and pricing strategies accordingly.
          </p>
          <div style={{ width: '1000px', height: '400px', margin: '0 auto' }}>
            <Line
              data={{
                labels: [...Array(12).keys()].map(month => new Date(0, month).toLocaleString('en-US', { month: 'short' })),
                datasets: [{
                  label: 'Predicted Bookings',
                  data: filteredMonthlyTrend.map(item => item.predictedBookings),
                  borderColor: 'rgba(75,192,192,1)',
                  fill: false,
                }],
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 2,
                    },
                  },
                },
              }}
            />
          </div>

          <div style={{ marginTop: '40px' }}>
            {generateInsights(filteredMonthlyTrend, resourceNeeds, pricingStrategies)}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingTrend;
