import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';

// Moving Average function for smoothing
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

// Exponential Smoothing function for enhanced predictions
const exponentialSmoothing = (data, alpha) => {
  let result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

// Predict booking trends by month
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

  const monthlyPredictions = Object.entries(predictions).flatMap(([year, months]) =>
    months.map((monthBookings, monthIndex) => ({
      year: parseInt(year),
      month: monthIndex,
      predictedBookings: exponentialSmoothing([monthBookings], 0.8)[0]
    }))
  );

  return monthlyPredictions;
};

// Suggest resource needs based on predictions
const determineResourceNeeds = (predictions) => {
  const resourceFactor = 2;
  return predictions.map(month => ({
    month: month.month,
    resources: Math.ceil(month.predictedBookings * resourceFactor)
  }));
};

// Suggest adaptive pricing strategies
const suggestPricingAdjustments = (predictions, baseRate) => {
  const baseDemandThreshold = 5;
  return predictions.map(month => ({
    month: month.month,
    suggestedPrice: baseRate + (month.predictedBookings / baseDemandThreshold) * baseRate
  }));
};

// Generate insights based on predictions
const generateInsights = (predictions, resources, pricing) => {
  // Group months by their demand level (high or low)
  const peakMonths = predictions.filter(item => item.predictedBookings > 5);
  const lowDemandMonths = predictions.filter(item => item.predictedBookings <= 5);

  // Get unique months for each category (High demand and Low demand)
  const peakMonthNames = peakMonths.map(item => new Date(0, item.month).toLocaleString('en-US', { month: 'long' }));
  const lowDemandMonthNames = lowDemandMonths.map(item => new Date(0, item.month).toLocaleString('en-US', { month: 'long' }));

  // Use Set to get unique month names for both categories
  const uniquePeakMonths = [...new Set(peakMonthNames)];
  const uniqueLowDemandMonths = [...new Set(lowDemandMonthNames)];

  return (
    <div>
      <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Predictive Insights:</h3>
      <ul style={{ fontSize: '16px', lineHeight: '1.8' }}>
        {uniquePeakMonths.length > 0 && (
          <li>
            <strong>High Demand:</strong> Months with significant bookings ({uniquePeakMonths.join(', ')}) may require increased pricing and additional resources.
          </li>
        )}
        {uniqueLowDemandMonths.length > 0 && (
          <li>
            <strong>Low Demand:</strong> For months with lower bookings ({uniqueLowDemandMonths.join(', ')}) consider promotional pricing or discounts.
          </li>
        )}
        <li>
          <strong>Resource Allocation:</strong> Ensure adequate staffing and supplies during peak months.
        </li>
        <li>
          <strong>Pricing Strategy:</strong> Optimize revenue by adjusting prices during high-demand periods.
        </li>
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

  const filteredMonthlyTrend = selectedYear
    ? predictedBookingTrendByMonth.filter(item => item.year === selectedYear)
    : predictedBookingTrendByMonth;

  const availableYears = [...new Set(predictedBookingTrendByMonth.map(item => item.year))];

  const resourceNeeds = determineResourceNeeds(filteredMonthlyTrend);
  const pricingStrategies = suggestPricingAdjustments(filteredMonthlyTrend, 100);

  return (
    <div style={{ overflowY: 'auto', maxHeight: '80vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {loading ? (
        <div style={{ textAlign: 'center' }}><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>{error}</div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <label htmlFor="year-filter" style={{ fontSize: '18px', marginRight: '10px' }}>Select Year:</label>
            <select
              id="year-filter"
              value={selectedYear || ''}
              onChange={e => setSelectedYear(parseInt(e.target.value) || null)}
              style={{ padding: '5px', fontSize: '16px' }}
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Predicted Booking Trend (Monthly)</h3>
          <div style={{ width: '1000px', height: '400px', margin: '0 auto' }}>
            <Line
              data={{
                labels: [...Array(12).keys()].map(month => new Date(0, month).toLocaleString('en-US', { month: 'short' })),
                datasets: [
                  {
                    label: 'Predicted Bookings',
                    data: filteredMonthlyTrend.map(item => item.predictedBookings),
                    borderColor: 'rgb(255, 99, 132)',
                    fill: false,
                  },
                  {
                    label: 'Resource Needs',
                    data: resourceNeeds.map(item => item.resources),
                    borderColor: 'rgb(54, 162, 235)',
                    fill: false,
                  },
                  {
                    label: 'Suggested Pricing',
                    data: pricingStrategies.map(item => item.suggestedPrice),
                    borderColor: 'rgb(75, 192, 192)',
                    fill: false,
                  },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>

          {/* Predictive Insights Section */}
          {generateInsights(filteredMonthlyTrend, resourceNeeds, pricingStrategies)}
        </div>
      )}
    </div>
  );
};

export default BookingTrend;
