import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number;
  price: number;
  priceChange24h: number;
  logoURI?: string;
}

interface PortfolioData {
  solBalance: number;
  solUsdValue: number;
  solPrice: number;
  solPriceChange24h: number;
  tokens: TokenHolding[];
  totalUsdValue: number;
  totalTokens: number;
}

// Known token metadata
const TOKEN_METADATA: Record<string, { symbol: string; name: string; logoURI?: string }> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network' },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': { symbol: 'JTO', name: 'Jito' },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { symbol: 'ORCA', name: 'Orca' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade SOL' },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': { symbol: 'bSOL', name: 'BlazeStake SOL' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const connection = new Connection(SOLANA_RPC, 'confirmed');

    // Fetch SOL price
    const solPriceResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
      { cache: 'no-store' }
    );
    const solPriceData = await solPriceResponse.json();
    const solPrice = solPriceData.solana?.usd || 0;
    const solPriceChange24h = solPriceData.solana?.usd_24h_change || 0;

    // Get SOL balance
    const solBalance = (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
    const solUsdValue = solBalance * solPrice;

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    const tokens: TokenHolding[] = [];
    let totalUsdValue = solUsdValue;

    for (const account of tokenAccounts.value) {
      const data = account.account.data.parsed.info;
      const balance = data.tokenAmount.uiAmount;

      if (balance <= 0) continue;

      const mint = data.mint;
      const decimals = data.tokenAmount.decimals;

      // Get token metadata
      const metadata = TOKEN_METADATA[mint] || { symbol: mint.slice(0, 6), name: 'Unknown Token' };

      // Try to get price from DexScreener
      let price = 0;
      let priceChange24h = 0;
      let usdValue = 0;

      try {
        const priceResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
          { cache: 'no-store' }
        );
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          const pairs = priceData.pairs?.filter((p: any) => p.chainId === 'solana');
          if (pairs && pairs.length > 0) {
            price = parseFloat(pairs[0].priceUsd) || 0;
            priceChange24h = pairs[0].priceChange?.h24 || 0;
            usdValue = balance * price;
          }
        }
      } catch {
        // Price fetch failed, continue without price
      }

      tokens.push({
        mint,
        symbol: metadata.symbol,
        name: metadata.name,
        balance,
        decimals,
        usdValue,
        price,
        priceChange24h,
        logoURI: metadata.logoURI,
      });

      totalUsdValue += usdValue;
    }

    // Sort tokens by USD value
    tokens.sort((a, b) => b.usdValue - a.usdValue);

    const portfolio: PortfolioData = {
      solBalance,
      solUsdValue,
      solPrice,
      solPriceChange24h,
      tokens: tokens.slice(0, 20), // Limit to 20 tokens
      totalUsdValue,
      totalTokens: tokens.length,
    };

    return NextResponse.json(portfolio);
  } catch (error: any) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
