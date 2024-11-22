import React, { useState } from 'react';
import ResourceForecast from './ResourceForecast';
import BookingTrendByTimeSlot from './BookingTrendByTimeSlot';
import CheckInPatternsByHour from './CheckInPatternsByHour';

const EventAnalytics = () => {
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  const charts = [
    <BookingTrendByTimeSlot />,
    <CheckInPatternsByHour />,
    <ResourceForecast />,
  ];

  const handlePrevChart = () => {
    setCurrentChartIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : charts.length - 1));
  };

  const handleNextChart = () => {
    setCurrentChartIndex((prevIndex) => (prevIndex < charts.length - 1 ? prevIndex + 1 : 0));
  };

  return (
    <div className="container">
      <div>{charts[currentChartIndex]}</div>
      <div>
        <button onClick={handlePrevChart}>Prev</button>
        <button onClick={handleNextChart}>Next</button>
      </div>
    </div>
  );
};

export default EventAnalytics;
