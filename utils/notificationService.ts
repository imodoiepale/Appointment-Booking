// Notification service using Pusher Beams for PWA notifications
import * as PusherPushNotifications from "@pusher/push-notifications-web";

let beamsClient: any = null;
let dbPromise: Promise<IDBDatabase> | null = null;

// Your Pusher Beams instance ID (replace with your actual instance ID)
const BEAMS_INSTANCE_ID = "your-pusher-beams-instance-id";

// Notification assets
const NOTIFICATION_ICONS = {
  DEFAULT: '/android/android-launchericon-192-192.png',
  BADGE: '/android/android-launchericon-72-72.png',
  LARGE: '/android/android-launchericon-512-512.png',
};

const NOTIFICATION_SOUNDS = {
  DEFAULT: '/sounds/notification.mp3',
};

// Initialize the IndexedDB database
function initDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('meeting-notifications-db', 1);
      
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
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }
  
  return dbPromise;
}

export async function initPushNotifications() {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if the browser supports service workers and notifications
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported in this browser');
    return false;
  }

  try {
    // Initialize IndexedDB first
    await initDatabase();
  
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Initialize Pusher Beams client
    if (!beamsClient) {
      beamsClient = new PusherPushNotifications.Client({
        instanceId: BEAMS_INSTANCE_ID,
      });
    }

    // Register with Pusher Beams
    const beamsTokenProvider = new PusherPushNotifications.TokenProvider({
      url: "/api/pusher/beams-auth" // Your authentication endpoint
    });

    await beamsClient.start();
    await beamsClient.setUserId(`user-${Math.random().toString(36).substring(2, 15)}`, beamsTokenProvider);
    
    console.log('Push notification setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return false;
  }
}

// Function to schedule a meeting notification
export async function scheduleMeetingNotification(meeting: any, minutesBefore: number = 0) {
  try {
    // Ensure database is initialized first
    await initDatabase();
  
    if (!beamsClient) {
      const initialized = await initPushNotifications();
      if (!initialized) return false;
    }

    // Format meeting details
    const meetingDate = new Date(`${meeting.meeting_date}T${meeting.meeting_start_time}`);
    const notificationTime = new Date(meetingDate.getTime() - (minutesBefore * 60 * 1000));
    
    // If notification time is in the past, don't schedule
    if (notificationTime < new Date()) {
      return false;
    }
    
    // Create a unique ID for this meeting notification
    const notificationId = `meeting-${meeting.id_main}-${minutesBefore}`;
    
    // Prepare notification data with enhanced metadata
    const notificationData = {
      id: notificationId,
      title: getNotificationTitle(minutesBefore, meeting),
      body: getNotificationBody(minutesBefore, meeting),
      icon: NOTIFICATION_ICONS.DEFAULT,
      badge: NOTIFICATION_ICONS.BADGE,
      image: NOTIFICATION_ICONS.LARGE, // Large image for expanded notification view
      sound: NOTIFICATION_SOUNDS.DEFAULT,
      vibrate: [100, 50, 100, 50, 100], // Vibration pattern (milliseconds)
      data: {
        meetingId: meeting.id_main,
        url: '/schedule', // URL to open when notification is clicked
        clientName: meeting.client_name,
        time: meeting.meeting_start_time,
        date: meeting.meeting_date,
        venue: meeting.meeting_venue_area,
        timestamp: notificationTime.getTime(),
      },
      timestamp: notificationTime.getTime(),
      requireInteraction: true, // Keep notification visible until user interacts with it
      silent: false, // Ensures sound and vibration are played
      tag: notificationId, // Used for replacing notifications
    };

    // Store notification to be triggered by our custom mechanism
    await storeScheduledNotification(notificationData);
    return true;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return false;
  }
}

// Helper function to get the appropriate notification title
function getNotificationTitle(minutesBefore: number, meeting: any): string {
  if (minutesBefore === 0) {
    return `Meeting Starting Now`;
  } else {
    return `Meeting in ${minutesBefore} minutes`;
  }
}

// Helper function to get the appropriate notification body
function getNotificationBody(minutesBefore: number, meeting: any): string {
  const clientName = meeting.client_name;
  const venue = meeting.meeting_venue_area;
  const timeString = meeting.meeting_start_time;
  
  if (minutesBefore === 0) {
    return `Your meeting with ${clientName} at ${venue} is starting now.`;
  } else {
    return `Your meeting with ${clientName} at ${venue} starts in ${minutesBefore} minutes (${timeString}).`;
  }
}

// Store notification in IndexedDB for later triggering
async function storeScheduledNotification(notification: any) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.put(notification);
      
      request.onsuccess = () => {
        console.log(`Stored notification: ${notification.id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error storing notification:', request.error);
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        console.log('Transaction completed');
      };
      
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error accessing database:', error);
    throw error;
  }
}

// Schedule all notifications for a meeting
export async function scheduleAllMeetingNotifications(meeting: any) {
  try {
    // Ensure database is initialized first
    await initDatabase();
    
    // Schedule notifications at 30 minutes before
    await scheduleMeetingNotification(meeting, 30);
    
    // Schedule notifications at 10 minutes before
    await scheduleMeetingNotification(meeting, 10);
    
    // Schedule notifications at meeting start time
    await scheduleMeetingNotification(meeting, 0);
    
    return true;
  } catch (error) {
    console.error('Error scheduling all notifications:', error);
    return false;
  }
}

// Function to check and trigger due notifications (for client side)
export async function checkDueNotifications() {
  try {
    // Ensure database is initialized first
    await initDatabase();
    
    const now = new Date().getTime();
    const notifications = await getDueNotifications(now);
    
    for (const notification of notifications) {
      // For client-side, we'll use the Notification API directly
      if (Notification.permission === 'granted') {
        // Play notification sound
        playNotificationSound(notification.sound);
        
        // Create and show the notification
        const notificationOptions = {
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          image: notification.image,
          vibrate: notification.vibrate,
          data: notification.data,
          tag: notification.id,
          requireInteraction: notification.requireInteraction,
          silent: notification.silent,
          actions: [
            {
              action: 'view',
              title: 'View Meeting'
            }
          ]
        };
        
        const notificationInstance = new Notification(notification.title, notificationOptions);
        
        // Add click handler to open the app
        notificationInstance.onclick = function() {
          // Focus or open the app window
          if (window.parent) {
            window.parent.focus();
          }
          window.focus();
          
          // Navigate to the meeting details
          if (notification.data?.url) {
            window.location.href = notification.data.url;
          }
          
          // Close the notification
          this.close();
        };
        
        // Delete the notification from storage after displaying
        await deleteNotification(notification.id);
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking due notifications:', error);
    return false;
  }
}

// Helper function to play notification sound
function playNotificationSound(soundUrl: string = NOTIFICATION_SOUNDS.DEFAULT) {
  try {
    // Create audio element and play sound
    const audio = new Audio(soundUrl);
    audio.volume = 1.0; // Full volume
    
    // Start playing and handle any errors
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Error playing notification sound:', error);
      });
    }
  } catch (error) {
    console.warn('Error creating audio element:', error);
  }
}

// Get notifications that are due to be displayed
async function getDueNotifications(currentTime: number): Promise<any[]> {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const dueNotifications = request.result.filter(
          (notification: any) => notification.timestamp <= currentTime
        );
        resolve(dueNotifications);
      };
      
      request.onerror = () => {
        console.error('Error getting notifications:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error accessing database for due notifications:', error);
    return [];
  }
}

// Delete a notification from storage
async function deleteNotification(id: string) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`Deleted notification: ${id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error deleting notification:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error accessing database for deletion:', error);
    throw error;
  }
}
   