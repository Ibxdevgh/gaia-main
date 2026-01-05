import { NextRequest, NextResponse } from 'next/server';

// Token analytics using DexScreener API (free, no API key needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Fetch from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token info');
    }

    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      return NextResponse.json(
        { error: 'Token not found or no trading pairs available' },
        { status: 404 }
      );
    }

    // Get the most liquid pair (highest volume)
    const pairs = data.pairs.filter((p: any) => p.chainId === 'solana');
    const mainPair = pairs.sort((a: any, b: any) =>
      (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
    )[0];

    if (!mainPair) {
      return NextResponse.json(
        { error: 'No Solana pairs found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      token: {
        address: mainPair.baseToken.address,
        name: mainPair.baseToken.name,
        symbol: mainPair.baseToken.symbol,
      },
      price: {
        usd: parseFloat(mainPair.priceUsd) || 0,
        native: parseFloat(mainPair.priceNative) || 0,
        change5m: mainPair.priceChange?.m5 || 0,
        change1h: mainPair.priceChange?.h1 || 0,
        change6h: mainPair.priceChange?.h6 || 0,
        change24h: mainPair.priceChange?.h24 || 0,
      },
      volume: {
        h24: mainPair.volume?.h24 || 0,
        h6: mainPair.volume?.h6 || 0,
        h1: mainPair.volume?.h1 || 0,
        m5: mainPair.volume?.m5 || 0,
      },
      liquidity: {
        usd: mainPair.liquidity?.usd || 0,
        base: mainPair.liquidity?.base || 0,
        quote: mainPair.liquidity?.quote || 0,
      },
      txns: {
        h24: {
          buys: mainPair.txns?.h24?.buys || 0,
          sells: mainPair.txns?.h24?.sells || 0,
        },
        h1: {
          buys: mainPair.txns?.h1?.buys || 0,
          sells: mainPair.txns?.h1?.sells || 0,
        },
      },
      fdv: mainPair.fdv || 0,
      marketCap: mainPair.marketCap || 0,
      pairAddress: mainPair.pairAddress,
      dexId: mainPair.dexId,
      url: mainPair.url,
      totalPairs: pairs.length,
    });
  } catch (error: any) {
    console.error('Token info error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token info' },
      { status: 500 }
    );
  }
}
