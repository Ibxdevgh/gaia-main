import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      { next: { revalidate: 30 } } // Cache for 30 seconds
    );

    if (!response.ok) {
      throw new Error('Failed to fetch price');
    }

    const data = await response.json();

    return NextResponse.json({
      price: data.solana.usd,
      change24h: data.solana.usd_24h_change,
      volume24h: data.solana.usd_24h_vol,
      marketCap: data.solana.usd_market_cap,
    });
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOL price' },
      { status: 500 }
    );
  }
}
