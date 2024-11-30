import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';
import { predictResources, predictInventory } from '../utils';

const ResourceForecast = () => {
  const [resourceForecast, setResourceForecast] = useState([]);
  const [inventoryForecast, setInventoryForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(5); // default filter: Top 5

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

        eventData.forEach(event => {
          if (event["Event/Occasion"]) {
            const resources = predictResources(event);
            const inventory = predictInventory(event);

            if (!resources || !inventory) {
              return;
            }

            const constrainedResources = {
              seating: Math.min(Math.max(resources.seating, 0), 200),
              catering: Math.min(Math.max(resources.catering, 0), 100),
              staff: Math.min(Math.max(resources.staff, 0), 50),
            };

            const constrainedInventory = {
              food: Math.min(Math.max(inventory.food, 0), 500),
              drinks: Math.min(Math.max(inventory.drinks, 0), 300),
            };

            if (!resourceGroups[event["Event/Occasion"]]) {
              resourceGroups[event["Event/Occasion"]] = { seating: 0, catering: 0, staff: 0 };
              inventoryGroups[event["Event/Occasion"]] = { food: 0, drinks: 0 };
            }

            resourceGroups[event["Event/Occasion"]].seating += constrainedResources.seating;
            resourceGroups[event["Event/Occasion"]].catering += constrainedResources.catering;
            resourceGroups[event["Event/Occasion"]].staff += constrainedResources.staff;

            inventoryGroups[event["Event/Occasion"]].food += constrainedInventory.food;
            inventoryGroups[event["Event/Occasion"]].drinks += constrainedInventory.drinks;
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
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleFilterChange = (e) => {
    setFilter(Number(e.target.value));
  };

  // Sort by total resources (seating + catering + staff) for each event
  const sortedResourceForecast = [...resourceForecast].map(forecast => {
    const totalResources = forecast.resources.seating + forecast.resources.catering + forecast.resources.staff;
    return { ...forecast, totalResources };
  }).sort((a, b) => b.totalResources - a.totalResources); // Sort by total resources in descending order

  const filteredResourceForecast = sortedResourceForecast.slice(0, filter); // Apply filter

  // Sort by total inventory (food + drinks) for each event
  const sortedInventoryForecast = [...inventoryForecast].map(forecast => {
    const totalInventory = forecast.inventory.food + forecast.inventory.drinks;
    return { ...forecast, totalInventory };
  }).sort((a, b) => b.totalInventory - a.totalInventory); // Sort by total inventory in descending order

  const filteredInventoryForecast = sortedInventoryForecast.slice(0, filter); // Apply filter

  const generatePredictiveInsights = () => {
  // Use filtered data for both resources and inventory forecasts
  const totalResources = filteredResourceForecast.reduce((acc, forecast) => {
    acc.seating += forecast.resources.seating;
    acc.catering += forecast.resources.catering;
    acc.staff += forecast.resources.staff;
    return acc;
  }, { seating: 0, catering: 0, staff: 0 });

  const totalInventory = filteredInventoryForecast.reduce((acc, forecast) => {
    acc.food += forecast.inventory.food;
    acc.drinks += forecast.inventory.drinks;
    return acc;
  }, { food: 0, drinks: 0 });

  // Calculate average demand per resource and inventory from the filtered data
  const avgResourceDemand = {
    seating: totalResources.seating / filteredResourceForecast.length,
    catering: totalResources.catering / filteredResourceForecast.length,
    staff: totalResources.staff / filteredResourceForecast.length,
  };

  const avgInventoryDemand = {
    food: totalInventory.food / filteredInventoryForecast.length,
    drinks: totalInventory.drinks / filteredInventoryForecast.length,
  };

  // Simple Trend Calculation: Assume the last few entries indicate the future growth (basic linear prediction)
  const lastResource = filteredResourceForecast[filteredResourceForecast.length - 1];
  const lastInventory = filteredInventoryForecast[filteredInventoryForecast.length - 1];

  const resourceTrend = {
    seating: lastResource.resources.seating - filteredResourceForecast[filteredResourceForecast.length - 2]?.resources.seating || 0,
    catering: lastResource.resources.catering - filteredResourceForecast[filteredResourceForecast.length - 2]?.resources.catering || 0,
    staff: lastResource.resources.staff - filteredResourceForecast[filteredResourceForecast.length - 2]?.resources.staff || 0,
  };

  const inventoryTrend = {
    food: lastInventory.inventory.food - filteredInventoryForecast[filteredInventoryForecast.length - 2]?.inventory.food || 0,
    drinks: lastInventory.inventory.drinks - filteredInventoryForecast[filteredInventoryForecast.length - 2]?.inventory.drinks || 0,
  };

  // Predict next period based on trends
  const predictedResources = {
    seating: Math.max(0, totalResources.seating + resourceTrend.seating),
    catering: Math.max(0, totalResources.catering + resourceTrend.catering),
    staff: Math.max(0, totalResources.staff + resourceTrend.staff),
  };

  const predictedInventory = {
    food: Math.max(0, totalInventory.food + inventoryTrend.food),
    drinks: Math.max(0, totalInventory.drinks + inventoryTrend.drinks),
  };

  return `
    Total Resources (Filtered Data): 
    Seating: ${totalResources.seating} (Average: ${avgResourceDemand.seating.toFixed(2)})
    Catering: ${totalResources.catering} (Average: ${avgResourceDemand.catering.toFixed(2)})
    Staff: ${totalResources.staff} (Average: ${avgResourceDemand.staff.toFixed(2)})

    Predicted Resources for Next Period:
    Seating: ${predictedResources.seating.toFixed(2)}
    Catering: ${predictedResources.catering.toFixed(2)}
    Staff: ${predictedResources.staff.toFixed(2)}

    Total Inventory (Filtered Data):
    Food: ${totalInventory.food} (Average: ${avgInventoryDemand.food.toFixed(2)})
    Drinks: ${totalInventory.drinks} (Average: ${avgInventoryDemand.drinks.toFixed(2)})

    Predicted Inventory for Next Period:
    Food: ${predictedInventory.food.toFixed(2)}
    Drinks: ${predictedInventory.drinks.toFixed(2)}
  `;
};

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'scroll', paddingRight: '15px' }}>
      {loading ? (
        <div><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold', marginTop: '20px' }}>{error}</div>
      ) : (
        <div>
          <h3 style={{ fontSize: '24px', color: '#333', textAlign: 'center' }}>Resource and Inventory Forecast</h3>

          {/* Filter Dropdown */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <label htmlFor="filter">Filter by Top: </label>
            <select id="filter" value={filter} onChange={handleFilterChange}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>

          {filteredResourceForecast.length > 0 && filteredInventoryForecast.length > 0 && (
            <div style={{ width: '1000px', height: '600px', margin: '40px auto' }}>
              <Line
                data={{
                  labels: filteredResourceForecast.map(forecast => forecast.eventName),
                  datasets: [
                    {
                      label: 'Seating (Predicted)',
                      data: filteredResourceForecast.map(forecast => forecast.resources.seating),
                      borderColor: 'rgb(75, 192, 192)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Catering (Predicted)',
                      data: filteredResourceForecast.map(forecast => forecast.resources.catering),
                      borderColor: 'rgb(153, 102, 255)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Staff (Predicted)',
                      data: filteredResourceForecast.map(forecast => forecast.resources.staff),
                      borderColor: 'rgb(255, 159, 64)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Food (Predicted)',
                      data: filteredInventoryForecast.map(forecast => forecast.inventory.food),
                      borderColor: 'rgb(0, 255, 0)', // Change to green for food
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Drinks (Predicted)',
                      data: filteredInventoryForecast.map(forecast => forecast.inventory.drinks),
                      borderColor: 'rgb(255, 99, 132)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        font: {
                          size: 14,
                        },
                      },
                    },
                    x: {
                      ticks: {
                        font: {
                          size: 14,
                        },
                        autoSkip: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Display predictive insights */}
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <h4>Predictive Insights:</h4>
            <pre>{generatePredictiveInsights()}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceForecast;