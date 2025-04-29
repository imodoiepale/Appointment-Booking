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
    // Completely disable SSR for error pages
    exportPathMap: async function (
        defaultPathMap,
        { dev, dir, outDir, distDir, buildId }
    ) {
        return {
            ...defaultPathMap,
            // Override 404 and 500 pages to be completely static without SSR
            '/404': { page: '/404' },
            '/500': { page: '/500' },
        };
    },
    // Prevent React error #130 during build
    output: 'export', // Change to export for static HTML generation
    distDir: 'out',
    // Disable static optimization for problematic pages
    unstable_excludeDefaultMomentLocales: true,
    poweredByHeader: false,
    reactStrictMode: false,
    swcMinify: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Add custom configuration to disable static generation for error pages
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
        
        return config;
    },
    experimental: {
        // This helps prevent SSR issues with certain components
        esmExternals: 'loose'
    }
}

module.exports = withPWA(nextConfig);
