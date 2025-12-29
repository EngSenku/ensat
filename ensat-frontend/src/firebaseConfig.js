import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQ7XVPKxmnSOIcmo21CWAE86TZJ3STFHg",
  authDomain: "ensat-87044.firebaseapp.com",
  projectId: "ensat-87044",
  storageBucket: "ensat-87044.firebasestorage.app",
  messagingSenderId: "1086390891114",
  appId: "1:1086390891114:web:683fea5125683344559013",
  measurementId: "G-M80H4THDMG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();