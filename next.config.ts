import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  /* Silence Turbopack warning when using PWA webpack config */
  turbopack: {},
  /* Allow local network devices (e.g. phone) to access dev server */
  allowedDevOrigins: ['192.168.1.*'],
};

export default withPWA(nextConfig);
