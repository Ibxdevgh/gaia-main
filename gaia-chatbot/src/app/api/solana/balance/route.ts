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

    // Validate address
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

    // Get SOL balance
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    const tokens = tokenAccounts.value
      .map((account) => {
        const data = account.account.data.parsed.info;
        return {
          mint: data.mint,
          balance: data.tokenAmount.uiAmount,
          decimals: data.tokenAmount.decimals,
          symbol: data.tokenAmount.uiAmountString,
        };
      })
      .filter((token) => token.balance > 0);

    return NextResponse.json({
      solBalance,
      tokens,
      totalTokens: tokens.length,
    });
  } catch (error: any) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
