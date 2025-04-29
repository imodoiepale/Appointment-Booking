'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-3">
        <h1 className="text-6xl font-bold">500</h1>
        <h2 className="text-2xl font-medium">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <div className="flex space-x-4">
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
        <Button asChild>
          <Link href="/">
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
