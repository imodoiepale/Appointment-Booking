'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Use dynamic import with SSR disabled for the error page
const ErrorLayout = dynamic(() => import('@/components/ErrorLayout'), { 
  ssr: false // This is crucial to prevent React error #130
});

export default function Custom500() {
  return (
    <ErrorLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center p-8">
        <div className="space-y-3">
          <h1 className="text-6xl font-bold">500</h1>
          <h2 className="text-2xl font-medium">Server Error</h2>
          <p className="text-muted-foreground">
            Sorry, something went wrong on our server.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            Go Home
          </Link>
        </Button>
      </div>
    </ErrorLayout>
  );
}
