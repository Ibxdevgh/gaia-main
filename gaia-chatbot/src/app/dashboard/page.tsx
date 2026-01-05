'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Wallet,
  Image as ImageIcon,
  TrendingUp,
  Bell,
  PieChart,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

interface AnalyticsData {
  portfolio: {
    totalValue: number;
    solBalance: number;
    solValue: number;
    solPercentage: number;
    tokenCount: number;
  };
  allocation: {
    sol: { value: number; percentage: number };
    tokens: any[];
  };
  market: {
    solPrice: number;
    priceChange24h: number;
  };
  activity: {
    recentTransactions: number;
    last24hTransactions: number;
  };
  insights: string[];
}

interface NFT {
  mint: string;
  name: string;
  image: string;
  collection: string;
}

interface DeFiPosition {
  type: string;
  protocol: string;
  token: { symbol: string; name: string };
  balance: number;
  usdValue: number;
  apy: number;
}

interface Alert {
  id: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currentPrice?: number;
  triggered: boolean;
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'defi' | 'alerts'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [defiPositions, setDefiPositions] = useState<DeFiPosition[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ tokenSymbol: 'SOL', targetPrice: '', condition: 'above' as const });

  useEffect(() => {
    if (!connected) router.push('/');
  }, [connected, router]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchData();
    }
  }, [connected, publicKey]);

  const fetchData = async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      const [analyticsRes, nftsRes, defiRes, alertsRes] = await Promise.all([
        fetch(`/api/analytics?address=${publicKey.toString()}`),
        fetch(`/api/nfts?address=${publicKey.toString()}`),
        fetch(`/api/defi/positions?address=${publicKey.toString()}`),
        fetch(`/api/alerts?wallet=${publicKey.toString()}`),
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (nftsRes.ok) {
        const data = await nftsRes.json();
        setNfts(data.nfts || []);
      }

      if (defiRes.ok) {
        const data = await defiRes.json();
        setDefiPositions(data.positions || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAlert = async () => {
    if (!publicKey || !newAlert.targetPrice) return;

    const tokenMints: Record<string, string> = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    };

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          tokenMint: tokenMints[newAlert.tokenSymbol] || tokenMints['SOL'],
          tokenSymbol: newAlert.tokenSymbol,
          targetPrice: newAlert.targetPrice,
          condition: newAlert.condition,
        }),
      });

      if (res.ok) {
        setShowAlertModal(false);
        setNewAlert({ tokenSymbol: 'SOL', targetPrice: '', condition: 'above' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!publicKey) return;

    try {
      await fetch(`/api/alerts?wallet=${publicKey.toString()}&id=${alertId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  if (!connected) return null;

  return (
    <div className="min-h-screen bg-gaia-space flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-purple w-[500px] h-[500px] top-20 -left-40 opacity-30" />
        <div className="orb orb-cyan w-[400px] h-[400px] bottom-20 -right-40 opacity-30" />
      </div>
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative flex justify-between items-center p-4 border-b border-white/5 bg-gaia-space/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gaia-purple to-gaia-cyan rounded-xl hover:opacity-90 transition-all group shadow-lg shadow-gaia-purple/25">
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="text-sm font-semibold text-white">Chat</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-gaia-purple to-gaia-cyan rounded-xl blur opacity-50" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold gradient-text">Dashboard</span>
              <p className="text-xs text-gaia-paragraph">Analytics & Insights</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={isLoading} className="p-2.5 glass rounded-xl hover:bg-white/10 transition-all">
            <RefreshCw className={`w-5 h-5 text-gaia-paragraph ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <WalletMultiButton />
        </div>
      </header>

      {/* Tabs */}
      <div className="relative border-b border-white/5 bg-gaia-space/60 backdrop-blur-xl">
        <div className="flex gap-1 p-2 max-w-4xl mx-auto">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'nfts', label: 'NFTs', icon: ImageIcon },
            { id: 'defi', label: 'DeFi', icon: TrendingUp },
            { id: 'alerts', label: 'Alerts', icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-gaia-purple to-gaia-cyan text-white'
                  : 'glass text-gaia-paragraph hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 relative">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gaia-purple" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && analytics && (
                <div className="space-y-6 animate-fade-in">
                  {/* Portfolio Value */}
                  <div className="glass-purple rounded-2xl p-6">
                    <h2 className="text-sm text-gaia-paragraph mb-2">Total Portfolio Value</h2>
                    <div className="text-4xl font-bold gradient-text">
                      ${analytics.portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gaia-purple" />
                        <span className="text-sm text-gaia-paragraph">
                          SOL: {analytics.portfolio.solBalance.toFixed(4)} (${analytics.portfolio.solValue.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gaia-cyan" />
                        <span className="text-sm text-gaia-paragraph">
                          {analytics.portfolio.tokenCount} tokens
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Market & Activity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Market</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gaia-paragraph">SOL Price</span>
                          <span className="font-medium">${analytics.market.solPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gaia-paragraph">24h Change</span>
                          <span className={`font-medium ${analytics.market.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {analytics.market.priceChange24h >= 0 ? '+' : ''}{analytics.market.priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Activity</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gaia-paragraph">Recent Transactions</span>
                          <span className="font-medium">{analytics.activity.recentTransactions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gaia-paragraph">Last 24h</span>
                          <span className="font-medium">{analytics.activity.last24hTransactions}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Insights */}
                  {analytics.insights.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Insights</h3>
                      <div className="space-y-3">
                        {analytics.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 glass-purple rounded-xl">
                            <span className="text-sm">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Holdings */}
                  {analytics.allocation.tokens.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Top Holdings</h3>
                      <div className="space-y-2">
                        {analytics.allocation.tokens.slice(0, 5).map((token, i) => (
                          <div key={i} className="flex items-center justify-between p-3 glass rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </div>
                              <span className="font-medium">{token.mint.slice(0, 8)}...</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${token.value.toFixed(2)}</div>
                              <div className="text-xs text-gaia-paragraph">{token.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NFTs Tab */}
              {activeTab === 'nfts' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your NFTs</h2>
                    <span className="text-gaia-paragraph">{nfts.length} NFTs</span>
                  </div>

                  {nfts.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                      <ImageIcon className="w-16 h-16 text-gaia-paragraph mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
                      <p className="text-gaia-paragraph">You don't have any NFTs in this wallet yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {nfts.map((nft, i) => (
                        <div key={i} className="glass rounded-2xl overflow-hidden group hover:scale-105 transition-transform">
                          <div className="aspect-square bg-gaia-card">
                            {nft.image ? (
                              <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-12 h-12 text-gaia-paragraph" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-medium truncate">{nft.name}</h3>
                            <p className="text-xs text-gaia-paragraph truncate">{nft.collection}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DeFi Tab */}
              {activeTab === 'defi' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">DeFi Positions</h2>
                    <span className="text-gaia-paragraph">{defiPositions.length} positions</span>
                  </div>

                  {defiPositions.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                      <TrendingUp className="w-16 h-16 text-gaia-paragraph mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No DeFi Positions</h3>
                      <p className="text-gaia-paragraph">You don't have any staking or liquidity positions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {defiPositions.map((position, i) => (
                        <div key={i} className="glass rounded-2xl p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 text-xs font-medium bg-gaia-purple/20 text-gaia-purple rounded-lg">
                                  {position.type === 'liquid_staking' ? 'Liquid Staking' : 'Native Staking'}
                                </span>
                                <span className="text-sm text-gaia-paragraph">{position.protocol}</span>
                              </div>
                              <h3 className="text-xl font-bold">{position.token.symbol}</h3>
                              <p className="text-sm text-gaia-paragraph">{position.balance.toFixed(4)} tokens</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold gradient-text">
                                ${position.usdValue.toFixed(2)}
                              </div>
                              <div className="text-sm text-green-400">{position.apy}% APY</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Price Alerts</h2>
                    <button
                      onClick={() => setShowAlertModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gaia-purple to-gaia-cyan text-white rounded-xl font-medium hover:shadow-lg hover:shadow-gaia-purple/30 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      New Alert
                    </button>
                  </div>

                  {alerts.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                      <Bell className="w-16 h-16 text-gaia-paragraph mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Alerts Set</h3>
                      <p className="text-gaia-paragraph">Create price alerts to get notified when tokens hit your target.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <div key={alert.id} className={`glass rounded-2xl p-6 ${alert.triggered ? 'border border-green-500/50' : ''}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
                                <span className="font-bold">{alert.tokenSymbol}</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {alert.tokenSymbol} {alert.condition === 'above' ? '↑' : '↓'} ${alert.targetPrice}
                                </h3>
                                <p className="text-sm text-gaia-paragraph">
                                  Current: ${alert.currentPrice?.toFixed(4) || 'Loading...'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {alert.triggered && (
                                <span className="px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                                  Triggered!
                                </span>
                              )}
                              <button
                                onClick={() => deleteAlert(alert.id)}
                                className="p-2 glass rounded-lg hover:bg-red-500/20 transition-all group"
                              >
                                <Trash2 className="w-4 h-4 text-gaia-paragraph group-hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create Price Alert</h2>
              <button onClick={() => setShowAlertModal(false)} className="p-2 glass rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gaia-paragraph mb-2">Token</label>
                <select
                  value={newAlert.tokenSymbol}
                  onChange={(e) => setNewAlert({ ...newAlert, tokenSymbol: e.target.value })}
                  className="w-full px-4 py-3 glass rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-gaia-purple"
                >
                  <option value="SOL">SOL</option>
                  <option value="BONK">BONK</option>
                  <option value="JUP">JUP</option>
                  <option value="WIF">WIF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gaia-paragraph mb-2">Condition</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewAlert({ ...newAlert, condition: 'above' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      newAlert.condition === 'above'
                        ? 'bg-gradient-to-r from-gaia-purple to-gaia-cyan text-white'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    Price Above
                  </button>
                  <button
                    onClick={() => setNewAlert({ ...newAlert, condition: 'below' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      newAlert.condition === 'below'
                        ? 'bg-gradient-to-r from-gaia-purple to-gaia-cyan text-white'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    Price Below
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gaia-paragraph mb-2">Target Price ($)</label>
                <input
                  type="number"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 glass rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-gaia-purple"
                />
              </div>

              <button
                onClick={createAlert}
                disabled={!newAlert.targetPrice}
                className="w-full py-4 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-gaia-purple/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
