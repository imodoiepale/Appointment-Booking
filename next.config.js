/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "bcltraining.com"
            }
        ]
    }
}

module.exports = nextConfig
