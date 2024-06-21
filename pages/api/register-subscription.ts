// @ts-nocheck

// pages/api/register-subscription.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

const pusherClient = new Pusher({
  appId: 'YOUR_APP_ID',
  key: 'YOUR_KEY',
  secret: 'YOUR_SECRET',
  cluster: 'YOUR_CLUSTER',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { subscription } = req.body;

  try {
    // Save the subscription to Pusher Beams
    await pusherClient.putSubscription(subscription);
    res.status(200).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Error saving subscription' });
  }
}
