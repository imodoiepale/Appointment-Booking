/* eslint-disable react/no-unescaped-entities */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-3">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-medium">Page Not Found</h2>
        <p className="text-muted-foreground">
          We couldn't find the page you were looking for.
        </p>
      </div>
      <div className="mt-4">
        <Link href="/" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Go Home
        </Link>
      </div>
    </div>
  );
}
