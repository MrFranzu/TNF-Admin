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

        const resourceGroups = {};
        const inventoryGroups = {};

        eventData.forEach(event => {
          // Ensure the event contains the necessary fields for prediction
          if (event["Event/Occasion"]) {
            const resources = predictResources(event);  // Predict resources for the event
            const inventory = predictInventory(event);  // Predict inventory for the event

            // Debugging: Log the predicted values to check if they're realistic
            console.log(`Predicting resources for event: ${event["Event/Occasion"]}`);
            console.log(`Predicted resources:`, resources);
            console.log(`Predicted inventory:`, inventory);

            // Apply constraints or normalization to prevent unrealistic values
            const constrainedResources = {
              seating: Math.min(Math.max(resources.seating, 0), 200), // Example: limit to a max of 200 seating
              catering: Math.min(Math.max(resources.catering, 0), 100), // Example: limit to a max of 100 catering
              staff: Math.min(Math.max(resources.staff, 0), 50), // Example: limit to a max of 50 staff
            };

            const constrainedInventory = {
              food: Math.min(Math.max(inventory.food, 0), 500), // Example: limit to a max of 500 food items
              drinks: Math.min(Math.max(inventory.drinks, 0), 300), // Example: limit to a max of 300 drinks
              materials: Math.min(Math.max(inventory.materials, 0), 150), // Example: limit to a max of 150 materials
            };

            // Initialize group data if not yet present
            if (!resourceGroups[event["Event/Occasion"]]) {
              resourceGroups[event["Event/Occasion"]] = { seating: 0, catering: 0, staff: 0 };
              inventoryGroups[event["Event/Occasion"]] = { food: 0, drinks: 0, materials: 0 };
            }

            // Update groups with predictions
            resourceGroups[event["Event/Occasion"]].seating += constrainedResources.seating;
            resourceGroups[event["Event/Occasion"]].catering += constrainedResources.catering;
            resourceGroups[event["Event/Occasion"]].staff += constrainedResources.staff;

            inventoryGroups[event["Event/Occasion"]].food += constrainedInventory.food;
            inventoryGroups[event["Event/Occasion"]].drinks += constrainedInventory.drinks;
            inventoryGroups[event["Event/Occasion"]].materials += constrainedInventory.materials;
          }
        });

        // Combine forecast data into arrays for chart rendering
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
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div>
      {loading ? (
        <div><ThreeDots color="gray" /></div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <div>
          <h3>Resource Forecast</h3>
          <div style={{ width: '100%', height: '400px', maxWidth: '1200px', margin: '0 auto' }}>
            <Line
              data={{
                labels: resourceForecast.map(forecast => forecast.eventName),
                datasets: [
                  {
                    label: 'Seating Forecast',
                    data: resourceForecast.map(forecast => forecast.resources.seating),
                    borderColor: 'rgb(75, 192, 192)',
                    fill: false,
                  },
                  {
                    label: 'Catering Forecast',
                    data: resourceForecast.map(forecast => forecast.resources.catering),
                    borderColor: 'rgb(153, 102, 255)',
                    fill: false,
                  },
                  {
                    label: 'Staff Forecast',
                    data: resourceForecast.map(forecast => forecast.resources.staff),
                    borderColor: 'rgb(255, 159, 64)',
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>

          <h3>Inventory Forecast</h3>
          <div style={{ width: '200%', height: '200px', maxWidth: '1200px', margin: '0 auto' }}>
            <Line
              data={{
                labels: inventoryForecast.map(forecast => forecast.eventName),
                datasets: [
                  {
                    label: 'Food Forecast',
                    data: inventoryForecast.map(forecast => forecast.inventory.food),
                    borderColor: 'rgb(255, 99, 132)',  // Red color for food
                    fill: false,
                  },
                  {
                    label: 'Drinks Forecast',
                    data: inventoryForecast.map(forecast => forecast.inventory.drinks),
                    borderColor: 'rgb(54, 162, 235)',  // Blue color for drinks
                    fill: false,
                  },
                  {
                    label: 'Materials Forecast',
                    data: inventoryForecast.map(forecast => forecast.inventory.materials),
                    borderColor: 'rgb(255, 159, 64)',  // Orange color for materials
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceForecast;
