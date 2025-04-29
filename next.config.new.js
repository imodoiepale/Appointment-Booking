/** @type {import('next').NextConfig} */

const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true, 
    reloadOnOnline: true,
    swcMinify: true,
    disable: false,
    workboxOptions: {
        disableDevLogs: true,
    }
});

const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "bcltraining.com"
            }
        ]
    },
    // Add this section to handle page-level configurations
    reactStrictMode: false, // This can help prevent some React errors
    typescript: {
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    // Add special handling for error pages
    experimental: {
        // This helps prevent SSR issues with certain components
        esmExternals: 'loose'
    }
}

module.exports = withPWA(nextConfig);
