// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbXOUD_eJXk_dXjxJ8AoO85JsUamDX6co",
  authDomain: "academia-tales.firebaseapp.com",
  projectId: "academia-tales",
  storageBucket: "academia-tales.firebasestorage.app",
  messagingSenderId: "39782538872",
  appId: "1:39782538872:web:da57d4124078b3c470978d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos los servicios que usaremos gratis
export const auth = getAuth(app);
export const db = getFirestore(app);