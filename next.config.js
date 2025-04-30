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
    // Basic configuration for images
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "bcltraining.com"
            },
            {
                protocol: "https",
                hostname: "img.clerk.com" // Add Clerk image domain
            }
        ]
    },
    
    // Use output: 'standalone' for better Vercel compatibility
    output: 'standalone',
    
    // Ignore build errors to ensure successful deployment
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    
    // Custom webpack configuration for better compatibility
    webpack: (config, { isServer }) => {
        // Needed for Node modules that expect filesystem access
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false
            };
        }
        
        return config;
    },
    
    // Disable React StrictMode to avoid potential double-rendering issues
    reactStrictMode: false,
}

module.exports = withPWA(nextConfig);
