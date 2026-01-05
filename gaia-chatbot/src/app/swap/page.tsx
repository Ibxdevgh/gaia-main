'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  ArrowDownUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Settings,
  RefreshCw,
  Info,
  X,
  Zap,
} from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
}

interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: any[];
  priceInfo?: {
    inputPrice: number;
    outputPrice: number;
    rate: number;
  };
  isFallbackQuote?: boolean;
  provider?: 'jupiter' | 'raydium' | 'orca' | 'dexscreener' | 'fallback';
}

const POPULAR_TOKENS: Token[] = [
  { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
  { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png' },
  { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
  { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, logoURI: 'https://static.jup.ag/jup/icon.png' },
  { symbol: 'WIF', name: 'dogwifhat', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6 },
  { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png' },
  { symbol: 'PYTH', name: 'Pyth Network', mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', decimals: 6 },
];

export default function SwapPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const [inputToken, setInputToken] = useState<Token>(POPULAR_TOKENS[0]);
  const [outputToken, setOutputToken] = useState<Token>(POPULAR_TOKENS[1]);
  const [inputAmount, setInputAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInputTokens, setShowInputTokens] = useState(false);
  const [showOutputTokens, setShowOutputTokens] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const inputDropdownRef = useRef<HTMLDivElement>(null);
  const outputDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connected) router.push('/');
  }, [connected, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputDropdownRef.current && !inputDropdownRef.current.contains(event.target as Node)) setShowInputTokens(false);
      if (outputDropdownRef.current && !outputDropdownRef.current.contains(event.target as Node)) setShowOutputTokens(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) { setQuote(null); return; }
      setIsLoading(true);
      setError(null);
      try {
        const amount = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputToken.decimals));
        const response = await fetch(`/api/jupiter/quote?inputMint=${inputToken.mint}&outputMint=${outputToken.mint}&amount=${amount}&slippageBps=${parseFloat(slippage) * 100}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get quote');
        }
        setQuote(data);
        // Clear any previous error if quote succeeded
        setError(null);
      } catch (err: any) {
        console.error('Quote error:', err);
        setError(err.message || 'Failed to get quote. Please try again.');
        setQuote(null);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [inputAmount, inputToken, outputToken, slippage]);

  const handleSwapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount('');
    setQuote(null);
  };

  const formatOutputAmount = () => {
    if (!quote) return '0.00';
    const amount = parseInt(quote.outAmount) / Math.pow(10, outputToken.decimals);
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const calculateRate = () => quote?.priceInfo?.rate?.toFixed(4) || null;

  const getUsdValue = (amount: string, price: number | undefined) => {
    if (!amount || !price) return null;
    return (parseFloat(amount) * price).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const handleSwap = async () => {
    if (!quote || !publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }
    setIsSwapping(true);
    setError(null);
    setSuccess(null);
    try {
      const swapResponse = await fetch('/api/jupiter/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: quote, userPublicKey: publicKey.toString() }),
      });

      const swapData = await swapResponse.json();

      if (!swapResponse.ok) {
        // Handle specific error codes
        if (swapData.code === 'DEX_UNAVAILABLE') {
          throw new Error('DEX APIs are unavailable. Try using a VPN or check your network.');
        }
        throw new Error(swapData.error || 'Failed to build swap transaction');
      }

      const { swapTransaction, provider } = swapData;
      if (!swapTransaction) {
        throw new Error('No transaction received from DEX');
      }

      const { VersionedTransaction } = await import('@solana/web3.js');
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
      const signedTransaction = await signTransaction(transaction);
      const { Connection } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      const providerName = provider === 'raydium' ? 'Raydium' :
                            provider === 'orca' ? 'Orca' :
                            provider === 'dexscreener' ? 'DexScreener' : 'Jupiter';
      setSuccess(`Swap successful via ${providerName}! TX: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      setInputAmount('');
      setQuote(null);
    } catch (err: any) {
      console.error('Swap error:', err);
      setError(err.message || 'Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  if (!connected) return null;

  return (
    <div className="min-h-screen bg-gaia-space flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-purple w-[500px] h-[500px] top-20 -left-40 opacity-40" />
        <div className="orb orb-cyan w-[400px] h-[400px] bottom-20 -right-40 opacity-40" />
        <div className="orb orb-pink w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
      </div>
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative flex justify-between items-center p-4 border-b border-white/5 bg-gaia-space/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/chat')} className="p-2.5 glass rounded-xl hover:bg-white/10 transition-all group">
            <ArrowLeft className="w-5 h-5 text-gaia-paragraph group-hover:text-white transition-colors" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-gaia-purple to-gaia-cyan rounded-xl blur opacity-50" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold gradient-text">GAIA Swap</span>
              <p className="text-xs text-gaia-paragraph">Multi-DEX: Jupiter, Raydium, Orca</p>
            </div>
          </div>
        </div>
        <WalletMultiButton />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan rounded-3xl blur-lg opacity-30" />
            <div className="relative glass rounded-2xl p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold gradient-text">Swap</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setInputAmount(''); setQuote(null); setError(null); setSuccess(null); }} className="p-2.5 glass rounded-xl hover:bg-white/10 transition-all group" title="Reset">
                    <RefreshCw className="w-4 h-4 text-gaia-paragraph group-hover:text-white transition-colors" />
                  </button>
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-gaia-purple/20 text-gaia-purple' : 'glass hover:bg-white/10 text-gaia-paragraph hover:text-white'}`}>
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Settings */}
              {showSettings && (
                <div className="mb-6 p-4 glass-purple rounded-xl animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Slippage Tolerance</span>
                    <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gaia-paragraph" /></button>
                  </div>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0'].map((val) => (
                      <button key={val} onClick={() => setSlippage(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${slippage === val ? 'bg-gradient-to-r from-gaia-purple to-gaia-pink text-white shadow-lg shadow-gaia-purple/30' : 'glass hover:bg-white/10'}`}>
                        {val}%
                      </button>
                    ))}
                    <div className="flex-1 flex items-center gap-1 px-4 py-2 glass rounded-xl">
                      <input type="number" value={slippage} onChange={(e) => setSlippage(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Custom" />
                      <span className="text-xs text-gaia-paragraph">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Token */}
              <div className="glass-purple rounded-xl p-4 mb-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gaia-paragraph">You pay</span>
                  {quote?.priceInfo?.inputPrice && inputAmount && (
                    <span className="text-sm text-gaia-cyan">{getUsdValue(inputAmount, quote.priceInfo.inputPrice)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent text-3xl font-bold outline-none placeholder-gaia-paragraph/30" />
                  <div className="relative" ref={inputDropdownRef}>
                    <button onClick={() => setShowInputTokens(!showInputTokens)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${showInputTokens ? 'bg-gaia-purple/30 ring-2 ring-gaia-purple/50' : 'glass hover:bg-white/10'}`}>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center overflow-hidden">
                        {inputToken.logoURI ? <img src={inputToken.logoURI} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="text-xs font-bold">{inputToken.symbol[0]}</span>}
                      </div>
                      <span className="font-semibold">{inputToken.symbol}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showInputTokens ? 'rotate-180' : ''}`} />
                    </button>
                    {showInputTokens && (
                      <div className="absolute right-0 top-full mt-2 glass rounded-xl p-2 z-50 w-56 dropdown-enter max-h-64 overflow-y-auto">
                        {POPULAR_TOKENS.filter(t => t.mint !== outputToken.mint).map((token) => (
                          <button key={token.mint} onClick={() => { setInputToken(token); setShowInputTokens(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center overflow-hidden">
                              {token.logoURI ? <img src={token.logoURI} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold">{token.symbol[0]}</span>}
                            </div>
                            <div><div className="font-medium">{token.symbol}</div><div className="text-xs text-gaia-paragraph">{token.name}</div></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-3 relative z-10">
                <button onClick={handleSwapTokens} className="p-3 bg-gaia-card border-4 border-gaia-space rounded-xl glass hover:bg-gaia-purple/20 transition-all group">
                  <ArrowDownUp className="w-5 h-5 group-hover:text-gaia-purple group-hover:rotate-180 transition-all duration-300" />
                </button>
              </div>

              {/* Output Token */}
              <div className="glass-purple rounded-xl p-4 mt-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gaia-paragraph">You receive</span>
                  {quote?.priceInfo?.outputPrice && quote.outAmount && (
                    <span className="text-sm text-green-400">{getUsdValue(formatOutputAmount(), quote.priceInfo.outputPrice)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-3xl font-bold">
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-gaia-purple" />
                        <span className="text-gaia-paragraph/50 text-xl">Fetching...</span>
                      </div>
                    ) : (
                      <span className={quote ? 'text-green-400' : 'text-gaia-paragraph/30'}>{formatOutputAmount()}</span>
                    )}
                  </div>
                  <div className="relative" ref={outputDropdownRef}>
                    <button onClick={() => setShowOutputTokens(!showOutputTokens)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${showOutputTokens ? 'bg-gaia-purple/30 ring-2 ring-gaia-purple/50' : 'glass hover:bg-white/10'}`}>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gaia-cyan to-gaia-purple flex items-center justify-center overflow-hidden">
                        {outputToken.logoURI ? <img src={outputToken.logoURI} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="text-xs font-bold">{outputToken.symbol[0]}</span>}
                      </div>
                      <span className="font-semibold">{outputToken.symbol}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showOutputTokens ? 'rotate-180' : ''}`} />
                    </button>
                    {showOutputTokens && (
                      <div className="absolute right-0 top-full mt-2 glass rounded-xl p-2 z-50 w-56 dropdown-enter max-h-64 overflow-y-auto">
                        {POPULAR_TOKENS.filter(t => t.mint !== inputToken.mint).map((token) => (
                          <button key={token.mint} onClick={() => { setOutputToken(token); setShowOutputTokens(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-white/10">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gaia-cyan to-gaia-purple flex items-center justify-center overflow-hidden">
                              {token.logoURI ? <img src={token.logoURI} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold">{token.symbol[0]}</span>}
                            </div>
                            <div><div className="font-medium">{token.symbol}</div><div className="text-xs text-gaia-paragraph">{token.name}</div></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quote Details */}
              {quote && !isLoading && (
                <div className="mt-4 p-4 glass rounded-xl space-y-3 animate-fade-in">
                  {quote.isFallbackQuote && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Price estimate only - DEX APIs unavailable from your network</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gaia-paragraph flex items-center gap-1"><Info className="w-3 h-3" /> Rate</span>
                    <span className="text-sm font-medium">1 {inputToken.symbol} = <span className="text-gaia-cyan">{calculateRate()}</span> {outputToken.symbol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gaia-paragraph">Price Impact</span>
                    <span className={`text-sm font-medium ${quote.priceImpactPct > 1 ? 'text-red-400' : quote.priceImpactPct > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>{quote.priceImpactPct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gaia-paragraph">Provider</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${
                      quote.provider === 'jupiter' ? 'text-gaia-cyan' :
                      quote.provider === 'raydium' ? 'text-gaia-purple' :
                      quote.provider === 'orca' ? 'text-blue-400' :
                      quote.provider === 'dexscreener' ? 'text-green-400' :
                      'text-yellow-400'
                    }`}>
                      <Zap className="w-3 h-3" />
                      {quote.provider === 'jupiter' ? 'Jupiter' :
                       quote.provider === 'raydium' ? 'Raydium' :
                       quote.provider === 'orca' ? 'Orca' :
                       quote.provider === 'dexscreener' ? 'DexScreener' :
                       'Estimated'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gaia-paragraph">Route</span>
                    <span className="text-sm font-medium text-gaia-paragraph">{quote.routePlan?.[0]?.swapInfo?.label || 'Direct'}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div><div className="font-medium text-red-400">Error</div><div className="text-sm text-red-400/80">{error}</div></div>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-3 animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div><div className="font-medium text-green-400">Success!</div><div className="text-sm text-green-400/80">{success}</div></div>
                </div>
              )}

              {/* Swap Button */}
              <button onClick={handleSwap} disabled={!quote || isSwapping || isLoading || !inputAmount || quote?.isFallbackQuote} className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all transform ${quote && !isSwapping && inputAmount && !quote.isFallbackQuote ? 'bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan text-white hover:shadow-lg hover:shadow-gaia-purple/40 hover:scale-[1.02] active:scale-[0.98]' : 'glass text-gaia-paragraph cursor-not-allowed'}`}>
                {isSwapping ? (
                  <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Swapping via {
                    quote?.provider === 'raydium' ? 'Raydium' :
                    quote?.provider === 'orca' ? 'Orca' :
                    quote?.provider === 'dexscreener' ? 'DexScreener' :
                    'Jupiter'
                  }...</div>
                ) : !inputAmount ? 'Enter an amount' : isLoading ? 'Getting best price...' : !quote ? 'Unable to get quote' : quote.isFallbackQuote ? 'DEX unavailable - Try VPN or check network' : `Swap ${inputToken.symbol} for ${outputToken.symbol}`}
              </button>

              <p className="text-center text-xs text-gaia-paragraph/50 mt-4">Best rates from Jupiter, Raydium & Orca DEXs</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
