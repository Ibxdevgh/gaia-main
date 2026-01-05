'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Wallet,
  Activity,
  BarChart3,
  Gift,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  LineChart,
} from 'lucide-react';

type Tab = 'wallets' | 'whales' | 'compare' | 'airdrops' | 'charts';

// Helper function to format numbers
function formatNumber(num: number): string {
  if (!num || num === 0) return '$0';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Helper function to format price
function formatPrice(price: number): string {
  if (!price || price === 0) return '$0';
  if (price >= 1000) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(10)}`;
}

interface WatchedWallet {
  address: string;
  label: string;
  solBalance?: number;
  usdValue?: number;
}

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('wallets');
  const [loading, setLoading] = useState(false);

  // Wallet Manager State
  const [watchedWallets, setWatchedWallets] = useState<WatchedWallet[]>([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');

  // Whale Tracker State
  const [whaleData, setWhaleData] = useState<any>(null);
  const [whaleToken, setWhaleToken] = useState('SOL');

  // Token Compare State
  const [compareTokens, setCompareTokens] = useState('SOL,JUP,BONK');
  const [compareData, setCompareData] = useState<any>(null);

  // Airdrop State
  const [airdropAddress, setAirdropAddress] = useState('');
  const [airdropData, setAirdropData] = useState<any>(null);

  // Price Charts State
  const [chartToken, setChartToken] = useState('SOL');
  const [chartInterval, setChartInterval] = useState('24h');
  const [chartData, setChartData] = useState<any>(null);

  // Mock user wallet for demo
  const userWallet = 'demo-user-wallet';

  // Fetch watched wallets
  const fetchWatchedWallets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallets?user=${userWallet}&balances=true`);
      if (res.ok) {
        const data = await res.json();
        setWatchedWallets(data.wallets || []);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
    setLoading(false);
  };

  // Add wallet
  const addWallet = async () => {
    if (!newWalletAddress) return;
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet,
          watchAddress: newWalletAddress,
          label: newWalletLabel || undefined,
        }),
      });
      if (res.ok) {
        setNewWalletAddress('');
        setNewWalletLabel('');
        fetchWatchedWallets();
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
    }
  };

  // Remove wallet
  const removeWallet = async (address: string) => {
    try {
      await fetch(`/api/wallets?user=${userWallet}&address=${address}`, {
        method: 'DELETE',
      });
      fetchWatchedWallets();
    } catch (error) {
      console.error('Error removing wallet:', error);
    }
  };

  // Fetch whale data
  const fetchWhaleData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whales?token=${whaleToken}`);
      if (res.ok) {
        const data = await res.json();
        setWhaleData(data);
      }
    } catch (error) {
      console.error('Error fetching whale data:', error);
    }
    setLoading(false);
  };

  // Fetch compare data
  const fetchCompareData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare?tokens=${compareTokens}`);
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      }
    } catch (error) {
      console.error('Error fetching compare data:', error);
    }
    setLoading(false);
  };

  // Fetch airdrop data
  const fetchAirdropData = async () => {
    if (!airdropAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/airdrops?address=${airdropAddress}`);
      if (res.ok) {
        const data = await res.json();
        setAirdropData(data);
      }
    } catch (error) {
      console.error('Error fetching airdrop data:', error);
    }
    setLoading(false);
  };

  // Fetch chart data
  const fetchChartData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices/history?token=${chartToken}&interval=${chartInterval}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    if (activeTab === 'wallets') fetchWatchedWallets();
    if (activeTab === 'whales') fetchWhaleData();
    if (activeTab === 'compare') fetchCompareData();
    if (activeTab === 'charts') fetchChartData();
  }, [activeTab]);

  const tabs = [
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'whales', label: 'Whales', icon: Activity },
    { id: 'compare', label: 'Compare', icon: BarChart3 },
    { id: 'airdrops', label: 'Airdrops', icon: Gift },
    { id: 'charts', label: 'Charts', icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
              >
                <MessageSquare className="w-5 h-5 text-white" />
                <span className="text-sm font-semibold text-white">Chat</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  GAIA Tools
                </h1>
                <p className="text-xs text-gray-400">Advanced Solana Analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Wallet Manager Tab */}
        {activeTab === 'wallets' && (
          <div className="space-y-6">
            {/* Add Wallet Form */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4">Add Wallet to Watch</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Solana wallet address"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  className="sm:w-40 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={addWallet}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Watched Wallets List */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Watched Wallets</h3>
                <button
                  onClick={fetchWatchedWallets}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {watchedWallets.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No wallets being watched. Add one above to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {watchedWallets.map((wallet) => (
                    <div
                      key={wallet.address}
                      className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5"
                    >
                      <div>
                        <p className="font-medium">{wallet.label}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{wallet.solBalance?.toFixed(4) || '0'} SOL</p>
                          <p className="text-xs text-gray-400">
                            ${wallet.usdValue?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <button
                          onClick={() => removeWallet(wallet.address)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Whale Tracker Tab */}
        {activeTab === 'whales' && (
          <div className="space-y-6">
            {/* Token Search */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Token symbol (e.g., SOL, BONK)"
                  value={whaleToken}
                  onChange={(e) => setWhaleToken(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={fetchWhaleData}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Track
                </button>
              </div>
            </div>

            {whaleData && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Whale Signals</p>
                    <p className="text-2xl font-bold">{whaleData.summary?.totalWhaleSignals || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Strong Signals</p>
                    <p className="text-2xl font-bold text-green-400">{whaleData.summary?.strongSignals || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Active Tokens</p>
                    <p className="text-2xl font-bold text-blue-400">{whaleData.summary?.tokensWithWhaleActivity || 0}</p>
                  </div>
                </div>

                {/* Whale Activity */}
                {whaleData.whaleActivity?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Whale Activity Detected</h3>
                    <div className="space-y-3">
                      {whaleData.whaleActivity.map((activity: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              activity.signal === 'STRONG' ? 'bg-red-500/20' :
                              activity.signal === 'MODERATE' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                            }`}>
                              <Zap className={`w-4 h-4 ${
                                activity.signal === 'STRONG' ? 'text-red-400' :
                                activity.signal === 'MODERATE' ? 'text-yellow-400' : 'text-blue-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{activity.pair}</p>
                              <p className="text-xs text-gray-400">{activity.type} on {activity.dex}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(activity.avgTransactionSize / 1000).toFixed(1)}K avg</p>
                            <p className={`text-xs ${activity.priceChange1h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {activity.priceChange1h >= 0 ? '+' : ''}{activity.priceChange1h?.toFixed(2)}% 1h
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Whale Tokens */}
                {whaleData.recentWhaleTokens?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Tokens with Whale Activity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {whaleData.recentWhaleTokens.map((token: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-black/20 rounded-lg border border-white/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{token.token}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              token.buyPressure === 'BUYING' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {token.buyPressure}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">${parseFloat(token.price).toFixed(6)}</span>
                            <span className={token.priceChange1h >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {token.priceChange1h >= 0 ? '+' : ''}{token.priceChange1h?.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Token Compare Tab */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            {/* Token Input */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter tokens (comma-separated, max 5)"
                  value={compareTokens}
                  onChange={(e) => setCompareTokens(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={fetchCompareData}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Compare
                </button>
              </div>
            </div>

            {compareData && (
              <>
                {/* Comparison Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Best Performer</p>
                    <p className="text-lg font-bold text-green-400">{compareData.comparison?.bestPerformer}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Worst Performer</p>
                    <p className="text-lg font-bold text-red-400">{compareData.comparison?.worstPerformer}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Most Traded</p>
                    <p className="text-lg font-bold text-blue-400">{compareData.comparison?.mostTraded}</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Most Liquid</p>
                    <p className="text-lg font-bold text-purple-400">{compareData.comparison?.mostLiquid}</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">Largest MCap</p>
                    <p className="text-lg font-bold text-yellow-400">{compareData.comparison?.largestMarketCap}</p>
                  </div>
                </div>

                {/* Token Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compareData.tokens?.map((token: any, i: number) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold">{token.symbol}</h4>
                        <span className={`text-sm px-2 py-1 rounded ${
                          token.priceChange24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h?.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{token.name} {token.source && `• via ${token.source}`}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price</span>
                          <span>{formatPrice(token.price)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Volume 24h</span>
                          <span>{formatNumber(token.volume24h)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Liquidity</span>
                          <span>{formatNumber(token.liquidity)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Market Cap</span>
                          <span>{formatNumber(token.marketCap)}</span>
                        </div>
                        {token.rank && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Rank</span>
                            <span className="text-purple-400">#{token.rank}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insights */}
                {compareData.insights?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Insights</h3>
                    <div className="space-y-2">
                      {compareData.insights.map((insight: string, i: number) => (
                        <p key={i} className="text-sm text-gray-300">{insight}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Airdrop Checker Tab */}
        {activeTab === 'airdrops' && (
          <div className="space-y-6">
            {/* Address Input */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter your Solana wallet address"
                  value={airdropAddress}
                  onChange={(e) => setAirdropAddress(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={fetchAirdropData}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Check
                </button>
              </div>
            </div>

            {airdropData && (
              <>
                {/* Airdrop Score */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Airdrop Score</p>
                      <p className="text-4xl font-bold">{airdropData.airdropScore?.score || 0}/100</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-lg font-bold ${
                      airdropData.airdropScore?.tier === 'Diamond' ? 'bg-cyan-500/20 text-cyan-400' :
                      airdropData.airdropScore?.tier === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                      airdropData.airdropScore?.tier === 'Silver' ? 'bg-gray-400/20 text-gray-300' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {airdropData.airdropScore?.tier}
                    </div>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${airdropData.airdropScore?.score || 0}%` }}
                    />
                  </div>
                </div>

                {/* Wallet Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-400">Wallet Age</p>
                    <p className="text-xl font-bold">{airdropData.wallet?.age || 0} days</p>
                    <p className="text-xs text-purple-400">{airdropData.wallet?.ageLabel}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-400">SOL Balance</p>
                    <p className="text-xl font-bold">{airdropData.wallet?.solBalance?.toFixed(2) || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-400">Transactions</p>
                    <p className="text-xl font-bold">{airdropData.wallet?.transactionCount || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-400">Token Holdings</p>
                    <p className="text-xl font-bold">{airdropData.wallet?.tokenCount || 0}</p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Score Breakdown</h3>
                  <div className="space-y-2">
                    {airdropData.airdropScore?.breakdown?.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Airdrops */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Active */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3 text-green-400">Active Airdrops</h3>
                    {airdropData.airdrops?.active?.map((airdrop: any, i: number) => (
                      <div key={i} className="mb-3 p-3 bg-black/20 rounded-lg">
                        <p className="font-medium">{airdrop.name} ({airdrop.symbol})</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {airdrop.criteria?.join(' • ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Upcoming */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3 text-blue-400">Upcoming</h3>
                    {airdropData.airdrops?.upcoming?.map((airdrop: any, i: number) => (
                      <div key={i} className="mb-3 p-3 bg-black/20 rounded-lg">
                        <p className="font-medium">{airdrop.name} ({airdrop.symbol})</p>
                        <div className="text-xs text-gray-400 mt-1">
                          {airdrop.criteria?.join(' • ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Completed */}
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-400">Completed</h3>
                    {airdropData.airdrops?.completed?.map((airdrop: any, i: number) => (
                      <div key={i} className="mb-3 p-3 bg-black/20 rounded-lg">
                        <p className="font-medium">{airdrop.name} ({airdrop.symbol})</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {airdropData.recommendations?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      {airdropData.recommendations.map((rec: string, i: number) => (
                        <p key={i} className="text-sm">{rec}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Price Charts Tab */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Chart Controls */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Token symbol (e.g., SOL, JUP)"
                  value={chartToken}
                  onChange={(e) => setChartToken(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                />
                <div className="flex gap-2">
                  {['1h', '24h', '7d', '30d'].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setChartInterval(interval)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        chartInterval === interval
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {interval}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchChartData}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <LineChart className="w-4 h-4" />
                  Load
                </button>
              </div>
            </div>

            {chartData && (
              <>
                {/* Price Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Current Price</p>
                    <p className="text-2xl font-bold">
                      ${chartData.currentPrice?.toFixed(chartData.currentPrice < 0.01 ? 8 : 4)}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Change</p>
                    <p className={`text-2xl font-bold ${chartData.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {chartData.priceChange >= 0 ? '+' : ''}{chartData.priceChange?.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-gray-400">High</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${chartData.high?.toFixed(chartData.high < 0.01 ? 8 : 4)}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Low</p>
                    <p className="text-2xl font-bold text-red-400">
                      ${chartData.low?.toFixed(chartData.low < 0.01 ? 8 : 4)}
                    </p>
                  </div>
                </div>

                {/* Simple Price Chart */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {chartData.token?.symbol} Price Chart ({chartInterval})
                  </h3>
                  <div className="h-64 relative">
                    {chartData.priceHistory && chartData.priceHistory.length > 0 && (
                      <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 50, 100, 150, 200].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="800"
                            y2={y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                          />
                        ))}

                        {/* Price line */}
                        <polyline
                          fill="none"
                          stroke="url(#priceGradient)"
                          strokeWidth="2"
                          points={chartData.priceHistory.map((p: any, i: number) => {
                            const x = (i / (chartData.priceHistory.length - 1)) * 800;
                            const minPrice = chartData.low;
                            const maxPrice = chartData.high;
                            const range = maxPrice - minPrice || 1;
                            const y = 200 - ((p.price - minPrice) / range) * 180 - 10;
                            return `${x},${y}`;
                          }).join(' ')}
                        />

                        {/* Area fill */}
                        <polygon
                          fill="url(#areaGradient)"
                          points={`0,200 ${chartData.priceHistory.map((p: any, i: number) => {
                            const x = (i / (chartData.priceHistory.length - 1)) * 800;
                            const minPrice = chartData.low;
                            const maxPrice = chartData.high;
                            const range = maxPrice - minPrice || 1;
                            const y = 200 - ((p.price - minPrice) / range) * 180 - 10;
                            return `${x},${y}`;
                          }).join(' ')} 800,200`}
                        />

                        <defs>
                          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                            <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Technical Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Technical Indicators</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Trend</span>
                        <span className={`font-medium ${
                          chartData.trend?.includes('UP') ? 'text-green-400' :
                          chartData.trend?.includes('DOWN') ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {chartData.trend?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volatility</span>
                        <span className="font-medium">{chartData.volatility?.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">20-period MA</span>
                        <span className="font-medium">
                          ${chartData.technicals?.movingAverage?.toFixed(chartData.technicals?.movingAverage < 0.01 ? 8 : 4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Support & Resistance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Resistance</span>
                        <span className="font-medium text-red-400">
                          ${chartData.technicals?.resistance?.toFixed(chartData.technicals?.resistance < 0.01 ? 8 : 4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Support</span>
                        <span className="font-medium text-green-400">
                          ${chartData.technicals?.support?.toFixed(chartData.technicals?.support < 0.01 ? 8 : 4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Data Points</span>
                        <span className="font-medium">{chartData.dataPoints}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
