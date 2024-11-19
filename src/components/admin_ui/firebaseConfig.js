import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics'; // Only if using analytics

// Firebase Project 1 configuration event data
const firebaseConfig1 = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Firebase Project 2 configuration qr code
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY_2,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN_2,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL_2,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID_2,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET_2,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID_2,
  appId: process.env.REACT_APP_FIREBASE_APP_ID_2,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID_2,
};

// Initialize both Firebase apps
const app1 = initializeApp(firebaseConfig1, 'app1'); // Initialize first Firebase app event data
const app = initializeApp(firebaseConfig, 'app'); // Initialize second Firebase app

// Initialize Firestore for both apps
const db1 = getFirestore(app1); // Firestore instance for first project event data
const db = getFirestore(app); // Firestore instance for second project

// Optionally, initialize Analytics for each app (if needed)
const analytics1 = getAnalytics(app1); // Analytics for first app (optional) event data
const analytics = getAnalytics(app); // Analytics for second app (optional)

export { db1, db }; // Export Firestore instances
