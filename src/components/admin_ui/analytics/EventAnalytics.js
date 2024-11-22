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

  // Inline styles for buttons and container
  const buttonStyle = {
    padding: '6px 12px', // Smaller padding
    fontSize: '14px', // Smaller font size
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s, transform 0.2s',
    textAlign: 'left', // Align text to the left inside buttons
    width: 'auto', // Adjust the width to fit the text
  };

  const prevButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f0f0f0',
  };

  const nextButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: 'white',
  };

  const buttonContainerStyle = {
    position: 'absolute', // Position buttons at top-right
    top: '10px',
    right: '10px',
    display: 'flex',
    gap: '10px', // Smaller gap between buttons
  };

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
      <div>{charts[currentChartIndex]}</div>
      <div style={buttonContainerStyle}>
        <button
          style={prevButtonStyle}
          onClick={handlePrevChart}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#d1d1d1')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
        >
          Prev
        </button>
        <button
          style={nextButtonStyle}
          onClick={handleNextChart}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#218838')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#28a745')}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default EventAnalytics;
