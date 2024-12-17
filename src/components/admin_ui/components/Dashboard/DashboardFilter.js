import React, { useState } from "react";

const DashboardFilter = ({ onFilterChange }) => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const years = Array.from(
    { length: new Date().getFullYear() - 2018 + 1 },
    (_, i) => 2018 + i
  );

  const handleFilterChange = () => {
    onFilterChange({
      month: selectedMonth,
      year: selectedYear,
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        style={{
          padding: "5px",
          marginRight: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      >
        <option value="">Month</option>
        {months.map((month, idx) => (
          <option key={idx} value={idx + 1}>
            {month}
          </option>
        ))}
      </select>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        style={{
          padding: "5px",
          marginRight: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      >
        <option value="">Year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <button
        onClick={handleFilterChange}
        style={{
          padding: "5px 10px",
          backgroundColor: "#4a148c",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Filter
      </button>
    </div>
  );
};

export default DashboardFilter;
