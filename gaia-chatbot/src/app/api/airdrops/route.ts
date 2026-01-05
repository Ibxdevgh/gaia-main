import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Known airdrop programs and their criteria
const AIRDROP_PROGRAMS = [
  {
    name: 'Jupiter',
    symbol: 'JUP',
    status: 'completed',
    criteria: ['Used Jupiter swap', 'Volume > $1000'],
    checkFunction: 'checkJupiterEligibility',
  },
  {
    name: 'Tensor',
    symbol: 'TNSR',
    status: 'completed',
    criteria: ['NFT trading on Tensor', 'Listed NFTs'],
  },
  {
    name: 'Parcl',
    symbol: 'PRCL',
    status: 'completed',
    criteria: ['Used Parcl protocol', 'Staked positions'],
  },
  {
    name: 'Kamino',
    symbol: 'KMNO',
    status: 'active',
    criteria: ['Provide liquidity', 'Use Kamino Lend'],
    website: 'https://app.kamino.finance',
  },
  {
    name: 'MarginFi',
    symbol: 'MRGN',
    status: 'upcoming',
    criteria: ['Lend/Borrow on MarginFi', 'Points accumulation'],
    website: 'https://app.marginfi.com',
  },
  {
    name: 'Drift',
    symbol: 'DRIFT',
    status: 'active',
    criteria: ['Trade perpetuals', 'Provide liquidity'],
    website: 'https://www.drift.trade',
  },
  {
    name: 'Zeta Markets',
    symbol: 'ZEX',
    status: 'upcoming',
    criteria: ['Options trading', 'Perpetual trading'],
    website: 'https://www.zeta.markets',
  },
  {
    name: 'Phoenix',
    symbol: 'PHX',
    status: 'upcoming',
    criteria: ['Order book trading', 'Market making'],
    website: 'https://www.phoenix.trade',
  },
];

// Known tokens to check in wallet that might indicate airdrop eligibility
const ELIGIBILITY_TOKENS: Record<string, string[]> = {
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': ['Marinade staker - potential airdrops'],
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': ['Jito staker - MEV rewards eligible'],
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': ['JUP holder - future governance'],
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': ['BONK holder - community airdrops'],
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': ['WIF holder - meme token ecosystem'],
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

    const publicKey = new PublicKey(address);
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    // Get wallet age and activity
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
    const oldestTx = signatures[signatures.length - 1];
    const walletAge = oldestTx?.blockTime
      ? Math.floor((Date.now() / 1000 - oldestTx.blockTime) / 86400)
      : 0;

    // Get SOL balance
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Get token holdings
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    // Check for eligibility tokens
    const eligibilitySignals: string[] = [];
    const heldTokens: string[] = [];

    for (const account of tokenAccounts.value) {
      const mint = account.account.data.parsed.info.mint;
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount;

      if (balance > 0) {
        heldTokens.push(mint);
        if (ELIGIBILITY_TOKENS[mint]) {
          eligibilitySignals.push(...ELIGIBILITY_TOKENS[mint]);
        }
      }
    }

    // Calculate airdrop score
    let airdropScore = 0;
    const scoreBreakdown: string[] = [];

    // Wallet age points
    if (walletAge > 365) {
      airdropScore += 30;
      scoreBreakdown.push('Old wallet (1+ year): +30');
    } else if (walletAge > 180) {
      airdropScore += 20;
      scoreBreakdown.push('Established wallet (6+ months): +20');
    } else if (walletAge > 30) {
      airdropScore += 10;
      scoreBreakdown.push('Active wallet (1+ month): +10');
    }

    // Transaction activity points
    if (signatures.length > 500) {
      airdropScore += 25;
      scoreBreakdown.push('High activity (500+ txns): +25');
    } else if (signatures.length > 100) {
      airdropScore += 15;
      scoreBreakdown.push('Moderate activity (100+ txns): +15');
    } else if (signatures.length > 20) {
      airdropScore += 5;
      scoreBreakdown.push('Some activity (20+ txns): +5');
    }

    // SOL balance points
    if (solBalance > 10) {
      airdropScore += 20;
      scoreBreakdown.push('Strong SOL balance (10+): +20');
    } else if (solBalance > 1) {
      airdropScore += 10;
      scoreBreakdown.push('Good SOL balance (1+): +10');
    }

    // Token diversity points
    if (heldTokens.length > 10) {
      airdropScore += 15;
      scoreBreakdown.push('Diverse portfolio (10+ tokens): +15');
    } else if (heldTokens.length > 5) {
      airdropScore += 10;
      scoreBreakdown.push('Multiple tokens (5+): +10');
    }

    // Eligibility signal points
    airdropScore += eligibilitySignals.length * 5;
    if (eligibilitySignals.length > 0) {
      scoreBreakdown.push(`Eligibility signals (${eligibilitySignals.length}): +${eligibilitySignals.length * 5}`);
    }

    // Determine airdrop tier
    let tier = 'Bronze';
    if (airdropScore >= 80) tier = 'Diamond';
    else if (airdropScore >= 60) tier = 'Gold';
    else if (airdropScore >= 40) tier = 'Silver';

    // Filter relevant airdrops
    const activeAirdrops = AIRDROP_PROGRAMS.filter(a => a.status === 'active');
    const upcomingAirdrops = AIRDROP_PROGRAMS.filter(a => a.status === 'upcoming');
    const completedAirdrops = AIRDROP_PROGRAMS.filter(a => a.status === 'completed');

    return NextResponse.json({
      wallet: {
        address,
        age: walletAge,
        ageLabel: walletAge > 365 ? 'OG' : walletAge > 180 ? 'Established' : walletAge > 30 ? 'Active' : 'New',
        solBalance,
        transactionCount: signatures.length,
        tokenCount: heldTokens.length,
      },
      airdropScore: {
        score: Math.min(airdropScore, 100),
        tier,
        breakdown: scoreBreakdown,
      },
      eligibilitySignals,
      airdrops: {
        active: activeAirdrops,
        upcoming: upcomingAirdrops,
        completed: completedAirdrops,
      },
      recommendations: generateRecommendations(airdropScore, eligibilitySignals, solBalance),
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Airdrop checker error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check airdrop eligibility' },
      { status: 500 }
    );
  }
}

function generateRecommendations(score: number, signals: string[], solBalance: number): string[] {
  const recommendations: string[] = [];

  if (score < 40) {
    recommendations.push('🎯 Increase on-chain activity to improve airdrop eligibility');
  }

  if (solBalance < 1) {
    recommendations.push('💰 Consider holding more SOL for transaction fees and staking');
  }

  if (!signals.some(s => s.includes('staker'))) {
    recommendations.push('📈 Stake SOL with liquid staking (mSOL, JitoSOL) for potential rewards');
  }

  recommendations.push('🔄 Use DeFi protocols like Kamino, MarginFi, Drift for points/airdrops');
  recommendations.push('🎮 Trade on Jupiter, Phoenix, or Zeta for potential future airdrops');

  return recommendations;
}
