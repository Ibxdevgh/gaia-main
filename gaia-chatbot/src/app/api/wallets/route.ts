import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// In-memory storage for watched wallets (use database in production)
const watchedWallets: Map<string, WatchedWallet[]> = new Map();

interface WatchedWallet {
  address: string;
  label: string;
  addedAt: number;
  lastBalance?: number;
  lastUpdated?: number;
}

// GET - Fetch watched wallets for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('user');
    const fetchBalances = searchParams.get('balances') === 'true';

    if (!userWallet) {
      return NextResponse.json(
        { error: 'User wallet address is required' },
        { status: 400 }
      );
    }

    const wallets = watchedWallets.get(userWallet) || [];

    if (fetchBalances && wallets.length > 0) {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const solPrice = await getSolPrice();

      const walletsWithBalances = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const balance = await connection.getBalance(new PublicKey(wallet.address));
            const solBalance = balance / LAMPORTS_PER_SOL;
            return {
              ...wallet,
              solBalance,
              usdValue: solBalance * solPrice,
              lastUpdated: Date.now(),
            };
          } catch {
            return { ...wallet, solBalance: 0, usdValue: 0 };
          }
        })
      );

      return NextResponse.json({
        wallets: walletsWithBalances,
        total: walletsWithBalances.length,
        solPrice,
      });
    }

    return NextResponse.json({
      wallets,
      total: wallets.length,
    });
  } catch (error: any) {
    console.error('Wallets GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

// POST - Add a wallet to watch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userWallet, watchAddress, label } = body;

    if (!userWallet || !watchAddress) {
      return NextResponse.json(
        { error: 'userWallet and watchAddress are required' },
        { status: 400 }
      );
    }

    // Validate address
    try {
      new PublicKey(watchAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    const existingWallets = watchedWallets.get(userWallet) || [];

    // Check if already watching
    if (existingWallets.some(w => w.address === watchAddress)) {
      return NextResponse.json(
        { error: 'Already watching this wallet' },
        { status: 400 }
      );
    }

    // Limit to 10 watched wallets
    if (existingWallets.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 watched wallets allowed' },
        { status: 400 }
      );
    }

    const newWallet: WatchedWallet = {
      address: watchAddress,
      label: label || `Wallet ${existingWallets.length + 1}`,
      addedAt: Date.now(),
    };

    existingWallets.push(newWallet);
    watchedWallets.set(userWallet, existingWallets);

    return NextResponse.json({
      success: true,
      wallet: newWallet,
      message: 'Wallet added to watchlist',
    });
  } catch (error: any) {
    console.error('Wallets POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add wallet' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a watched wallet
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('user');
    const watchAddress = searchParams.get('address');

    if (!userWallet || !watchAddress) {
      return NextResponse.json(
        { error: 'user and address are required' },
        { status: 400 }
      );
    }

    const wallets = watchedWallets.get(userWallet) || [];
    const filtered = wallets.filter(w => w.address !== watchAddress);

    if (wallets.length === filtered.length) {
      return NextResponse.json(
        { error: 'Wallet not found in watchlist' },
        { status: 404 }
      );
    }

    watchedWallets.set(userWallet, filtered);

    return NextResponse.json({
      success: true,
      message: 'Wallet removed from watchlist',
    });
  } catch (error: any) {
    console.error('Wallets DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove wallet' },
      { status: 500 }
    );
  }
}

async function getSolPrice(): Promise<number> {
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
