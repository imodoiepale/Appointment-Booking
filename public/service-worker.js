importScripts("https://js.pusher.com/beams/service-worker.js");

// Cache name for our PWA
const CACHE_NAME = 'bcl-appointments-v1';

// Notification assets
const NOTIFICATION_ICONS = {
  DEFAULT: '/android/android-launchericon-192-192.png',
  BADGE: '/android/android-launchericon-72-72.png',
  LARGE: '/android/android-launchericon-512-512.png',
};

const NOTIFICATION_SOUNDS = {
  DEFAULT: '/sounds/notification.mp3',
};

// Database promise for IndexedDB
let dbPromise = null;

// Initialize the IndexedDB database
function initDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('meeting-notifications-db', 1);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
          console.log('[SW] Created notifications object store');
        }
      };
      
      request.onsuccess = () => {
        console.log('[SW] Successfully opened IndexedDB');
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('[SW] Error opening IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }
  
  return dbPromise;
}

// URLs to cache
const urlsToCache = [
  '/',
  '/schedule',
  '/manifest.json',
  NOTIFICATION_ICONS.DEFAULT,
  NOTIFICATION_ICONS.BADGE,
  NOTIFICATION_ICONS.LARGE,
  NOTIFICATION_SOUNDS.DEFAULT,
];

// Install service worker and cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  
  // Also initialize the database during installation
  event.waitUntil(initDatabase());
});

// Activate the service worker
self.addEventListener('activate', event => {
  // Initialize database on activation as well
  event.waitUntil(initDatabase());
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.message || data.body,
        icon: NOTIFICATION_ICONS.DEFAULT,
        badge: NOTIFICATION_ICONS.BADGE,
        image: NOTIFICATION_ICONS.LARGE,
        data: {
          url: data.link || data.url || '/schedule',
          meetingId: data.meetingId
        },
        vibrate: [100, 50, 100, 50, 100],
        tag: data.id || 'meeting-notification',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Meeting'
          }
        ]
      })
    );
    
    // Play sound via postMessage to client
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PLAY_NOTIFICATION_SOUND',
          soundUrl: NOTIFICATION_SOUNDS.DEFAULT
        });
      });
    });
  }
});

// Handle notification click - navigate to the meeting details
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Get the notification data
  const url = event.notification.data?.url || '/schedule';
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline scheduling
self.addEventListener('sync', event => {
  if (event.tag === 'sync-meetings') {
    event.waitUntil(syncMeetingData());
  }
});

// Periodically check for scheduled notifications (every minute)
setInterval(() => {
  if (self.registration.active) {
    self.registration.active.postMessage({
      type: 'CHECK_SCHEDULED_NOTIFICATIONS'
    });
  }
}, 60 * 1000);

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data) {
    if (event.data.type === 'CHECK_SCHEDULED_NOTIFICATIONS') {
      event.waitUntil(checkDueNotifications());
    }
  }
});

// Check for due notifications from IndexedDB
async function checkDueNotifications() {
  try {
    // Ensure DB is initialized
    const db = await initDatabase();
    const now = new Date().getTime();
    const notifications = await getDueNotifications(now);
    
    for (const notification of notifications) {
      // Display the notification
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: NOTIFICATION_ICONS.DEFAULT,
        badge: NOTIFICATION_ICONS.BADGE,
        image: NOTIFICATION_ICONS.LARGE,
        data: notification.data,
        tag: notification.id,
        vibrate: notification.vibrate || [100, 50, 100, 50, 100],
        requireInteraction: notification.requireInteraction || true,
        actions: [
          {
            action: 'view',
            title: 'View Meeting'
          }
        ]
      });
      
      // Delete the notification from storage
      await deleteNotification(notification.id);
      
      // Signal clients to play sound
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundUrl: notification.sound || NOTIFICATION_SOUNDS.DEFAULT
          });
        });
      });
    }
  } catch (error) {
    console.error('[SW] Error checking due notifications:', error);
  }
}

// Function to retrieve due notifications from IndexedDB
async function getDueNotifications(currentTime) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const dueNotifications = request.result.filter(
          notification => notification.timestamp <= currentTime
        );
        resolve(dueNotifications);
      };
      
      request.onerror = () => {
        console.error('[SW] Error getting notifications:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error accessing database for due notifications:', error);
    return [];
  }
}

// Function to delete a notification from IndexedDB
async function deleteNotification(id) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`[SW] Deleted notification: ${id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[SW] Error deleting notification:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error accessing database for deletion:', error);
    throw error;
  }
}

// Sync meeting data function for background sync
async function syncMeetingData() {
  // Implementation for syncing meeting data when coming back online
  // This would typically fetch from IndexedDB and post to server
  return Promise.resolve();
}