// ==========================================
// FIREBASE SERVICE (FCM - FIREBASE CLOUD MESSAGING)
// For parallel notifications to PWA and mobile apps
// ==========================================

export class FirebaseService {
    private projectId: string;
    private serverKey: string;

    constructor(settings: { [key: string]: string }, serverKey: string) {
        this.projectId = settings['firebase_project_id'] || '';
        this.serverKey = serverKey;
    }

    async sendMulticastNotification(title: string, body: string, data?: { [key: string]: string }): Promise<boolean> {
        if (!this.serverKey) {
            console.log('Firebase Server Key missing. Skipping FCM.');
            return false;
        }

        try {
            // Sending to a topic 'all_devices' which your PWA/App should subscribe to
            const url = 'https://fcm.googleapis.com/fcm/send';
            const payload = {
                to: '/topics/all_devices',
                notification: {
                    title: title,
                    body: body,
                    sound: 'default',
                    icon: '/android/android-launchericon-192-192.png',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    url: '/schedule',
                    ...data
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${this.serverKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Firebase Notification Sent:', result);
            return true;
        } catch (error) {
            console.error('Firebase Error:', error);
            return false;
        }
    }

    async sendToDevice(deviceToken: string, title: string, body: string, data?: { [key: string]: string }): Promise<boolean> {
        if (!this.serverKey) {
            console.log('Firebase Server Key missing. Skipping FCM.');
            return false;
        }

        try {
            const url = 'https://fcm.googleapis.com/fcm/send';
            const payload = {
                to: deviceToken,
                notification: {
                    title: title,
                    body: body,
                    sound: 'default',
                    icon: '/android/android-launchericon-192-192.png',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                data: {
                    url: '/schedule',
                    ...data
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${this.serverKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Firebase Notification Sent to Device:', result);
            return true;
        } catch (error) {
            console.error('Firebase Error (Device):', error);
            return false;
        }
    }

    // Test Firebase connection
    async testConnection(): Promise<boolean> {
        if (!this.serverKey) {
            console.log('Firebase Server Key missing. Cannot test connection.');
            return false;
        }

        try {
            // Send a test notification to verify connectivity
            return await this.sendMulticastNotification(
                'Test Notification',
                'Firebase service is working correctly!',
                { test: 'true', timestamp: Date.now().toString() }
            );
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            return false;
        }
    }
}
