// @ts-nocheck
'use client';

import React from 'react';
import { Inter } from 'next/font/google';

// Using Inter for a clean, modern look like in the reference design
const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

interface ErrorLayoutProps {
  children: React.ReactNode;
}

export default function ErrorLayout({ children }: ErrorLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-100`}>
        <div className="flex min-h-screen flex-col items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  );
}
