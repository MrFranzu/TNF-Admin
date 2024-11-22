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

  return (
    <div>
      {loading ? (
        <div><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <div>
          <h3>Check-in Patterns by Hour</h3>
          {/* Container div for chart */}
          <div style={{ width: '1000px', height: '400px', margin: '0 auto' }}>
            <Line
              data={{
                labels: checkInPattern.map(item => item.hour),  // Use the hour labels directly (now in 12-hour format)
                datasets: [
                  {
                    label: 'Predicted Check-ins by Hour',
                    data: checkInPattern.map(item => item.predictedCheckIns),
                    borderColor: 'rgb(255, 159, 64)',
                    fill: false,
                    tension: 0.1,  // Smooth lines
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `Predicted check-ins: ${context.raw}`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Hour of the Day',
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Number of Check-ins',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInPatternsByHour;
