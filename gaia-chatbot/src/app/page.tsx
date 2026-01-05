'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sparkles, Wallet, Shield, Zap, TrendingUp, ArrowRightLeft, Bot, ChevronRight, Star, Globe, Lock } from 'lucide-react';

export default function Home() {
  const { connected } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected) {
      router.push('/chat');
    }
  }, [connected, router]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gaia-space flex flex-col overflow-hidden relative">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-float" />
        <div className="orb orb-cyan w-[500px] h-[500px] top-1/2 -right-40 animate-float" style={{ animationDelay: '-2s' }} />
        <div className="orb orb-pink w-[400px] h-[400px] -bottom-20 left-1/3 animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Grid Background */}
      <div className="fixed inset-0 grid-bg opacity-50 pointer-events-none" />

      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Header */}
      <header className="relative flex justify-between items-center p-6 border-b border-white/5 bg-gaia-space/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">GAIA</h1>
            <p className="text-xs text-gaia-paragraph">Solana AI Assistant</p>
          </div>
        </div>
        <WalletMultiButton />
      </header>

      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 z-10">
        <div className="max-w-5xl text-center space-y-10">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-purple animate-fade-in">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <span className="text-sm font-medium text-white">
              AI-Powered Solana Assistant
            </span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Your Gateway to
            <br />
            <span className="gradient-text">Intelligent Web3</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gaia-paragraph max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Connect your wallet to unlock GAIA - real-time prices, portfolio analytics,
            token comparison tools, and AI-powered market insights.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col items-center gap-8 pt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity animate-glow" />
              <div className="relative">
                <WalletMultiButton />
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gaia-paragraph">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Secure</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gaia-border" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Instant</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gaia-border" />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gaia-cyan" />
                <span>Decentralized</span>
              </div>
            </div>
          </div>

          {/* Live Stats */}
          <div className="flex items-center justify-center gap-12 pt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <StatCard value="Real-time" label="Market Data" icon={<TrendingUp className="w-5 h-5" />} />
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-gaia-purple to-transparent" />
            <StatCard value="Jupiter" label="DEX Aggregator" icon={<ArrowRightLeft className="w-5 h-5" />} />
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-gaia-cyan to-transparent" />
            <StatCard value="GPT-4" label="AI Engine" icon={<Bot className="w-5 h-5" />} />
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <FeatureCard
              icon={<Wallet className="w-7 h-7" />}
              title="Portfolio Tracking"
              description="Real-time token values, PnL tracking, and comprehensive analytics for your entire portfolio"
              gradient="from-purple-500 via-violet-500 to-fuchsia-500"
            />
            <FeatureCard
              icon={<ArrowRightLeft className="w-7 h-7" />}
              title="Token Comparison"
              description="Compare multiple tokens side-by-side with real-time prices, volumes, and market insights"
              gradient="from-cyan-500 via-teal-500 to-emerald-500"
            />
            <FeatureCard
              icon={<TrendingUp className="w-7 h-7" />}
              title="AI Insights"
              description="Get intelligent market analysis, trending tokens, and personalized recommendations"
              gradient="from-orange-500 via-amber-500 to-yellow-500"
            />
          </div>

          {/* How it works */}
          <div className="pt-16 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-3xl font-bold mb-10 gradient-text-glow">How it works</h2>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <Step number="1" text="Connect Wallet" icon={<Wallet className="w-5 h-5" />} />
              <ChevronRight className="w-6 h-6 text-gaia-purple hidden md:block" />
              <Step number="2" text="Ask GAIA" icon={<Bot className="w-5 h-5" />} />
              <ChevronRight className="w-6 h-6 text-gaia-cyan hidden md:block" />
              <Step number="3" text="Get Insights" icon={<Zap className="w-5 h-5" />} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/5 p-6 bg-gaia-space/60 backdrop-blur-xl z-10">
        <div className="flex justify-center items-center text-sm text-gaia-paragraph">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>2025 GAIA. Powered by Solana.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="text-center group">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-gaia-purple group-hover:text-gaia-cyan transition-colors">{icon}</span>
        <span className="text-3xl font-bold gradient-text">{value}</span>
      </div>
      <div className="text-sm text-gaia-paragraph">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="premium-card p-8 rounded-2xl group cursor-pointer">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-glow-purple transition-all duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 group-hover:gradient-text transition-all">{title}</h3>
      <p className="text-gaia-paragraph leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, text, icon }: { number: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="gradient-border group cursor-pointer">
      <div className="flex items-center gap-4 px-6 py-4 bg-gaia-card rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
          {number}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gaia-paragraph group-hover:text-white transition-colors">{icon}</span>
          <span className="font-medium group-hover:text-white transition-colors">{text}</span>
        </div>
      </div>
    </div>
  );
}
