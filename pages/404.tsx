/* eslint-disable react/no-unescaped-entities */
// @ts-nocheck
'use client';
import React from 'react';
import Link from 'next/link';

// Simple 404 page without any server components or complex imports
export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-medium mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-8">
        We couldn't find the page you were looking for.
      </p>
      <Link href="/" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Go Home
      </Link>
    </div>
  );
}
