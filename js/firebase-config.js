// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey:"AIzaSyCS32LRH2OgNV4VqGc7qJyGWiP1F2vaACo",
    authDomain:"taskmate-6f349.firebaseapp.com",
    projectId:"taskmate-6f349",
    storageBucket:"taskmate-6f349.firebasestorage.app",
    messagingSenderId:"362485876114",
    appId:"1:362485876114:web:b640119b938691c978ad4b",
    measurementId:"G-H2KKFSX3QF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); // Initialize Authentication
const db = getFirestore(app); // Initialize Firestore

export { auth, db }; // Export both auth and Firestore instances
