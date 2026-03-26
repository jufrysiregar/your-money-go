// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB0fbX47eSyaZs8Fyxcem1n93zuzZ-ZxUs",
    authDomain: "your-money-go.firebaseapp.com",
    projectId: "your-money-go",
    storageBucket: "your-money-go.firebasestorage.app",
    messagingSenderId: "243792427367",
    appId: "1:243792427367:web:81ac118884e642157297c2",
    measurementId: "G-CCGQJW299H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();