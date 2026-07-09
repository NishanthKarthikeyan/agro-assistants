// src/config/firebase.js
// Firebase SDK initialization for the frontend

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCXK0KHqLhKVAAm5xr0ASbFKJM5IwVLeTY",
  authDomain: "agri--sps-project.firebaseapp.com",
  projectId: "agri--sps-project",
  storageBucket: "agri--sps-project.firebasestorage.app",
  messagingSenderId: "762110077628",
  appId: "1:762110077628:web:9d219b9d67bbecf270beb9",
  measurementId: "G-CZ1QZ6437H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
