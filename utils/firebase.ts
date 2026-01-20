// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBW4BILGAoYS-4Oy8oQR6Nxm1tcOJBuuhE",
    authDomain: "bcl-meetings.firebaseapp.com",
    projectId: "bcl-meetings",
    storageBucket: "bcl-meetings.firebasestorage.app",
    messagingSenderId: "212503648547",
    appId: "1:212503648547:web:67768a379a4e0fe0e29496",
    measurementId: "G-KG8SGVGTHS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
    messaging = getMessaging(app);
} catch (error) {
    console.log('Firebase Messaging not supported in this environment:', error);
}

// Export for use in other components
export { app, analytics, messaging, firebaseConfig };

// Function to get FCM token for push notifications
export const getFCMToken = async () => {
    if (!messaging) {
        console.log('Firebase Messaging is not available');
        return null;
    }

    try {
        // Request permission for notifications
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: 'BG3gW_xhqF7qk5s4uHWoT6PWgqEmB0O2D1OZbd2WB0gVYIlZ-8VSPEULAtoeb-cEO6LCsHk907YfBAMw2j7UvhI'
        });

        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

// Function to subscribe to topic
export const subscribeToTopic = async (token, topic = 'all_devices') => {
    // This needs to be done server-side or via Firebase Cloud Functions
    // For now, we'll store the token and handle server-side subscription
    console.log(`Token ${token} should be subscribed to topic: ${topic}`);
    return token;
};
