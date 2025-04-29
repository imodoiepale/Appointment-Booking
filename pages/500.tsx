// This is a client-side only 500 page - no server components
// @ts-nocheck
import React from 'react';
import Link from 'next/link';

// Simple 500 page without any server components or complex imports
export default function Custom500() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <h2 className="text-2xl font-medium mb-4">Server Error</h2>
      <p className="text-gray-600 mb-8">
        Sorry, something went wrong on our server.
      </p>
      <Link href="/" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Go Home
      </Link>
    </div>
  );
}
