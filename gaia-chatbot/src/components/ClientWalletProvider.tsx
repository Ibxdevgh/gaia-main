'use client';

import dynamic from 'next/dynamic';
import { ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const WalletContextProvider = dynamic(
  () => import('./WalletProvider').then((mod) => mod.WalletContextProvider),
  { ssr: false, loading: () => <LoadingScreen /> }
);

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0c0a1b] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#7672ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#a7a8cf]">Loading GAIA...</p>
      </div>
    </div>
  );
}

export function ClientWalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Suppress ethereum extension errors
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.toString?.().includes('ethereum') ||
        args[0]?.toString?.().includes('redefine property')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    setMounted(true);

    return () => {
      console.error = originalError;
    };
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <WalletContextProvider>{children}</WalletContextProvider>
    </ErrorBoundary>
  );
}
