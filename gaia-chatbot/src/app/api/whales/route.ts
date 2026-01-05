import { NextRequest, NextResponse } from 'next/server';

// Known whale wallets and notable addresses
const KNOWN_WHALES: Record<string, string> = {
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'Binance Hot Wallet',
  'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS': 'Coinbase',
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': 'Jump Trading',
  'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq': 'Wintermute',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'Orca Protocol',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpools',
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD': 'Marinade Finance',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || 'SOL';

    console.log('Whale tracker for token:', token);

    // Fetch token pairs from DexScreener
    let pairs: any[] = [];
    let tokenAddress = 'So11111111111111111111111111111111111111112'; // Default SOL

    if (token.toUpperCase() === 'SOL') {
      const res = await fetch(
        'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        pairs = (data.pairs || [])
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
          .slice(0, 10);
      }
    } else {
      // Search for the token
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        pairs = (data.pairs || [])
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
          .slice(0, 10);

        if (pairs.length > 0) {
          tokenAddress = pairs[0].baseToken.address;
        }
      }
    }

    console.log(`Found ${pairs.length} pairs for ${token}`);

    // Analyze large volume movements
    const whaleActivity: any[] = [];

    for (const pair of pairs) {
      const volume24h = pair.volume?.h24 || 0;
      const volume1h = pair.volume?.h1 || 0;
      const txns24h = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
      const txns1h = (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0);

      // Detect whale activity by large average transaction size
      if (txns1h > 0 && volume1h > 0) {
        const avgTxSize1h = volume1h / txns1h;
        const avgTxSize24h = txns24h > 0 ? volume24h / txns24h : 0;

        // If average transaction size > $5,000, likely whale activity
        if (avgTxSize1h > 5000) {
          whaleActivity.push({
            pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
            baseToken: pair.baseToken.symbol,
            dex: pair.dexId,
            type: avgTxSize1h > avgTxSize24h * 1.5 ? 'Unusual Activity' : 'Large Trades',
            avgTransactionSize: avgTxSize1h,
            volume1h,
            volume24h,
            transactions1h: txns1h,
            transactions24h: txns24h,
            priceChange1h: pair.priceChange?.h1 || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            price: pair.priceUsd,
            signal: avgTxSize1h > 50000 ? 'STRONG' : avgTxSize1h > 20000 ? 'MODERATE' : 'MILD',
            liquidity: pair.liquidity?.usd || 0,
          });
        }
      }
    }

    // Sort by signal strength and transaction size
    whaleActivity.sort((a, b) => {
      const signalOrder: Record<string, number> = { 'STRONG': 3, 'MODERATE': 2, 'MILD': 1 };
      return (signalOrder[b.signal] || 0) - (signalOrder[a.signal] || 0) || b.avgTransactionSize - a.avgTransactionSize;
    });

    // Get trending tokens with whale activity
    const trendingRes = await fetch(
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
      { cache: 'no-store' }
    );

    let recentWhaleTokens: any[] = [];
    if (trendingRes.ok) {
      const trendingData = await trendingRes.json();
      const solanaPairs = (trendingData.pairs || [])
        .filter((p: any) => p.chainId === 'solana')
        .sort((a: any, b: any) => (b.volume?.h1 || 0) - (a.volume?.h1 || 0))
        .slice(0, 20);

      recentWhaleTokens = solanaPairs
        .filter((p: any) => {
          const txns1h = (p.txns?.h1?.buys || 0) + (p.txns?.h1?.sells || 0);
          const avgSize = txns1h > 0 ? (p.volume?.h1 || 0) / txns1h : 0;
          return avgSize > 3000; // $3k+ average transaction
        })
        .slice(0, 10)
        .map((p: any) => {
          const buys1h = p.txns?.h1?.buys || 0;
          const sells1h = p.txns?.h1?.sells || 0;
          return {
            token: p.baseToken.symbol,
            name: p.baseToken.name,
            address: p.baseToken.address,
            price: p.priceUsd,
            volume1h: p.volume?.h1 || 0,
            volume24h: p.volume?.h24 || 0,
            priceChange1h: p.priceChange?.h1 || 0,
            priceChange24h: p.priceChange?.h24 || 0,
            dex: p.dexId,
            buyPressure: buys1h > sells1h ? 'BUYING' : buys1h < sells1h ? 'SELLING' : 'NEUTRAL',
            buys1h,
            sells1h,
            liquidity: p.liquidity?.usd || 0,
          };
        });
    }

    // Known whale wallet list
    const knownWhales = Object.entries(KNOWN_WHALES).map(([address, name]) => ({
      address,
      name,
      shortAddress: `${address.slice(0, 4)}...${address.slice(-4)}`,
    }));

    return NextResponse.json({
      token,
      tokenAddress,
      whaleActivity,
      recentWhaleTokens,
      knownWhales,
      summary: {
        totalWhaleSignals: whaleActivity.length,
        strongSignals: whaleActivity.filter(w => w.signal === 'STRONG').length,
        moderateSignals: whaleActivity.filter(w => w.signal === 'MODERATE').length,
        tokensWithWhaleActivity: recentWhaleTokens.length,
        totalVolume1h: whaleActivity.reduce((sum, w) => sum + w.volume1h, 0),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Whale tracker error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch whale data' },
      { status: 500 }
    );
  }
}
