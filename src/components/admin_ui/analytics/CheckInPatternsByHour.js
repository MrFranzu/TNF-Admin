import React, { useState, useEffect, useCallback } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

// Register necessary chart.js components
ChartJS.register(Tooltip, Legend, Title, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// Optimized moving average calculation (single pass version)
const movingAverage = (data, windowSize) => {
  const result = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    count++;
    if (count > windowSize) {
      sum -= data[i - windowSize];
      count--;
    }
    result.push(sum / count);
  }
  return result;
};

// Optimized weighted moving average (precomputed weights and single pass)
const weightedMovingAverage = (data, windowSize) => {
  const result = [];
  const weights = Array.from({ length: windowSize }, (_, i) => windowSize - i);
  let weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  
  for (let i = 0; i < data.length; i++) {
    const window = data.slice(Math.max(i - windowSize + 1, 0), i + 1);
    const weightedSum = window.reduce((sum, value, idx) => sum + value * weights[idx], 0);
    result.push(weightedSum / weightSum);
  }
  
  return result;
};

// Function to parse and convert time to Date object
const parseCheckInTime = (timeString) => {
  const [time, period] = timeString.split(' ');
  const [hours, minutes] = time.split(':');
  const adjustedHour = period === 'PM' ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12;
  const date = new Date();
  date.setHours(adjustedHour, parseInt(minutes), 0);
  return date;
};

// Convert hour to 12-hour format
const to12HourFormat = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}:00 ${period}`;
};

// Predict check-in patterns using a weighted moving average
const predictCheckInPatterns = (events) => {
  const checkInTimes = events.map(event => parseCheckInTime(event["Check-in Time"]));
  const checkInGroups = {};

  checkInTimes.forEach(time => {
    const hour = time.getHours();
    const hourLabel = to12HourFormat(hour);

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
        hourInt += 12;
      }
      if (period === 'AM' && hourInt === 12) {
        hourInt = 0;
      }
      return hourInt;
    };

    return get24Hour(a) - get24Hour(b);
  });

  const checkInArray = sortedHours.map(hour => checkInGroups[hour]);
  const predictedCheckIns = weightedMovingAverage(checkInArray, 3); 

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

    const unsubscribe = onSnapshot(collection(db1, 'csvData'), (snapshot) => {
      const eventData = snapshot.docs.map(doc => doc.data());
      const checkInPredictions = predictCheckInPatterns(eventData);
      setCheckInPattern(checkInPredictions);
    });

    return () => unsubscribe();
  }, []);

  const checkInArray = checkInPattern.map(item => item.predictedCheckIns);

  const peakCheckInTime = checkInPattern.reduce((prev, curr) => 
    prev.predictedCheckIns > curr.predictedCheckIns ? prev : curr, {});

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
                datasets: [{
                  label: 'Predicted Check-ins by Hour',
                  data: checkInPattern.map(item => item.predictedCheckIns),
                  borderColor: 'rgb(255, 159, 64)',
                  fill: false,
                  tension: 0.1,
                }],
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
          
          <div style={{ marginTop: '20px', fontSize: '18px' }}>
            <p>The predicted peak check-in time is at <strong>{peakCheckInTime.hour}</strong> with approximately <strong>{Math.round(peakCheckInTime.predictedCheckIns)}</strong> check-ins.</p>
            {increasingTrend && (
              <p>Recent check-ins show an increasing trend, indicating a potential rise in event attendance. Ensure sufficient resources are available.</p>
            )}
            {decreasingTrend && (
              <p>Recent check-ins show a decreasing trend, suggesting a tapering attendance. Consider reallocating resources to other areas.</p>
            )}
            {!increasingTrend && !decreasingTrend && (
              <p>The check-in pattern is stable. Monitor for any shifts in behavior over time.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInPatternsByHour;
