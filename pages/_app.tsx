// pages/_app.tsx
import { useEffect } from 'react';
import * as PusherPushNotifications from "@pusher/push-notifications-web";

function MyApp() {
  useEffect(() => {
    const registerPushNotifications = async () => {
      const beamsClient = await initializeApp('YOUR_INSTANCE_ID');
      const pushSubscription = await beamsClient.getPushSubscription();

      // Send the push subscription to your server
      fetch('/api/register-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: pushSubscription }),
      });
    };

    registerPushNotifications();
  }, []);

  return
}

export default MyApp;
