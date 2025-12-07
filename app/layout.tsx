import type { Metadata, Viewport } from 'next';
import { Inter, Lora } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ToastProvider } from './components/Toast';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
});

const nationalPark = localFont({
  src: [
    {
      path: '../public/fonts/national-park/NationalPark-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/national-park/NationalPark-Light.ttf',
      weight: '300',
      style: 'normal',
    },
  ],
  variable: '--font-national-park',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Klara',
  description: 'A warm, AI-powered task companion that helps you stay focused without stress',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Klara',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Klara',
    title: 'Klara',
    description: 'A warm, AI-powered task companion that helps you stay focused without stress',
  },
};

export const viewport: Viewport = {
  themeColor: '#FB923C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // TODO: Remove suppressHydrationWarning after fixing all hydration issues (browser extensions like LanguageTool inject attributes)
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${lora.variable} ${nationalPark.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
