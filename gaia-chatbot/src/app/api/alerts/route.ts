import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for alerts (in production, use a database)
const alertsStore: Map<string, PriceAlert[]> = new Map();

interface PriceAlert {
  id: string;
  walletAddress: string;
  tokenMint: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currentPrice?: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

// GET - Fetch alerts for a wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const alerts = alertsStore.get(walletAddress) || [];

    // Check current prices and update alert status
    const updatedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const currentPrice = await getTokenPrice(alert.tokenMint);
        const shouldTrigger =
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);

        return {
          ...alert,
          currentPrice,
          triggered: alert.triggered || shouldTrigger,
          triggeredAt: alert.triggered ? alert.triggeredAt : (shouldTrigger ? Date.now() : undefined),
        };
      })
    );

    // Update store with triggered status
    alertsStore.set(walletAddress, updatedAlerts);

    return NextResponse.json({
      alerts: updatedAlerts,
      total: updatedAlerts.length,
      activeAlerts: updatedAlerts.filter(a => !a.triggered).length,
      triggeredAlerts: updatedAlerts.filter(a => a.triggered).length,
    });
  } catch (error: any) {
    console.error('Alerts GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, tokenMint, tokenSymbol, targetPrice, condition } = body;

    if (!walletAddress || !tokenMint || !targetPrice || !condition) {
      return NextResponse.json(
        { error: 'walletAddress, tokenMint, targetPrice, and condition are required' },
        { status: 400 }
      );
    }

    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json(
        { error: 'condition must be "above" or "below"' },
        { status: 400 }
      );
    }

    const currentPrice = await getTokenPrice(tokenMint);

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletAddress,
      tokenMint,
      tokenSymbol: tokenSymbol || tokenMint.slice(0, 6),
      targetPrice: parseFloat(targetPrice),
      condition,
      currentPrice,
      createdAt: Date.now(),
      triggered: false,
    };

    const existingAlerts = alertsStore.get(walletAddress) || [];
    existingAlerts.push(newAlert);
    alertsStore.set(walletAddress, existingAlerts);

    return NextResponse.json({
      success: true,
      alert: newAlert,
      message: `Alert created: Notify when ${tokenSymbol || 'token'} goes ${condition} $${targetPrice}`,
    });
  } catch (error: any) {
    console.error('Alerts POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an alert
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const alertId = searchParams.get('id');

    if (!walletAddress || !alertId) {
      return NextResponse.json(
        { error: 'wallet and id are required' },
        { status: 400 }
      );
    }

    const alerts = alertsStore.get(walletAddress) || [];
    const filteredAlerts = alerts.filter(a => a.id !== alertId);

    if (alerts.length === filteredAlerts.length) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    alertsStore.set(walletAddress, filteredAlerts);

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error: any) {
    console.error('Alerts DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

async function getTokenPrice(mint: string): Promise<number> {
  try {
    if (mint === 'So11111111111111111111111111111111111111112') {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (res.ok) {
        const data = await res.json();
        return data.solana?.usd || 0;
      }
    }

    // Stablecoins
    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
        mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
      return 1.0;
    }

    // Other tokens from DexScreener
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
