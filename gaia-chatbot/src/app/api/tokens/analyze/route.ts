import { NextRequest, NextResponse } from 'next/server';

// Comprehensive token analysis API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const symbol = searchParams.get('symbol');

    if (!address && !symbol) {
      return NextResponse.json(
        { error: 'Token address or symbol is required' },
        { status: 400 }
      );
    }

    // If we have a symbol, search for it first
    let tokenAddress = address;
    if (!tokenAddress && symbol) {
      const searchRes = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,
        { cache: 'no-store' }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const solanaPair = searchData.pairs?.find((p: any) => p.chainId === 'solana');
        if (solanaPair) {
          tokenAddress = solanaPair.baseToken.address;
        }
      }
    }

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Fetch comprehensive token data from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token data');
    }

    const data = await response.json();
    const pairs = data.pairs?.filter((p: any) => p.chainId === 'solana') || [];

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'No trading pairs found for this token on Solana' },
        { status: 404 }
      );
    }

    // Aggregate data from all pairs
    const primaryPair = pairs[0];
    const totalVolume24h = pairs.reduce((sum: number, p: any) => sum + (p.volume?.h24 || 0), 0);
    const totalLiquidity = pairs.reduce((sum: number, p: any) => sum + (p.liquidity?.usd || 0), 0);
    const totalTxns24h = pairs.reduce((sum: number, p: any) =>
      sum + (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0), 0);

    // Calculate buy/sell ratio
    const totalBuys = pairs.reduce((sum: number, p: any) => sum + (p.txns?.h24?.buys || 0), 0);
    const totalSells = pairs.reduce((sum: number, p: any) => sum + (p.txns?.h24?.sells || 0), 0);
    const buyRatio = totalTxns24h > 0 ? (totalBuys / totalTxns24h) * 100 : 50;

    // Price changes from primary pair
    const priceChanges = {
      m5: primaryPair.priceChange?.m5 || 0,
      h1: primaryPair.priceChange?.h1 || 0,
      h6: primaryPair.priceChange?.h6 || 0,
      h24: primaryPair.priceChange?.h24 || 0,
    };

    // Generate analysis summary
    const analysis = generateAnalysis(
      priceChanges,
      buyRatio,
      totalLiquidity,
      totalVolume24h,
      pairs.length
    );

    return NextResponse.json({
      token: {
        address: primaryPair.baseToken.address,
        name: primaryPair.baseToken.name,
        symbol: primaryPair.baseToken.symbol,
      },
      price: {
        usd: primaryPair.priceUsd,
        native: primaryPair.priceNative,
        changes: priceChanges,
      },
      market: {
        fdv: primaryPair.fdv || 0,
        marketCap: primaryPair.marketCap || 0,
        liquidity: totalLiquidity,
        volume24h: totalVolume24h,
      },
      trading: {
        pairs: pairs.length,
        transactions24h: totalTxns24h,
        buys24h: totalBuys,
        sells24h: totalSells,
        buyRatio: buyRatio.toFixed(1),
      },
      analysis,
      topPairs: pairs.slice(0, 5).map((p: any) => ({
        dex: p.dexId,
        pairAddress: p.pairAddress,
        quoteToken: p.quoteToken.symbol,
        liquidity: p.liquidity?.usd || 0,
        volume24h: p.volume?.h24 || 0,
        priceUsd: p.priceUsd,
      })),
    });
  } catch (error: any) {
    console.error('Token analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze token' },
      { status: 500 }
    );
  }
}

function generateAnalysis(
  priceChanges: { m5: number; h1: number; h6: number; h24: number },
  buyRatio: number,
  liquidity: number,
  volume: number,
  pairCount: number
): {
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: string;
  sentiment: string;
  liquidity: string;
  risk: string;
  summary: string;
} {
  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (priceChanges.h24 > 5 && priceChanges.h1 > 0) {
    trend = 'bullish';
  } else if (priceChanges.h24 < -5 && priceChanges.h1 < 0) {
    trend = 'bearish';
  }

  // Momentum analysis
  let momentum = 'Stable';
  if (Math.abs(priceChanges.m5) > 2) {
    momentum = priceChanges.m5 > 0 ? 'Strong upward momentum' : 'Strong downward momentum';
  } else if (Math.abs(priceChanges.h1) > 5) {
    momentum = priceChanges.h1 > 0 ? 'Gaining momentum' : 'Losing momentum';
  }

  // Sentiment based on buy/sell ratio
  let sentiment = 'Mixed';
  if (buyRatio > 60) {
    sentiment = 'Bullish (More buyers than sellers)';
  } else if (buyRatio < 40) {
    sentiment = 'Bearish (More sellers than buyers)';
  }

  // Liquidity assessment
  let liquidityRating = 'Low';
  if (liquidity > 1000000) {
    liquidityRating = 'Excellent (>$1M)';
  } else if (liquidity > 100000) {
    liquidityRating = 'Good ($100K-$1M)';
  } else if (liquidity > 10000) {
    liquidityRating = 'Moderate ($10K-$100K)';
  }

  // Risk assessment
  let risk = 'High';
  if (liquidity > 500000 && pairCount > 3) {
    risk = 'Lower (Good liquidity, multiple DEXs)';
  } else if (liquidity > 100000) {
    risk = 'Moderate';
  } else if (liquidity < 10000) {
    risk = 'Very High (Low liquidity)';
  }

  // Generate summary
  const trendEmoji = trend === 'bullish' ? '🟢' : trend === 'bearish' ? '🔴' : '⚪';
  const summary = `${trendEmoji} ${trend.toUpperCase()} - ${momentum}. ${
    priceChanges.h24 >= 0 ? '+' : ''
  }${priceChanges.h24.toFixed(2)}% in 24h. ${sentiment}. ${liquidityRating} liquidity across ${pairCount} trading pair(s).`;

  return {
    trend,
    momentum,
    sentiment,
    liquidity: liquidityRating,
    risk,
    summary,
  };
}
