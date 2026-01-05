import { NextResponse } from 'next/server';

// Tokens to filter out (stablecoins + SOL/wrapped SOL)
const EXCLUDED_TOKENS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX',  // USDH
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSOL
  'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',  // USD1
  'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS', // PAI
  '9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i', // UST
  'So11111111111111111111111111111111111111112',  // SOL (native)
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
]);

// Get trending tokens on Solana (excluding stablecoins)
export async function GET() {
  try {
    // Fetch trending token profiles from DexScreener
    const response = await fetch(
      'https://api.dexscreener.com/token-profiles/latest/v1',
      { cache: 'no-store' }
    );

    let trendingTokens: any[] = [];

    if (response.ok) {
      const data = await response.json();
      trendingTokens = (data || [])
        .filter((t: any) =>
          t.chainId === 'solana' &&
          !EXCLUDED_TOKENS.has(t.tokenAddress) &&
          !isExcludedSymbol(t.symbol)
        )
        .slice(0, 10);
    }

    // Fetch top Solana meme/trending tokens by volume from DexScreener
    const trendingSearchResponse = await fetch(
      'https://api.dexscreener.com/latest/dex/search?q=solana',
      { cache: 'no-store' }
    );

    let topByVolume: any[] = [];
    if (trendingSearchResponse.ok) {
      const searchData = await trendingSearchResponse.json();
      const seen = new Set<string>();

      topByVolume = (searchData.pairs || [])
        .filter((p: any) => {
          if (p.chainId !== 'solana') return false;
          if (EXCLUDED_TOKENS.has(p.baseToken?.address)) return false;
          if (EXCLUDED_TOKENS.has(p.quoteToken?.address)) return false;
          if (isExcludedSymbol(p.baseToken?.symbol)) return false;
          // Skip if we've already seen this token
          if (seen.has(p.baseToken?.address)) return false;
          seen.add(p.baseToken?.address);
          return true;
        })
        .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, 15)
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
          pairAddress: pair.pairAddress,
          dexId: pair.dexId,
        }));
    }

    // Fetch top Solana tokens by market cap from CoinGecko
    const cgResponse = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=15&page=1',
      { cache: 'no-store' }
    );

    let topByMarketCap: any[] = [];
    if (cgResponse.ok) {
      const cgData = await cgResponse.json();
      topByMarketCap = cgData
        .filter((coin: any) => !isExcludedSymbol(coin.symbol))
        .slice(0, 10)
        .map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          image: coin.image,
          price: coin.current_price,
          priceChange24h: coin.price_change_percentage_24h,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
          rank: coin.market_cap_rank,
        }));
    }

    return NextResponse.json({
      trending: trendingTokens,
      topByVolume,
      topByMarketCap,
    });
  } catch (error: any) {
    console.error('Trending tokens error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trending tokens' },
      { status: 500 }
    );
  }
}

function isExcludedSymbol(symbol: string | undefined): boolean {
  if (!symbol) return false;
  const upper = symbol.toUpperCase();
  return ['USDC', 'USDT', 'USDH', 'DAI', 'BUSD', 'UST', 'PAI', 'USD1', 'FRAX', 'TUSD', 'GUSD', 'LUSD', 'SUSD', 'CUSD', 'HUSD', 'USDP', 'FEI', 'MIM', 'DOLA', 'USDD', 'EURC', 'PYUSD', 'SOL', 'WSOL', 'MSOL', 'STSOL', 'JITOSOL'].includes(upper);
}
