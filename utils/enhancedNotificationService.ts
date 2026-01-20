// ==========================================
// ENHANCED NOTIFICATION SERVICE
// Integrates Firebase FCM with existing Pusher Beams
// ==========================================

// Import Firebase functions (will work after npm install)
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

// Initialize variables only in browser context
let beamsClient: any = null;
let dbPromise: Promise<IDBDatabase> | null = null;
let fcmToken: string | null = null;

// Your Pusher Beams instance ID (replace with your actual instance ID)
const BEAMS_INSTANCE_ID = "625fdd5a-50f6-4c5a-b085-31b81e7bc6ef";

// Notification assets
const NOTIFICATION_ICONS = {
    DEFAULT: '/android/android-launchericon-192-192.png',
    BADGE: '/android/android-launchericon-72-72.png',
    LARGE: '/android/android-launchericon-512-512.png',
};

const NOTIFICATION_SOUNDS = {
    DEFAULT: '/sounds/notification.mp3',
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize Firebase Cloud Messaging
export const initFirebaseMessaging = async () => {
    if (!messaging || !isBrowser) {
        console.log('Firebase Messaging not available');
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
            vapidKey: 'BG3gW_xhqF7qk5s4uHWoT6PWgqEmB0O2D1OZbd2WB0gVYIlZ-8VSPEULAtoeb-cEO6LCsHk907YfBAMw2j7UvhI' // Your actual VAPID key
        });

        console.log('FCM Token obtained:', token);
        fcmToken = token;

        // Store token in localStorage for persistence
        localStorage.setItem('fcmToken', token);

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
            console.log('Received foreground message:', payload);
            showNotification(payload.notification?.title || 'New Message', {
                body: payload.notification?.body || '',
                icon: NOTIFICATION_ICONS.DEFAULT,
                tag: 'firebase-message',
                data: payload.data
            });
        });

        return token;
    } catch (error) {
        console.error('Error initializing Firebase Messaging:', error);
        return null;
    }
};

// Get stored FCM token
export const getFCMToken = () => {
    if (fcmToken) return fcmToken;
    return localStorage.getItem('fcmToken');
};

// Initialize the IndexedDB database (existing functionality)
function initDatabase(): Promise<IDBDatabase> {
    if (!isBrowser) {
        return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('meeting-notifications-db', 2);

            request.onupgradeneeded = (event) => {
                const db = request.result;
                if (!db.objectStoreNames.contains('notifications')) {
                    db.createObjectStore('notifications', { keyPath: 'id' });
                    console.log('Created notifications object store');
                }
            };

            request.onsuccess = () => {
                console.log('Successfully opened IndexedDB');
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
        });
    }
    return dbPromise;
}

// Show browser notification (enhanced)
function showNotification(title: string, options: NotificationOptions = {}) {
    if (!isBrowser || !('Notification' in window)) {
        console.log('Notifications not supported');
        return;
    }

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: NOTIFICATION_ICONS.DEFAULT,
            badge: NOTIFICATION_ICONS.BADGE,
            sound: NOTIFICATION_SOUNDS.DEFAULT,
            requireInteraction: false,
            ...options
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        // Handle click events
        notification.onclick = () => {
            notification.close();
            // Navigate to schedule page if data contains URL
            if (options.data?.url) {
                window.location.href = options.data.url;
            }
        };

        return notification;
    }
}

// Initialize Pusher Beams (existing functionality)
export const initPushNotifications = async () => {
    if (!isBrowser) return;

    try {
        // Dynamically import Pusher Beams to avoid SSR issues
        const { PusherBeams } = await import('@pusher/push-notifications-web');

        beamsClient = new PusherBeams({
            instanceId: BEAMS_INSTANCE_ID,
        });

        // Initialize Firebase first
        await initFirebaseMessaging();

        // Get existing FCM token to register with Pusher
        const token = getFCMToken();
        if (token) {
            await beamsClient.start();
            await beamsClient.registerDevice(token);
            console.log('Registered device with Pusher Beams using FCM token');
        }

        return beamsClient;
    } catch (error) {
        console.error('Error initializing Pusher Beams:', error);
    }
};

// Schedule notification (existing functionality enhanced)
export const scheduleNotification = async (id: string, title: string, body: string, scheduledTime: Date) => {
    if (!isBrowser) return;

    try {
        const db = await initDatabase();
        const transaction = db.transaction(['notifications'], 'readwrite');
        const store = transaction.objectStore('notifications');

        const notification = {
            id,
            title,
            body,
            scheduledTime: scheduledTime.toISOString(),
            created: new Date().toISOString(),
            type: 'scheduled'
        };

        await store.add(notification);
        console.log('Scheduled notification:', notification);
    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
};

// Check due notifications (existing functionality)
export const checkDueNotifications = async () => {
    if (!isBrowser) return;

    try {
        const db = await initDatabase();
        const transaction = db.transaction(['notifications'], 'readonly');
        const store = transaction.objectStore('notifications');
        const notifications = await store.getAll();

        const now = new Date();
        const dueNotifications = notifications.filter(n =>
            new Date(n.scheduledTime) <= now && !n.sent
        );

        for (const notification of dueNotifications) {
            showNotification(notification.title, {
                body: notification.body,
                tag: `scheduled-${notification.id}`,
                data: { url: '/schedule' }
            });

            // Mark as sent
            const updateTransaction = db.transaction(['notifications'], 'readwrite');
            const updateStore = updateTransaction.objectStore('notifications');
            await updateStore.put({ ...notification, sent: true, sentAt: new Date().toISOString() });
        }
    } catch (error) {
        console.error('Error checking due notifications:', error);
    }
};

// Export for use in components
export { beamsClient, showNotification };
