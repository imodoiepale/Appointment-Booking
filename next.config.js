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
    // Use standalone output for better Vercel compatibility
    output: 'standalone',
    // Skip type checking during build
    typescript: {
        // Ignore TypeScript errors during build
        ignoreBuildErrors: true,
    },
    eslint: {
        // Ignore ESLint errors during build
        ignoreDuringBuilds: true,
    },
    // Add custom webpack configuration
    webpack: (config, { isServer, dev }) => {
        // Fixes npm packages that depend on `fs` module
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false
            };
        }
        
        // Disable dynamic creation of error pages that cause React error #130
        if (isServer) {
            // Mark error pages as external to skip SSR processing
            // This helps avoid the React error #130
            config.externals = [...(config.externals || []), 
                './pages/404',
                './pages/500',
                './pages/_error'
            ];
        }
        
        return config;
    },
    reactStrictMode: false,
    poweredByHeader: false
}

module.exports = withPWA(nextConfig);
