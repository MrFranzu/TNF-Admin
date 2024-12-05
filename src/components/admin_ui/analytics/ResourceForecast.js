import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';  
import { ThreeDots } from 'react-loader-spinner';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ResourceForecast = () => {
  const [resourceForecast, setResourceForecast] = useState([]);
  const [inventoryForecast, setInventoryForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(5); // default filter: Top 5
  const [eventBookings, setEventBookings] = useState({}); // new state for event bookings

  useEffect(() => {
    const fetchEvents = async () => {
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

        setResourceForecast(combinedResourceForecast);
        setInventoryForecast(combinedInventoryForecast);
        setEventBookings(bookingsCount); // Set the event bookings data

      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleFilterChange = (e) => setFilter(Number(e.target.value));

  const predictResources = (event) => ({
    seating: Math.random() * 100 + 50,  // Simulated seating
    catering: Math.random() * 50 + 25,  // Simulated catering
  });

  const predictInventory = (event) => ({
    food: Math.random() * 200 + 100,  // Simulated food
    drinks: Math.random() * 100 + 50,  // Simulated drinks
  });

  // Optimize sorting with useMemo to avoid unnecessary recalculations
  const sortedResourceForecast = useMemo(() => {
    return [...resourceForecast].sort((a, b) => eventBookings[b.eventName] - eventBookings[a.eventName]); // Sort by total bookings
  }, [resourceForecast, eventBookings]);

  const filteredResourceForecast = useMemo(() => sortedResourceForecast.slice(0, filter), [sortedResourceForecast, filter]);

  const sortedInventoryForecast = useMemo(() => {
    return [...inventoryForecast].sort((a, b) => eventBookings[b.eventName] - eventBookings[a.eventName]); // Sort by total bookings
  }, [inventoryForecast, eventBookings]);

  const filteredInventoryForecast = useMemo(() => sortedInventoryForecast.slice(0, filter), [sortedInventoryForecast, filter]);

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'scroll', paddingRight: '15px' }}>
      {loading ? (
        <div><ThreeDots color="grey" height="80" width="80" /></div>
      ) : error ? (
        <div>{error}</div>
      ) : (
        <div>
          <h4>Resource Forecast</h4>
          <div>
            <label>Filter Top: </label>
            <select onChange={handleFilterChange} value={filter}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
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

          <div style={{ margin: '40px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredResourceForecast.map((forecast, index) => {
              const totalBookings = eventBookings[forecast.eventName];
              return (
                <div key={forecast.eventName} style={{ padding: '20px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)' }}>
                  <h4 style={{ fontSize: '20px', color: '#333' }}>{forecast.eventName}</h4>
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
                      <li>Seating per booking: {(forecast.resources.seating / totalBookings).toFixed(2)}</li>
                      <li>Catering per booking: {(forecast.resources.catering / totalBookings).toFixed(2)}</li>
                      <li>Food per booking: {(filteredInventoryForecast[index].inventory.food / totalBookings).toFixed(2)}</li>
                      <li>Drinks per booking: {(filteredInventoryForecast[index].inventory.drinks / totalBookings).toFixed(2)}</li>
                    </ul>
                  </div>
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
