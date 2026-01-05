import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

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

    const publicKey = new PublicKey(address);
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    // Fetch SOL price and market data
    const [solPrice, marketData] = await Promise.all([
      fetchSolPrice(),
      fetchMarketData(),
    ]);

    // Get wallet balances
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    const solValue = solBalance * solPrice;

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    // Calculate token holdings value
    let totalTokenValue = 0;
    const tokenHoldings: any[] = [];

    for (const account of tokenAccounts.value) {
      const data = account.account.data.parsed.info;
      const mint = data.mint;
      const balance = data.tokenAmount.uiAmount;

      if (balance <= 0) continue;

      try {
        const price = await getTokenPrice(mint);
        const value = balance * price;
        totalTokenValue += value;

        if (value > 0.01) {
          tokenHoldings.push({
            mint,
            balance,
            price,
            value,
            percentage: 0, // Will calculate after
          });
        }
      } catch {}
    }

    // Calculate total portfolio value
    const totalValue = solValue + totalTokenValue;

    // Calculate percentages
    const solPercentage = totalValue > 0 ? (solValue / totalValue) * 100 : 0;
    tokenHoldings.forEach(t => {
      t.percentage = totalValue > 0 ? (t.value / totalValue) * 100 : 0;
    });

    // Sort by value
    tokenHoldings.sort((a, b) => b.value - a.value);

    // Portfolio allocation
    const allocation = {
      sol: { value: solValue, percentage: solPercentage },
      tokens: tokenHoldings.slice(0, 10),
      other: tokenHoldings.slice(10).reduce((sum, t) => sum + t.value, 0),
    };

    // Transaction statistics (simplified - would need indexer for full history)
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 100 });
    const recentTxCount = signatures.length;
    const last24hTxCount = signatures.filter(s =>
      s.blockTime && s.blockTime > (Date.now() / 1000) - 86400
    ).length;

    // Generate portfolio insights
    const insights = generateInsights(solBalance, solValue, tokenHoldings, totalValue, marketData);

    return NextResponse.json({
      portfolio: {
        totalValue,
        solBalance,
        solValue,
        solPercentage,
        tokenCount: tokenHoldings.length,
        totalTokenValue,
      },
      allocation,
      market: {
        solPrice,
        priceChange24h: marketData?.priceChange24h || 0,
        priceChange7d: marketData?.priceChange7d || 0,
      },
      activity: {
        recentTransactions: recentTxCount,
        last24hTransactions: last24hTxCount,
      },
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      return data.solana?.usd || 135;
    }
    return 135;
  } catch {
    return 135;
  }
}

async function fetchMarketData() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&community_data=false&developer_data=false'
    );
    if (res.ok) {
      const data = await res.json();
      return {
        priceChange24h: data.market_data?.price_change_percentage_24h || 0,
        priceChange7d: data.market_data?.price_change_percentage_7d || 0,
        priceChange30d: data.market_data?.price_change_percentage_30d || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getTokenPrice(mint: string): Promise<number> {
  try {
    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
        mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
      return 1.0;
    }

    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (res.ok) {
      const data = await res.json();
      const pair = data.pairs?.find((p: any) => p.chainId === 'solana');
      if (pair?.priceUsd) {
        return parseFloat(pair.priceUsd);
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

function generateInsights(
  solBalance: number,
  solValue: number,
  tokenHoldings: any[],
  totalValue: number,
  marketData: any
): string[] {
  const insights: string[] = [];

  // Portfolio size insight
  if (totalValue > 10000) {
    insights.push('🐋 Whale status! Your portfolio is valued over $10,000');
  } else if (totalValue > 1000) {
    insights.push('📈 Growing portfolio! You have over $1,000 in assets');
  } else if (totalValue > 100) {
    insights.push('🌱 Building your portfolio - keep stacking!');
  }

  // SOL concentration
  const solPercentage = totalValue > 0 ? (solValue / totalValue) * 100 : 0;
  if (solPercentage > 80) {
    insights.push('💎 You\'re heavily concentrated in SOL - consider diversifying');
  } else if (solPercentage < 20 && totalValue > 100) {
    insights.push('🎯 Well diversified portfolio with multiple tokens');
  }

  // Market conditions
  if (marketData?.priceChange24h > 5) {
    insights.push('🚀 SOL is pumping! Up ' + marketData.priceChange24h.toFixed(1) + '% in 24h');
  } else if (marketData?.priceChange24h < -5) {
    insights.push('📉 SOL dipping ' + Math.abs(marketData.priceChange24h).toFixed(1) + '% - could be a buying opportunity');
  }

  // Token diversity
  if (tokenHoldings.length > 10) {
    insights.push('🎨 Diverse token holder with ' + tokenHoldings.length + ' different tokens');
  }

  // Low balance warning
  if (solBalance < 0.01) {
    insights.push('⚠️ Low SOL balance - you may need SOL for transaction fees');
  }

  return insights;
}
