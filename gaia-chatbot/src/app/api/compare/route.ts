import { NextRequest, NextResponse } from 'next/server';

// Known token mappings for CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  'SOL': 'solana',
  'JUP': 'jupiter-exchange-solana',
  'BONK': 'bonk',
  'WIF': 'dogwifcoin',
  'PYTH': 'pyth-network',
  'JTO': 'jito-governance-token',
  'RNDR': 'render-token',
  'RAY': 'raydium',
  'ORCA': 'orca',
  'HNT': 'helium',
  'MOBILE': 'helium-mobile',
  'SAMO': 'samoyedcoin',
  'FIDA': 'bonfida',
  'MNGO': 'mango-markets',
  'PEPE': 'pepe',
  'SHIB': 'shiba-inu',
  'DOGE': 'dogecoin',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'UNI': 'uniswap',
  'AAVE': 'aave',
};

// Non-Solana tokens - should ONLY use CoinGecko, never fall back to DexScreener
const NON_SOLANA_TOKENS = new Set([
  'PEPE', 'SHIB', 'DOGE', 'BTC', 'ETH', 'XRP', 'ADA', 'AVAX', 'LINK', 'MATIC', 'UNI', 'AAVE'
]);

// Simple delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Token Comparison API - Compare multiple tokens side by side
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokensParam = searchParams.get('tokens');

    if (!tokensParam) {
      return NextResponse.json(
        { error: 'tokens parameter is required (comma-separated symbols or addresses)' },
        { status: 400 }
      );
    }

    const tokens = tokensParam.split(',').slice(0, 5); // Max 5 tokens
    console.log('Comparing tokens:', tokens);

    // Fetch tokens sequentially with delay to avoid rate limits
    const tokenData: any[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const trimmed = tokens[i].trim().toUpperCase();
      try {
        // Add delay between requests to avoid CoinGecko rate limit
        if (i > 0) await delay(300);

        const data = await fetchTokenData(trimmed);
        console.log(`Token ${trimmed}:`, data ? `found (${data.source})` : 'not found');
        if (data) tokenData.push(data);
      } catch (err) {
        console.error(`Error fetching ${trimmed}:`, err);
      }
    }

    console.log('Valid tokens found:', tokenData.length);

    if (tokenData.length === 0) {
      return NextResponse.json(
        { error: 'No valid tokens found. CoinGecko may be rate limited. Try again in a minute.' },
        { status: 404 }
      );
    }

    // Calculate comparison metrics
    const comparison = {
      highest24hGain: tokenData.reduce((max, t) =>
        (t.priceChange24h > (max?.priceChange24h || -Infinity)) ? t : max, tokenData[0]),
      highest24hLoss: tokenData.reduce((min, t) =>
        (t.priceChange24h < (min?.priceChange24h || Infinity)) ? t : min, tokenData[0]),
      highestVolume: tokenData.reduce((max, t) =>
        (t.volume24h > (max?.volume24h || 0)) ? t : max, tokenData[0]),
      highestLiquidity: tokenData.reduce((max, t) =>
        (t.liquidity > (max?.liquidity || 0)) ? t : max, tokenData[0]),
      highestMarketCap: tokenData.reduce((max, t) =>
        (t.marketCap > (max?.marketCap || 0)) ? t : max, tokenData[0]),
    };

    // Generate insights
    const insights: string[] = [];

    if (comparison.highest24hGain && comparison.highest24hGain.priceChange24h > 5) {
      insights.push(`${comparison.highest24hGain.symbol} is leading with +${comparison.highest24hGain.priceChange24h.toFixed(2)}% gain`);
    }

    if (comparison.highest24hLoss && comparison.highest24hLoss.priceChange24h < -5) {
      insights.push(`${comparison.highest24hLoss.symbol} dropped ${comparison.highest24hLoss.priceChange24h.toFixed(2)}%`);
    }

    const avgVolume = tokenData.reduce((sum, t) => sum + t.volume24h, 0) / tokenData.length;
    if (comparison.highestVolume && comparison.highestVolume.volume24h > avgVolume * 1.5) {
      insights.push(`${comparison.highestVolume.symbol} has highest trading volume (${formatNumber(comparison.highestVolume.volume24h)})`);
    }

    // Risk assessment
    tokenData.forEach(token => {
      if (token.liquidity > 0 && token.liquidity < 100000) {
        insights.push(`${token.symbol} has lower liquidity (${formatNumber(token.liquidity)}) - higher slippage risk`);
      }
    });

    return NextResponse.json({
      tokens: tokenData,
      comparison: {
        bestPerformer: comparison.highest24hGain?.symbol || 'N/A',
        worstPerformer: comparison.highest24hLoss?.symbol || 'N/A',
        mostTraded: comparison.highestVolume?.symbol || 'N/A',
        mostLiquid: comparison.highestLiquidity?.symbol || 'N/A',
        largestMarketCap: comparison.highestMarketCap?.symbol || 'N/A',
      },
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Compare API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare tokens' },
      { status: 500 }
    );
  }
}

async function fetchTokenData(tokenQuery: string): Promise<any | null> {
  const upperToken = tokenQuery.toUpperCase();
  const isNonSolana = NON_SOLANA_TOKENS.has(upperToken);
  const coinGeckoId = COINGECKO_IDS[upperToken];

  // 1. Try CoinGecko first for known tokens
  if (coinGeckoId) {
    try {
      const data = await fetchFromCoinGecko(coinGeckoId, upperToken);
      if (data) return data;
    } catch (err) {
      console.error(`CoinGecko error for ${upperToken}:`, err);
    }
  }

  // For non-Solana tokens, don't fall back to DexScreener
  if (isNonSolana) {
    console.log(`${upperToken}: CoinGecko failed, no fallback for non-Solana tokens`);
    return null;
  }

  // 2. Fallback to DexScreener for Solana tokens only
  try {
    const data = await fetchFromDexScreener(tokenQuery);
    if (data) return data;
  } catch (err) {
    console.error(`DexScreener error for ${tokenQuery}:`, err);
  }

  return null;
}

async function fetchFromCoinGecko(coinId: string, symbol: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (res.status === 429) {
      console.log(`CoinGecko rate limited for ${coinId}, waiting...`);
      await delay(2000); // Wait 2 seconds
      // Retry once
      const retryRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
        { cache: 'no-store', headers: { 'Accept': 'application/json' } }
      );
      if (!retryRes.ok) {
        console.log(`CoinGecko retry failed for ${coinId}: ${retryRes.status}`);
        return null;
      }
      const data = await retryRes.json();
      return parseCoinGeckoData(data, symbol);
    }

    if (!res.ok) {
      console.log(`CoinGecko returned ${res.status} for ${coinId}`);
      return null;
    }

    const data = await res.json();
    return parseCoinGeckoData(data, symbol);
  } catch (err) {
    console.error(`CoinGecko fetch error for ${coinId}:`, err);
    return null;
  }
}

function parseCoinGeckoData(data: any, symbol: string): any | null {
  if (!data.market_data) {
    console.log(`No market data for ${symbol}`);
    return null;
  }

  return {
    symbol: data.symbol?.toUpperCase() || symbol,
    name: data.name || symbol,
    address: data.platforms?.solana || '',
    price: data.market_data.current_price?.usd || 0,
    priceChange1h: data.market_data.price_change_percentage_1h_in_currency?.usd || 0,
    priceChange24h: data.market_data.price_change_percentage_24h || 0,
    priceChange7d: data.market_data.price_change_percentage_7d || 0,
    volume24h: data.market_data.total_volume?.usd || 0,
    liquidity: data.market_data.total_volume?.usd ? data.market_data.total_volume.usd * 0.1 : 0,
    marketCap: data.market_data.market_cap?.usd || 0,
    fdv: data.market_data.fully_diluted_valuation?.usd || 0,
    rank: data.market_cap_rank || null,
    image: data.image?.small || null,
    source: 'coingecko',
  };
}

async function fetchFromDexScreener(tokenQuery: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(tokenQuery)}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      console.log(`DexScreener returned ${res.status}`);
      return null;
    }

    const data = await res.json();

    // Filter for Solana pairs and sort by liquidity
    const solanaPairs = (data.pairs || [])
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    if (solanaPairs.length === 0) {
      console.log(`No Solana pairs found for ${tokenQuery}`);
      return null;
    }

    // Aggregate data from top pairs for more accurate volume
    const topPairs = solanaPairs.slice(0, 5);
    const totalVolume = topPairs.reduce((sum: number, p: any) => sum + (p.volume?.h24 || 0), 0);
    const totalLiquidity = topPairs.reduce((sum: number, p: any) => sum + (p.liquidity?.usd || 0), 0);

    const pair = solanaPairs[0];

    return {
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      address: pair.baseToken.address,
      price: parseFloat(pair.priceUsd) || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      priceChange7d: 0,
      volume24h: totalVolume,
      liquidity: totalLiquidity,
      marketCap: pair.marketCap || pair.fdv || 0,
      fdv: pair.fdv || 0,
      rank: null,
      pairAddress: pair.pairAddress,
      dex: pair.dexId,
      source: 'dexscreener',
    };
  } catch (err) {
    console.error(`DexScreener fetch error for ${tokenQuery}:`, err);
    return null;
  }
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
