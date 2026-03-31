'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar } from 'lucide-react';

export default function CalendarAuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Calendar Connected!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Your Google Calendar has been successfully connected. You can now sync your meetings and receive notifications.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Redirecting to dashboard...</span>
          </div>
          <Button 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Go to Dashboard Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
