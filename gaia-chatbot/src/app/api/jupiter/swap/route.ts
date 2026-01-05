import { NextRequest, NextResponse } from 'next/server';

// Multi-DEX Swap Transaction Builder: Jupiter, Raydium, Orca
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteResponse, userPublicKey } = body;

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: 'quoteResponse and userPublicKey are required' },
        { status: 400 }
      );
    }

    // Check if this is a fallback quote (we can't execute these)
    if (quoteResponse.isFallbackQuote) {
      return NextResponse.json(
        {
          error: 'DEX APIs are currently unavailable from your network. Try using a VPN or check your network settings.',
          code: 'DEX_UNAVAILABLE'
        },
        { status: 503 }
      );
    }

    const provider = quoteResponse.provider || 'jupiter';

    // Try to build transaction based on provider
    if (provider === 'raydium' && quoteResponse.raydiumData) {
      const result = await buildRaydiumTransaction(quoteResponse, userPublicKey);
      if (result) return result;
    }

    if (provider === 'orca' && quoteResponse.orcaData) {
      const result = await buildOrcaTransaction(quoteResponse, userPublicKey);
      if (result) return result;
    }

    if (provider === 'dexscreener' && quoteResponse.poolData) {
      // DexScreener finds pools from various DEXs - try to use the underlying DEX
      const dexId = quoteResponse.poolData?.dexId;
      if (dexId === 'raydium') {
        const result = await buildRaydiumTransaction(quoteResponse, userPublicKey);
        if (result) return result;
      }
      if (dexId === 'orca') {
        const result = await buildOrcaTransaction(quoteResponse, userPublicKey);
        if (result) return result;
      }
    }

    // Default: Try Jupiter
    const jupiterResult = await buildJupiterTransaction(quoteResponse, userPublicKey);
    if (jupiterResult) {
      return jupiterResult;
    }

    // If Jupiter fails, try Raydium as fallback
    const raydiumResult = await buildRaydiumTransaction(quoteResponse, userPublicKey);
    if (raydiumResult) {
      return raydiumResult;
    }

    // Try Orca as last resort
    const orcaResult = await buildOrcaTransaction(quoteResponse, userPublicKey);
    if (orcaResult) {
      return orcaResult;
    }

    return NextResponse.json(
      {
        error: 'Unable to build swap transaction. DEX services may be unavailable.',
        code: 'BUILD_FAILED'
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Swap API error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to build swap transaction' },
      { status: 500 }
    );
  }
}

async function buildJupiterTransaction(quoteResponse: any, userPublicKey: string): Promise<NextResponse | null> {
  try {
    // Remove custom fields before sending to Jupiter
    const { priceInfo, isFallbackQuote, provider, raydiumData, ...cleanQuote } = quoteResponse;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const endpoints = [
      'https://quote-api.jup.ag/v6/swap',
      'https://lite-api.jup.ag/v6/swap',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            quoteResponse: cleanQuote,
            userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            dynamicSlippage: { maxBps: 300 },
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 10000000,
                priorityLevel: "high"
              }
            }
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          console.log('Jupiter swap transaction built successfully');
          return NextResponse.json(data);
        }
      } catch (err: any) {
        console.log(`Jupiter endpoint ${endpoint} failed: ${err.message}`);
        continue;
      }
    }

    clearTimeout(timeout);
    return null;
  } catch (err: any) {
    console.error('Jupiter swap error:', err);
    return null;
  }
}

async function buildRaydiumTransaction(quoteResponse: any, userPublicKey: string): Promise<NextResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Raydium swap transaction API
    const response = await fetch('https://api-v3.raydium.io/compute/swap-base-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        wallet: userPublicKey,
        computeUnitPriceMicroLamports: 100000,
        inputMint: quoteResponse.inputMint,
        outputMint: quoteResponse.outputMint,
        amount: quoteResponse.inAmount,
        slippageBps: quoteResponse.slippageBps || 50,
        txVersion: 'V0',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.data) {
        console.log('Raydium swap transaction built successfully');

        // Raydium returns transaction data differently
        // We need to format it to match what the frontend expects
        return NextResponse.json({
          swapTransaction: data.data.transaction,
          provider: 'raydium',
        });
      }
    }

    return null;
  } catch (err: any) {
    console.error('Raydium swap error:', err);
    return null;
  }
}

async function buildOrcaTransaction(quoteResponse: any, userPublicKey: string): Promise<NextResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Orca swap transaction API
    const response = await fetch('https://api.orca.so/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        wallet: userPublicKey,
        inputMint: quoteResponse.inputMint,
        outputMint: quoteResponse.outputMint,
        amount: quoteResponse.inAmount,
        slippage: (quoteResponse.slippageBps || 50) / 10000,
        ...(quoteResponse.orcaData || {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();

      if (data.transaction) {
        console.log('Orca swap transaction built successfully');
        return NextResponse.json({
          swapTransaction: data.transaction,
          provider: 'orca',
        });
      }
    }

    return null;
  } catch (err: any) {
    console.error('Orca swap error:', err);
    return null;
  }
}
