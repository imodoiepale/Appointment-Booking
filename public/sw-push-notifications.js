// public/sw.js
self.addEventListener('push', (event) => {
    const data = event.data.json();
  
    const title = data.apns.aps.alert.title;
    const body = data.apns.aps.alert.body;
  
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        // icon: '/icon.png', // Optional
      })
    );
  });
  