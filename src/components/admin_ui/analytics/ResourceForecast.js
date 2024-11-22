import React, { useState, useEffect } from 'react';
import { db1 } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { ThreeDots } from 'react-loader-spinner';
import { predictResources, predictInventory } from '../utils';  // Import both functions

const ResourceForecast = () => {
  const [resourceForecast, setResourceForecast] = useState([]);
  const [inventoryForecast, setInventoryForecast] = useState([]);
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

        console.log('Fetched event data:', eventData);

        const resourceGroups = {};
        const inventoryGroups = {};

        eventData.forEach(event => {
          if (event["Event/Occasion"]) {
            const resources = predictResources(event);  // Predict resources for the event
            const inventory = predictInventory(event);  // Predict inventory for the event

            if (!resources || !inventory) {
              console.error("Invalid resource or inventory data for event:", event);
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
              materials: Math.min(Math.max(inventory.materials, 0), 150),
            };

            if (!resourceGroups[event["Event/Occasion"]]) {
              resourceGroups[event["Event/Occasion"]] = { seating: 0, catering: 0, staff: 0 };
              inventoryGroups[event["Event/Occasion"]] = { food: 0, drinks: 0, materials: 0 };
            }

            resourceGroups[event["Event/Occasion"]].seating += constrainedResources.seating;
            resourceGroups[event["Event/Occasion"]].catering += constrainedResources.catering;
            resourceGroups[event["Event/Occasion"]].staff += constrainedResources.staff;

            inventoryGroups[event["Event/Occasion"]].food += constrainedInventory.food;
            inventoryGroups[event["Event/Occasion"]].drinks += constrainedInventory.drinks;
            inventoryGroups[event["Event/Occasion"]].materials += constrainedInventory.materials;
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

  // Predictive Insights Function
  const generatePredictiveInsights = () => {
    if (resourceForecast.length === 0 || inventoryForecast.length === 0) {
      return "No data available to generate predictive insights.";
    }

    let insights = "Based on the resource and inventory forecasts, here are the predictions: \n";

    let totalSeating = 0, totalCatering = 0, totalStaff = 0;
    resourceForecast.forEach(forecast => {
      totalSeating += forecast.resources.seating;
      totalCatering += forecast.resources.catering;
      totalStaff += forecast.resources.staff;
    });

    let totalFood = 0, totalDrinks = 0, totalMaterials = 0;
    inventoryForecast.forEach(forecast => {
      totalFood += forecast.inventory.food;
      totalDrinks += forecast.inventory.drinks;
      totalMaterials += forecast.inventory.materials;
    });

    insights += `- Total predicted seating: ${totalSeating}\n`;
    insights += `- Total predicted catering resources: ${totalCatering}\n`;
    insights += `- Total predicted staff: ${totalStaff}\n`;

    insights += `- Total predicted food items: ${totalFood}\n`;
    insights += `- Total predicted drinks items: ${totalDrinks}\n`;
    insights += `- Total predicted materials items: ${totalMaterials}\n`;

    // Predictive Insights Based on Trends
    if (totalSeating > 150) {
      insights += "- Predicted seating demand suggests preparation for larger-scale events, possibly requiring additional space.\n";
    }
    if (totalFood > 400) {
      insights += "- Food requirements are likely to surpass available stock; consider scaling up food production and supply.\n";
    }
    if (totalDrinks > 250) {
      insights += "- There could be higher-than-usual demand for drinks, particularly for larger events.\n";
    }
    if (totalMaterials > 100) {
      insights += "- Ensure there are enough materials available to meet the increasing trend in event activities.\n";
    }

    return insights;
  };

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'scroll', paddingRight: '15px' }}>
      {loading ? (
        <div><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red', fontSize: '18px', fontWeight: 'bold', marginTop: '20px' }}>{error}</div>
      ) : (
        <div>
          <h3 style={{ fontSize: '24px', color: '#333', textAlign: 'center' }}>Resource Forecast</h3>
          {resourceForecast.length > 0 && (
            <div style={{ width: '100%', height: '400px', maxWidth: '1200px', margin: '0 auto' }}>
              <Line
                data={{
                  labels: resourceForecast.map(forecast => forecast.eventName),
                  datasets: [
                    {
                      label: 'Historical Seating',
                      data: resourceForecast.map(forecast => forecast.resources.seating),
                      borderColor: 'rgb(75, 192, 192)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Seating',
                      data: resourceForecast.map(forecast => forecast.resources.seating),
                      borderColor: 'rgb(75, 192, 192)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Historical Catering',
                      data: resourceForecast.map(forecast => forecast.resources.catering),
                      borderColor: 'rgb(153, 102, 255)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Catering',
                      data: resourceForecast.map(forecast => forecast.resources.catering),
                      borderColor: 'rgb(153, 102, 255)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Historical Staff',
                      data: resourceForecast.map(forecast => forecast.resources.staff),
                      borderColor: 'rgb(255, 159, 64)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Staff',
                      data: resourceForecast.map(forecast => forecast.resources.staff),
                      borderColor: 'rgb(255, 159, 64)',
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

          <h3 style={{ fontSize: '24px', color: '#333', textAlign: 'center' }}>Inventory Forecast</h3>
          {inventoryForecast.length > 0 && (
            <div style={{ width: '200%', height: '200px', maxWidth: '1200px', margin: '0 auto' }}>
              <Line
                data={{
                  labels: inventoryForecast.map(forecast => forecast.eventName),
                  datasets: [
                    {
                      label: 'Historical Food',
                      data: inventoryForecast.map(forecast => forecast.inventory.food),
                      borderColor: 'rgb(255, 99, 132)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Food',
                      data: inventoryForecast.map(forecast => forecast.inventory.food),
                      borderColor: 'rgb(255, 99, 132)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Historical Drinks',
                      data: inventoryForecast.map(forecast => forecast.inventory.drinks),
                      borderColor: 'rgb(54, 162, 235)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Drinks',
                      data: inventoryForecast.map(forecast => forecast.inventory.drinks),
                      borderColor: 'rgb(54, 162, 235)',
                      fill: false,
                      borderWidth: 2,
                      pointRadius: 5,
                      borderDash: [5, 5],
                    },
                    {
                      label: 'Historical Materials',
                      data: inventoryForecast.map(forecast => forecast.inventory.materials),
                      borderColor: 'rgb(255, 159, 64)',
                      fill: false,
                      borderWidth: 1,
                      pointRadius: 3,
                      lineTension: 0.2,
                    },
                    {
                      label: 'Predicted Materials',
                      data: inventoryForecast.map(forecast => forecast.inventory.materials),
                      borderColor: 'rgb(255, 159, 64)',
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

          <h4 style={{ fontSize: '20px', color: '#333' }}>Predictive Insights</h4>
          <pre style={{ fontSize: '16px', color: '#333', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {generatePredictiveInsights()}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ResourceForecast;
