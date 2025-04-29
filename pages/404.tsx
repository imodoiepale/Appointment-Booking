/* eslint-disable react/no-unescaped-entities */
// @ts-nocheck
// Static error page with no SSR
import React from 'react';
import Link from 'next/link';
import { GetStaticProps } from 'next';

function Custom404() {
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

// This ensures the page is built as a static HTML page
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {}
  };
};

// This disables automatic static optimization
Custom404.noSSR = true;

export default Custom404;
