import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Known DeFi program IDs
const DEFI_PROGRAMS = {
  MARINADE: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  JITO: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
  RAYDIUM_STAKING: 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  METEORA: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
};

// Liquid staking tokens
const LST_TOKENS: Record<string, { name: string; symbol: string; protocol: string }> = {
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { name: 'Marinade Staked SOL', symbol: 'mSOL', protocol: 'Marinade' },
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': { name: 'Jito Staked SOL', symbol: 'JitoSOL', protocol: 'Jito' },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': { name: 'BlazeStake Staked SOL', symbol: 'bSOL', protocol: 'BlazeStake' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { name: 'Lido Staked SOL', symbol: 'stSOL', protocol: 'Lido' },
  'he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A': { name: 'Helius Staked SOL', symbol: 'hSOL', protocol: 'Helius' },
  'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v': { name: 'Jupiter Staked SOL', symbol: 'jupSOL', protocol: 'Jupiter' },
  'vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7': { name: 'Vault Staked SOL', symbol: 'vSOL', protocol: 'The Vault' },
  'LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X': { name: 'Laine Staked SOL', symbol: 'laineSOL', protocol: 'Laine' },
  'edge86g9cVz87xcpKpy3J77vbp4wYd9idEV562CCntt': { name: 'Edgevana Staked SOL', symbol: 'edgeSOL', protocol: 'Edgevana' },
  'Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h': { name: 'Compass Staked SOL', symbol: 'compassSOL', protocol: 'Compass' },
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

    // Get SOL price
    let solPrice = 135;
    try {
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        solPrice = priceData.solana?.usd || 135;
      }
    } catch {}

    // Fetch token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    const positions: any[] = [];
    let totalStakedValue = 0;

    // Check for liquid staking tokens
    for (const account of tokenAccounts.value) {
      const data = account.account.data.parsed.info;
      const mint = data.mint;
      const balance = data.tokenAmount.uiAmount;

      if (balance <= 0) continue;

      if (LST_TOKENS[mint]) {
        const lstInfo = LST_TOKENS[mint];
        // LSTs are roughly 1:1 with SOL + rewards
        const estimatedSolValue = balance * 1.05; // ~5% staking rewards estimate
        const usdValue = estimatedSolValue * solPrice;
        totalStakedValue += usdValue;

        positions.push({
          type: 'liquid_staking',
          protocol: lstInfo.protocol,
          token: {
            mint,
            symbol: lstInfo.symbol,
            name: lstInfo.name,
          },
          balance,
          estimatedSolValue,
          usdValue,
          apy: getEstimatedAPY(lstInfo.protocol),
        });
      }
    }

    // Check native stake accounts
    const stakeAccounts = await connection.getParsedProgramAccounts(
      new PublicKey('Stake11111111111111111111111111111111111111'),
      {
        filters: [
          { memcmp: { offset: 12, bytes: address } },
        ],
      }
    );

    for (const stakeAccount of stakeAccounts) {
      try {
        const stakeData = (stakeAccount.account.data as any).parsed?.info;
        if (stakeData?.stake?.delegation) {
          const stakedAmount = stakeData.stake.delegation.stake / 1e9;
          const usdValue = stakedAmount * solPrice;
          totalStakedValue += usdValue;

          positions.push({
            type: 'native_staking',
            protocol: 'Native Solana Staking',
            token: {
              mint: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              name: 'Solana',
            },
            balance: stakedAmount,
            estimatedSolValue: stakedAmount,
            usdValue,
            validator: stakeData.stake.delegation.voter,
            activationEpoch: stakeData.stake.delegation.activationEpoch,
            apy: 7.5, // Average native staking APY
          });
        }
      } catch {}
    }

    return NextResponse.json({
      positions,
      summary: {
        totalPositions: positions.length,
        totalStakedValue,
        protocols: [...new Set(positions.map(p => p.protocol))],
      },
      solPrice,
    });
  } catch (error: any) {
    console.error('DeFi positions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch DeFi positions' },
      { status: 500 }
    );
  }
}

function getEstimatedAPY(protocol: string): number {
  const apyEstimates: Record<string, number> = {
    'Marinade': 8.1,
    'Jito': 8.5,
    'BlazeStake': 7.8,
    'Lido': 7.5,
    'Jupiter': 8.0,
    'Helius': 7.9,
    'The Vault': 7.7,
    'Laine': 7.6,
    'Edgevana': 7.8,
    'Compass': 7.5,
  };
  return apyEstimates[protocol] || 7.5;
}
