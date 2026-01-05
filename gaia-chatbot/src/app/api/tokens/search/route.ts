import { NextRequest, NextResponse } from 'next/server';

// Search for tokens using DexScreener
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to search tokens');
    }

    const data = await response.json();

    // Filter for Solana tokens only
    const solanaPairs = (data.pairs || [])
      .filter((p: any) => p.chainId === 'solana')
      .slice(0, 20)
      .map((pair: any) => ({
        token: {
          address: pair.baseToken.address,
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
        },
        priceUsd: pair.priceUsd,
        priceChange24h: pair.priceChange?.h24 || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        fdv: pair.fdv || 0,
        dexId: pair.dexId,
      }));

    return NextResponse.json({
      results: solanaPairs,
      total: solanaPairs.length,
    });
  } catch (error: any) {
    console.error('Token search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search tokens' },
      { status: 500 }
    );
  }
}
