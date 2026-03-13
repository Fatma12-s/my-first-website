import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmNC9-8sRAHGqGSC9r_Zr3mk97tu3RFgc",
  authDomain: "squh-training.firebaseapp.com",
  projectId: "squh-training",
  storageBucket: "squh-training.appspot.com",
  messagingSenderId: "1064112237940",
  appId: "1:1064112237940:web:94905f060413b97ad6d021",
  measurementId: "G-NNKT4PCV5T"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);