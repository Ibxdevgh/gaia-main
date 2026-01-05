import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface ParsedTransaction {
  signature: string;
  timestamp: number | null;
  slot: number;
  success: boolean;
  fee: number;
  type: string;
  description: string;
  amount?: number;
  token?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    // Get transaction signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: Math.min(limit, 50),
    });

    // Parse transactions
    const transactions: ParsedTransaction[] = [];

    for (const sig of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) continue;

        let type = 'Unknown';
        let description = 'Transaction';
        let amount: number | undefined;
        let token: string | undefined;

        // Parse transaction type
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if ('parsed' in ix) {
            const parsed = ix.parsed;
            if (parsed.type === 'transfer') {
              type = 'Transfer';
              amount = parsed.info.lamports / 1e9;
              token = 'SOL';
              description = `Transferred ${amount.toFixed(4)} SOL`;
            } else if (parsed.type === 'transferChecked') {
              type = 'Token Transfer';
              amount = parsed.info.tokenAmount?.uiAmount;
              description = `Token transfer`;
            } else if (parsed.type === 'createAccount') {
              type = 'Create Account';
              description = 'Created new account';
            }
          } else if ('programId' in ix) {
            const programId = ix.programId.toString();
            // Jupiter Program
            if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
              type = 'Swap';
              description = 'Jupiter Swap';
            }
            // Raydium
            else if (programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') {
              type = 'Swap';
              description = 'Raydium Swap';
            }
            // Magic Eden
            else if (programId === 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K') {
              type = 'NFT';
              description = 'Magic Eden Transaction';
            }
          }
        }

        transactions.push({
          signature: sig.signature,
          timestamp: sig.blockTime,
          slot: sig.slot,
          success: sig.err === null,
          fee: tx.meta?.fee || 0,
          type,
          description,
          amount,
          token,
        });
      } catch (e) {
        // Skip failed transaction parsing
        continue;
      }
    }

    return NextResponse.json({
      transactions,
      total: transactions.length,
    });
  } catch (error: any) {
    console.error('Transaction history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}
