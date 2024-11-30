import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';
import { Chart as ChartJS, Tooltip, Legend, Title, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';

// Register the necessary chart.js components
ChartJS.register(Tooltip, Legend, Title, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// Utility to calculate moving averages
const movingAverage = (data, windowSize) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(i - windowSize + 1, 0);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, value) => sum + value, 0) / window.length;
    result.push(avg);
  }
  return result;
};

// Weighted moving average for better smoothing
const weightedMovingAverage = (data, windowSize) => {
  const result = [];
  const weights = Array.from({ length: windowSize }, (_, index) => windowSize - index);
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(i - windowSize + 1, 0);
    const window = data.slice(start, i + 1);
    const weightedSum = window.reduce((sum, value, index) => sum + value * weights[index], 0);
    const weightSum = weights.slice(0, window.length).reduce((sum, value) => sum + value, 0);
    result.push(weightedSum / weightSum);
  }
  return result;
};

// Function to parse time into Date object (for better processing)
const parseCheckInTime = (timeString) => {
  const date = new Date();
  const [time, period] = timeString.split(' '); // Splits into time and period (AM/PM)
  const [hours, minutes] = time.split(':');  // Splits into hours and minutes
  const adjustedHour = period === 'PM' ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12;
  date.setHours(adjustedHour, parseInt(minutes), 0);
  return date;
};

// Convert hour (24-hour format) to 12-hour format
const to12HourFormat = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12; // Convert 0 to 12 (for 12:00 AM)
  return `${adjustedHour}:00 ${period}`;
};

// Predict Check-in Patterns
const predictCheckInPatterns = (events) => {
  const checkInTimes = events.map(event => parseCheckInTime(event["Check-in Time"]));  // Convert string to Date object
  const checkInGroups = {};

  checkInTimes.forEach(time => {
    const hour = time.getHours();
    const hourLabel = to12HourFormat(hour); // Convert to 12-hour format

    if (!checkInGroups[hourLabel]) {
      checkInGroups[hourLabel] = 0;
    }
    checkInGroups[hourLabel] += 1;
  });

  const sortedHours = Object.keys(checkInGroups).sort((a, b) => {
    const get24Hour = (timeLabel) => {
      const [hour, period] = timeLabel.split(' ');
      let hourInt = parseInt(hour);
      if (period === 'PM' && hourInt !== 12) {
        hourInt += 12; // Convert PM hours to 24-hour format
      }
      if (period === 'AM' && hourInt === 12) {
        hourInt = 0; // Convert 12 AM to 0 (midnight)
      }
      return hourInt;
    };

    return get24Hour(a) - get24Hour(b); // Compare based on 24-hour time
  });

  const checkInArray = sortedHours.map(hour => checkInGroups[hour]);
  const predictedCheckIns = weightedMovingAverage(checkInArray, 3);  // Use a weighted moving average for better smoothing

  return sortedHours.map((hour, index) => ({
    hour: hour,
    predictedCheckIns: predictedCheckIns[index],
  }));
};

const CheckInPatternsByHour = () => {
  const [checkInPattern, setCheckInPattern] = useState([]);
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
        const checkInPredictions = predictCheckInPatterns(eventData);
        setCheckInPattern(checkInPredictions);
      } catch (error) {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();

    // Real-time listener for updates
    const unsubscribe = onSnapshot(collection(db1, 'csvData'), (snapshot) => {
      const eventData = snapshot.docs.map(doc => doc.data());
      const checkInPredictions = predictCheckInPatterns(eventData);
      setCheckInPattern(checkInPredictions);
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []);

  const peakCheckInTime = checkInPattern.reduce((prev, curr) => (prev.predictedCheckIns > curr.predictedCheckIns ? prev : curr), {});

  // Predictive Insights
  const increasingTrend = checkInPattern.slice(-3).every((item, idx, arr) => idx === 0 || item.predictedCheckIns > arr[idx - 1].predictedCheckIns);
  const decreasingTrend = checkInPattern.slice(-3).every((item, idx, arr) => idx === 0 || item.predictedCheckIns < arr[idx - 1].predictedCheckIns);

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center' }}><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold' }}>{error}</div>
      ) : (
        <div>
          <h3 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>Check-in Patterns by Hour</h3>
          <div style={{ width: '1000px', height: '400px', margin: '0 auto', overflowY: 'auto', maxHeight: '400px' }}>
            <Line
              data={{
                labels: checkInPattern.map(item => item.hour),
                datasets: [
                  {
                    label: 'Predicted Check-ins by Hour',
                    data: checkInPattern.map(item => item.predictedCheckIns),
                    borderColor: 'rgb(255, 159, 64)',
                    fill: false,
                    tension: 0.1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => `Predicted check-ins: ${context.raw}`,
                    },
                  },
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Hour of the Day',
                      font: { size: 16 },
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Number of Check-ins',
                      font: { size: 16 },
                    },
                  },
                },
              }}
            />
          </div>

          {/* Predictive Insights Section */}
          <div style={{ marginTop: '20px', fontSize: '16px' }}>
            <h4 style={{ fontSize: '20px', marginBottom: '10px' }}>Predicted Insights</h4>
            <p>The predicted peak check-in time is at <strong>{peakCheckInTime.hour}</strong> with approximately <strong>{Math.round(peakCheckInTime.predictedCheckIns)}</strong> check-ins. This suggests that you can expect a higher number of attendees during this time.</p>
            
            {increasingTrend && (
              <p>Recent check-ins show an increasing trend, indicating a potential rise in event attendance. It would be beneficial to ensure that sufficient resources (e.g., staff, facilities) are available to handle the increased flow during these peak hours.</p>
            )}
            {decreasingTrend && (
              <p>Recent check-ins show a decreasing trend, suggesting that the flow of attendees may taper off soon. This could be an opportunity to reallocate resources to other areas of the event or prepare for wrap-up activities.</p>
            )}
            {!increasingTrend && !decreasingTrend && (
              <p>The check-in pattern is currently stable, suggesting that attendance is consistent. Monitoring over time can help identify any shifts in behavior.</p>
            )}

            <p>Based on the current trends, it is advisable to focus resources around peak hours to ensure a smooth attendee experience. For future events, analyzing these patterns in real-time could help refine resource allocation strategies.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInPatternsByHour;