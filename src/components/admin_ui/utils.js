// utils.js

// Moving Average Function
export const movingAverage = (data, windowSize) => {
  let result = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= windowSize) {
      sum -= data[i - windowSize];
    }
    result.push(sum / Math.min(i + 1, windowSize));
  }
  return result;
};

// Predict Resources Function (with event data)
export const predictResources = (event) => {
  const numOfPersons = event["No. of persons"];
  const menu = event["Menu"];
  let seating = numOfPersons;
  let catering = 0;
  let staff = Math.ceil(numOfPersons / 10); // 1 staff for every 10 people

  // Example menu-based logic for catering predictions
  if (menu.includes('Mini Pancakes')) {
    catering += numOfPersons * 3;  // 3 mini pancakes per person
  }
  if (menu.includes('Fruit Cups')) {
    catering += numOfPersons * 2;  // 2 servings of fruit cups per person
  }
  if (menu.includes('Iced Tea')) {
    catering += numOfPersons * 1;  // 1 iced tea per person
  }

  return { seating, catering, staff };
};

// Predict Inventory Function (for food, drinks, materials)
export const predictInventory = (event) => {
  const numOfPersons = event["No. of persons"];
  const menu = event["Menu"];
  let inventory = { food: 0, drinks: 0, materials: 0 };

  // Example menu-based logic for inventory predictions
  if (menu.includes('Mini Pancakes')) {
    inventory.food += numOfPersons * 3;  // 3 mini pancakes per person
  }
  if (menu.includes('Fruit Cups')) {
    inventory.food += numOfPersons * 2;  // 2 servings of fruit cups per person
  }
  if (menu.includes('Iced Tea')) {
    inventory.drinks += numOfPersons * 1;  // 1 iced tea per person
  }

  inventory.materials = numOfPersons * 1.5; // 1.5 items per person (plates, napkins)

  return inventory;
};
