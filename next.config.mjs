/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Newer Next.js versions
    serverExternalPackages: ['@sparticuz/chromium'],
    // Legacy/Experimental key for safety
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium'],
    },
};

export default nextConfig;
