import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientWalletProvider } from '@/components/ClientWalletProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GAIA Chat - AI Assistant',
  description: 'Your AI-powered assistant for Solana blockchain',
};

// Script to prevent ethereum wallet extension conflicts
const preventEthereumConflict = `
  (function() {
    if (typeof window !== 'undefined' && !window.ethereum) {
      try {
        Object.defineProperty(window, 'ethereum', {
          value: undefined,
          writable: true,
          configurable: true
        });
      } catch (e) {}
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preventEthereumConflict }} />
      </head>
      <body className={inter.className}>
        <ClientWalletProvider>
          {children}
        </ClientWalletProvider>
      </body>
    </html>
  );
}
