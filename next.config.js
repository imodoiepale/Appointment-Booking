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
    // Completely bypass error pages during static generation to avoid React error #130
    staticPageGenerationTimeout: 120,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config, { isServer }) => {
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
    async redirects() {
        return [
            // Redirect for error pages to avoid them being pre-rendered
            {
                source: '/404',
                destination: '/_error',
                permanent: false,
            },
            {
                source: '/500',
                destination: '/_error',
                permanent: false,
            },
        ];
    }
}

module.exports = withPWA(nextConfig);
