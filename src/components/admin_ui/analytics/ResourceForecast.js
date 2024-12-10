import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';  
import { ThreeDots } from 'react-loader-spinner';
import { debounce } from 'lodash';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ResourceForecast = () => {
  const [data, setData] = useState({
    resourceForecast: [],
    inventoryForecast: [],
    eventBookings: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(5); // Default filter: Top 5
  const [searchQuery, setSearchQuery] = useState(''); // State for the search query

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eventCollection = collection(db1, 'csvData');
      const snapshot = await getDocs(eventCollection);
      const eventData = snapshot.docs.map(doc => doc.data());

      const resourceGroups = {};
      const inventoryGroups = {};
      const bookingsCount = {};  // Store total bookings for each event

      eventData.forEach(event => {
        if (event["Event/Occasion"]) {
          const resources = predictResources(event);
          const inventory = predictInventory(event);

          if (!resources || !inventory) return;

          const constrainedResources = {
            seating: Math.min(Math.max(resources.seating, 0), 200),
            catering: Math.min(Math.max(resources.catering, 0), 100),
          };

          const constrainedInventory = {
            food: Math.min(Math.max(inventory.food, 0), 500),
            drinks: Math.min(Math.max(inventory.drinks, 0), 300),
          };

          if (!resourceGroups[event["Event/Occasion"]]) {
            resourceGroups[event["Event/Occasion"]] = { seating: 0, catering: 0 };
            inventoryGroups[event["Event/Occasion"]] = { food: 0, drinks: 0 };
            bookingsCount[event["Event/Occasion"]] = 0; // Initialize booking count
          }

          resourceGroups[event["Event/Occasion"]].seating += constrainedResources.seating;
          resourceGroups[event["Event/Occasion"]].catering += constrainedResources.catering;

          inventoryGroups[event["Event/Occasion"]].food += constrainedInventory.food;
          inventoryGroups[event["Event/Occasion"]].drinks += constrainedInventory.drinks;

          bookingsCount[event["Event/Occasion"]] += 1;  // Count the bookings for this event type
        }
      });

      const combinedResourceForecast = Object.keys(resourceGroups).map(eventName => ({
        eventName,
        resources: resourceGroups[eventName],
      }));

      const combinedInventoryForecast = Object.keys(inventoryGroups).map(eventName => ({
        eventName,
        inventory: inventoryGroups[eventName],
      }));

      setData({
        resourceForecast: combinedResourceForecast,
        inventoryForecast: combinedInventoryForecast,
        eventBookings: bookingsCount
      });

    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = (e) => setFilter(Number(e.target.value));

  const handleSearchChange = debounce((e) => {
    setSearchQuery(e.target.value);
  }, 500); // Debounced search input to reduce re-renders

  const predictResources = (event) => ({
    seating: Math.random() * 100 + 50,  // Simulated seating
    catering: Math.random() * 50 + 25,  // Simulated catering
  });

  const predictInventory = (event) => ({
    food: Math.random() * 200 + 100,  // Simulated food
    drinks: Math.random() * 100 + 50,  // Simulated drinks
  });

  const sortedResourceForecast = useMemo(() => {
    return [...data.resourceForecast].sort((a, b) => data.eventBookings[b.eventName] - data.eventBookings[a.eventName]);
  }, [data.resourceForecast, data.eventBookings]);

  const filteredResourceForecast = useMemo(() => {
    return sortedResourceForecast
      .filter(forecast => forecast.eventName.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, filter);
  }, [sortedResourceForecast, filter, searchQuery]);

  const sortedInventoryForecast = useMemo(() => {
    return [...data.inventoryForecast].sort((a, b) => data.eventBookings[b.eventName] - data.eventBookings[a.eventName]);
  }, [data.inventoryForecast, data.eventBookings]);

  const filteredInventoryForecast = useMemo(() => {
    return sortedInventoryForecast
      .filter(forecast => forecast.eventName.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, filter);
  }, [sortedInventoryForecast, filter, searchQuery]);

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'scroll', paddingRight: '15px' }}>
      {loading ? (
        <div><ThreeDots color="grey" height="80" width="80" /></div>
      ) : error ? (
        <div>{error}</div>
      ) : (
        <div>
          <h4>Resource Forecast</h4>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px' }}>Show Top:</label>
            <select value={filter} onChange={handleFilterChange}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={20}>Top 20</option>
            </select>
          </div>

          {filteredResourceForecast.length > 0 && filteredInventoryForecast.length > 0 && (
            <div style={{ width: '1000px', height: '600px', margin: '40px auto' }}>
              <Bar
                data={{
                  labels: filteredResourceForecast.map(forecast => forecast.eventName),
                  datasets: [
                    {
                      label: 'Seating (Predicted)',
                      data: filteredResourceForecast.map(forecast => forecast.resources.seating),
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      borderColor: 'rgb(255, 99, 132)',
                      borderWidth: 1,
                    },
                    {
                      label: 'Catering (Predicted)',
                      data: filteredResourceForecast.map(forecast => forecast.resources.catering),
                      backgroundColor: 'rgba(255, 159, 64, 0.2)',
                      borderColor: 'rgb(255, 159, 64)',
                      borderWidth: 1,
                    },
                    {
                      label: 'Food (Predicted)',
                      data: filteredInventoryForecast.map(forecast => forecast.inventory.food),
                      backgroundColor: 'rgba(0, 255, 0, 0.2)',
                      borderColor: 'rgb(0, 255, 0)',
                      borderWidth: 1,
                    },
                    {
                      label: 'Drinks (Predicted)',
                      data: filteredInventoryForecast.map(forecast => forecast.inventory.drinks),
                      backgroundColor: 'rgba(0, 0, 255, 0.2)',
                      borderColor: 'rgb(0, 0, 255)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    x: {
                      title: { display: true, text: 'Event Name' },
                      grid: { display: false },
                    },
                    y: {
                      title: { display: true, text: 'Forecasted Values' },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          )}

          <div style={{ marginTop: '20px', marginBottom: '40px' }}>
            <input
              type="text"
              placeholder="Search by event name..."
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
              }}
            />
          </div>

          <div style={{ margin: '40px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredResourceForecast.map((forecast, index) => {
              const seatingPerBooking = (forecast.resources.seating / data.eventBookings[forecast.eventName]).toFixed(2);
              const cateringPerBooking = (forecast.resources.catering / data.eventBookings[forecast.eventName]).toFixed(2);
              const foodPerBooking = (filteredInventoryForecast[index].inventory.food / data.eventBookings[forecast.eventName]).toFixed(2);
              const drinksPerBooking = (filteredInventoryForecast[index].inventory.drinks / data.eventBookings[forecast.eventName]).toFixed(2);

              return (
                <div key={index} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                  <h5>{forecast.eventName}</h5>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Seating (Predicted):</strong> {forecast.resources.seating}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Catering (Predicted):</strong> {forecast.resources.catering}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Food (Predicted):</strong> {filteredInventoryForecast[index].inventory.food}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Drinks (Predicted):</strong> {filteredInventoryForecast[index].inventory.drinks}
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <strong>Insights:</strong>
                    <ul>
                      <li><strong>Seating per Booking:</strong> {seatingPerBooking}</li>
                      <li><strong>Catering per Booking:</strong> {cateringPerBooking}</li>
                      <li><strong>Food per Booking:</strong> {foodPerBooking}</li>
                      <li><strong>Drinks per Booking:</strong> {drinksPerBooking}</li>
                    </ul>
                  </div>
                  <p style={{ marginTop: '20px', fontSize: '14px', color: '#555' }}>
                    These insights help in planning resource allocation for events like "{forecast.eventName}". For example, based on the averages, you can determine the approximate number of chairs, meals, and drinks needed per booking.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceForecast;
