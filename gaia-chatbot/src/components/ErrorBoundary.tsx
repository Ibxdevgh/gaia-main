'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Filter out wallet extension errors
    if (
      error.message.includes('ethereum') ||
      error.message.includes('redefine property')
    ) {
      console.warn('Wallet extension conflict suppressed:', error.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log non-wallet errors
    if (
      !error.message.includes('ethereum') &&
      !error.message.includes('redefine property')
    ) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gaia-space flex items-center justify-center p-4">
          <div className="bg-gaia-card border border-gaia-border rounded-2xl p-8 max-w-md text-center">
            <h2 className="text-xl font-bold text-gaia-off-white mb-4">
              Something went wrong
            </h2>
            <p className="text-gaia-paragraph mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gaia-purple text-white rounded-lg hover:bg-gaia-purple/80 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
