import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// NEW: Import Storage SDK
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCd_kPUmunO_roBsdElnstoRa1vN68q1G8",
  authDomain: "livelimatch-portal.web.app", 
  projectId: "livelimatch-1c945",
  storageBucket: "livelimatch-1c945.firebasestorage.app",
  messagingSenderId: "39074464846",
  appId: "1:39074464846:web:05b4ab616cc0fccf01af1f",
  measurementId: "G-8W0S22TDXP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
// NEW: Initialize and export Storage
export const storage = getStorage(app);

// Optional: Ensure the user stays logged in on page refresh
setPersistence(auth, browserLocalPersistence);