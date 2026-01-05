import { NextResponse } from 'next/server';

async function fetchFromCoinGecko() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true',
    {
      next: { revalidate: 60 },
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!response.ok) {
    throw new Error('CoinGecko API failed');
  }

  const data = await response.json();
  return {
    price: data.market_data.current_price.usd,
    marketCap: data.market_data.market_cap.usd,
    marketCapRank: data.market_cap_rank,
    volume24h: data.market_data.total_volume.usd,
    high24h: data.market_data.high_24h.usd,
    low24h: data.market_data.low_24h.usd,
    priceChange24h: data.market_data.price_change_percentage_24h,
    priceChange7d: data.market_data.price_change_percentage_7d,
    priceChange30d: data.market_data.price_change_percentage_30d,
    ath: data.market_data.ath.usd,
    athDate: data.market_data.ath_date.usd,
    athChangePercentage: data.market_data.ath_change_percentage.usd,
    atl: data.market_data.atl.usd,
    atlDate: data.market_data.atl_date.usd,
    circulatingSupply: data.market_data.circulating_supply,
    totalSupply: data.market_data.total_supply,
    sparkline7d: data.market_data.sparkline_7d?.price || [],
  };
}

async function fetchFromDexScreener() {
  // Fetch SOL data from DexScreener as fallback
  const response = await fetch(
    'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
    { next: { revalidate: 30 } }
  );

  if (!response.ok) {
    throw new Error('DexScreener API failed');
  }

  const data = await response.json();
  const pair = data.pairs?.[0];

  if (!pair) {
    throw new Error('No SOL pair found');
  }

  const price = parseFloat(pair.priceUsd) || 0;
  const priceChange24h = pair.priceChange?.h24 || 0;
  const volume24h = pair.volume?.h24 || 0;
  const liquidity = pair.liquidity?.usd || 0;

  return {
    price,
    marketCap: price * 590000000, // Approximate circulating supply
    marketCapRank: 5,
    volume24h,
    high24h: price * 1.02,
    low24h: price * 0.98,
    priceChange24h,
    priceChange7d: 0,
    priceChange30d: 0,
    ath: 260.06,
    athDate: '2021-11-06',
    athChangePercentage: ((price - 260.06) / 260.06) * 100,
    atl: 0.50,
    atlDate: '2020-05-11',
    circulatingSupply: 590000000,
    totalSupply: 590000000,
    sparkline7d: [],
    liquidity,
    source: 'dexscreener'
  };
}

export async function GET() {
  try {
    // Try CoinGecko first
    try {
      const data = await fetchFromCoinGecko();
      return NextResponse.json(data);
    } catch (cgError) {
      console.log('CoinGecko failed, trying DexScreener fallback');
    }

    // Fallback to DexScreener
    const data = await fetchFromDexScreener();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
