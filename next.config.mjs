/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['@sparticuz/chromium-min'],
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium-min'],
    },
};

export default nextConfig;
