import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as tf from '@tensorflow/tfjs';

const EventAnalytics = () => {
  const [data, setData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [peakHours, setPeakHours] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await d3.csv('try.csv');
        if (!data.length) throw new Error("No data found in the CSV file.");

        setData(data);
        forecastBookings(data);
        analyzeCheckInPatterns(data);
        forecastResources(data);
      } catch (error) {
        console.error("Error loading the CSV file:", error);
      }
    };

    loadData();
  }, []);

  const forecastBookings = async (historicalData) => {
    const validData = historicalData.filter(item => item.date && item.reservations);

    if (validData.length === 0) {
      return console.error("No valid data available for forecasting bookings.");
    }

    const xs = tf.tensor2d(validData.map(({ date, reservations }) => [new Date(date).getTime(), parseInt(reservations)]));
    const ys = tf.tensor2d(validData.map(({ check_ins }) => [parseInt(check_ins)]));

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [2] }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });

    await model.fit(xs, ys, { epochs: 100 });

    const futureDates = Array.from({ length: 30 }, (_, i) => Date.now() + i * 24 * 60 * 60 * 1000);
    const futureInputs = tf.tensor2d(futureDates.map(date => [date, 0]));
    const futurePredictions = await model.predict(futureInputs).array();

    setPredictions(futurePredictions.map(pred => pred[0]));
    drawChart(futurePredictions.map(pred => pred[0]));
  };

  const analyzeCheckInPatterns = (scanData) => {
    const checkInCounts = scanData.reduce((acc, { check_in_time }) => {
      const hour = new Date(check_in_time).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHours = Object.entries(checkInCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);

    setPeakHours(peakHours);
    console.log("Peak Check-in Hours:", peakHours);
  };

  const forecastResources = (eventData) => {
    const resources = eventData.reduce((acc, { event_type, reservations }) => {
      if (!event_type || reservations === undefined || reservations === null) {
        console.error("Event type is undefined or reservations are missing:", { event_type, reservations });
        return acc; // Skip this entry
      }

      const expectedAttendees = parseInt(reservations) || 0;
      if (!acc[event_type]) {
        acc[event_type] = { seating: 0, catering: 0, staffing: 0 };
      }

      acc[event_type].seating += expectedAttendees;
      acc[event_type].catering += expectedAttendees * 2;
      acc[event_type].staffing += Math.ceil(expectedAttendees / 20);
      return acc;
    }, {});

    console.log("Forecasted Resources:", resources);
  };

  const drawChart = (predictions) => {
    const svg = d3.select('svg').attr('width', 600).attr('height', 400);
    svg.selectAll('*').remove(); // Clear previous drawings

    const allData = [
      ...data.map(d => ({
        date: new Date(d.date),
        reservations: parseInt(d.reservations) || 0,
      })),
      ...predictions.map((pred, i) => ({
        date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
        reservations: pred,
      })),
    ];

    const xScale = d3.scaleTime()
      .domain(d3.extent(allData, d => d.date))
      .range([0, 600]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allData, d => d.reservations) || 0])
      .range([400, 0]);

    svg.append('g')
      .attr('transform', 'translate(0, 400)')
      .call(d3.axisBottom(xScale));

    svg.append('g')
      .call(d3.axisLeft(yScale));

    const drawLine = (data, stroke) => {
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', 1.5)
        .attr('d', d3.line()
          .x(d => xScale(d.date))
          .y(d => yScale(d.reservations))
        );
    };

    drawLine(allData.filter(d => d.reservations > 0), 'blue'); // Historical data
    drawLine(predictions.map((pred, i) => ({
      date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
      reservations: pred,
    })), 'red'); // Future predictions
  };

  return (
    <div>
      <h1>Event Predictive Analytics</h1>
      <svg />
      <h2>Future Predictions</h2>
      <ul>
        {predictions.map((prediction, index) => (
          <li key={index}>Day {index + 1}: {Math.round(prediction)}</li>
        ))}
      </ul>
      <h2>Peak Check-in Hours</h2>
      <ul>
        {peakHours.map(([hour, count]) => (
          <li key={hour}>Hour {hour}: {count} check-ins</li>
        ))}
      </ul>
    </div>
  );
};

export default EventAnalytics;
