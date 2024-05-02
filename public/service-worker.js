self.addEventListener('push', (event) => {
    const notificationData = event.data.json();
    const title = notificationData.title;
    const options = {
      body: notificationData.body,
      // ... add other options like icon, actions, etc.
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });