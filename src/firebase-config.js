// Firebase Configuration for GigLega
// Import this file in your HTML pages before using Firebase

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC5t9BzQZSvLZr45u_SvCllOl0VuwHBWTs",
  authDomain: "giglega.firebaseapp.com",
  projectId: "giglega",
  storageBucket: "giglega.firebasestorage.app",
  messagingSenderId: "259241349840",
  appId: "1:259241349840:web:26cbc53a276cc1a0da04d5",
  measurementId: "G-FDMLEF9CEP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
