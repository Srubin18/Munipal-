import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MUNIPAL - Municipal Account Verification',
  description: 'Independent verification for City of Johannesburg municipal accounts. AI-powered analysis against official tariffs, by-laws, and valuation data.',
  metadataBase: new URL('https://munipal.tech'),
  openGraph: {
    title: 'MUNIPAL - Municipal Account Verification',
    description: 'Independent verification for City of Johannesburg municipal accounts against official sources.',
    url: 'https://munipal.tech',
    siteName: 'MUNIPAL',
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MUNIPAL - Municipal Account Verification',
    description: 'Independent verification for City of Johannesburg municipal accounts',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
