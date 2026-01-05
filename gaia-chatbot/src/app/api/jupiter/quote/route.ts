import { NextRequest, NextResponse } from 'next/server';

// Multi-DEX Quote API with fallbacks: Jupiter -> Raydium -> Orca -> DexScreener
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps') || '50';

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'inputMint, outputMint, and amount are required' },
        { status: 400 }
      );
    }

    // Try Jupiter first
    const jupiterQuote = await tryJupiterQuote(inputMint, outputMint, amount, slippageBps);
    if (jupiterQuote) {
      return NextResponse.json(jupiterQuote);
    }

    // Try Raydium as fallback
    const raydiumQuote = await tryRaydiumQuote(inputMint, outputMint, amount, slippageBps);
    if (raydiumQuote) {
      return NextResponse.json(raydiumQuote);
    }

    // Try Orca Whirlpools
    const orcaQuote = await tryOrcaQuote(inputMint, outputMint, amount, slippageBps);
    if (orcaQuote) {
      return NextResponse.json(orcaQuote);
    }

    // Try DexScreener for price-based quote (executable via on-chain)
    const dexScreenerQuote = await tryDexScreenerQuote(inputMint, outputMint, amount, slippageBps);
    if (dexScreenerQuote) {
      return NextResponse.json(dexScreenerQuote);
    }

    // Final fallback: Calculate quote based on real prices (display only)
    console.log('All DEX APIs unavailable, using price-based fallback');
    const fallbackQuote = await createFallbackQuote(inputMint, outputMint, amount, slippageBps);
    if (fallbackQuote) {
      return NextResponse.json(fallbackQuote);
    }

    return NextResponse.json(
      { error: 'Unable to get swap quote. Please check your network connection.' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quote' },
      { status: 500 }
    );
  }
}

async function tryJupiterQuote(inputMint: string, outputMint: string, amount: string, slippageBps: string): Promise<any | null> {
  const endpoints = [
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&swapMode=ExactIn`,
    `https://lite-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const quoteResponse = await response.json();

        // Add price info for UI
        const inputDecimals = getDecimals(inputMint);
        const outputDecimals = getDecimals(outputMint);
        const inAmountNum = parseInt(quoteResponse.inAmount) / Math.pow(10, inputDecimals);
        const outAmountNum = parseInt(quoteResponse.outAmount) / Math.pow(10, outputDecimals);

        const [inputPrice, outputPrice] = await Promise.all([
          getTokenPrice(inputMint),
          getTokenPrice(outputMint),
        ]);

        quoteResponse.priceInfo = {
          inputPrice: inputPrice || 0,
          outputPrice: outputPrice || 0,
          rate: outAmountNum / inAmountNum,
        };
        quoteResponse.provider = 'jupiter';

        console.log('Jupiter quote successful');
        return quoteResponse;
      }
    } catch (err: any) {
      console.log(`Jupiter endpoint failed: ${err.message}`);
      continue;
    }
  }
  return null;
}

async function tryRaydiumQuote(inputMint: string, outputMint: string, amount: string, slippageBps: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Raydium swap API
    const url = `https://api-v3.raydium.io/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.data) {
        const raydiumData = data.data;

        const inputDecimals = getDecimals(inputMint);
        const outputDecimals = getDecimals(outputMint);
        const inAmountNum = parseInt(amount) / Math.pow(10, inputDecimals);
        const outAmountNum = parseInt(raydiumData.outputAmount) / Math.pow(10, outputDecimals);

        const [inputPrice, outputPrice] = await Promise.all([
          getTokenPrice(inputMint),
          getTokenPrice(outputMint),
        ]);

        const quoteResponse = {
          inputMint,
          outputMint,
          inAmount: amount,
          outAmount: raydiumData.outputAmount,
          priceImpactPct: raydiumData.priceImpact || 0,
          routePlan: raydiumData.routePlan || [],
          otherAmountThreshold: raydiumData.otherAmountThreshold || raydiumData.outputAmount,
          swapMode: 'ExactIn',
          slippageBps: parseInt(slippageBps),
          priceInfo: {
            inputPrice: inputPrice || 0,
            outputPrice: outputPrice || 0,
            rate: outAmountNum / inAmountNum,
          },
          provider: 'raydium',
          raydiumData: raydiumData, // Keep original data for swap
        };

        console.log('Raydium quote successful');
        return quoteResponse;
      }
    }
  } catch (err: any) {
    console.log(`Raydium API failed: ${err.message}`);
  }
  return null;
}

async function tryOrcaQuote(inputMint: string, outputMint: string, amount: string, slippageBps: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Orca Whirlpools API
    const url = `https://api.orca.so/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippage=${parseInt(slippageBps) / 10000}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();

      if (data.outAmount) {
        const inputDecimals = getDecimals(inputMint);
        const outputDecimals = getDecimals(outputMint);
        const inAmountNum = parseInt(amount) / Math.pow(10, inputDecimals);
        const outAmountNum = parseInt(data.outAmount) / Math.pow(10, outputDecimals);

        const [inputPrice, outputPrice] = await Promise.all([
          getTokenPrice(inputMint),
          getTokenPrice(outputMint),
        ]);

        const quoteResponse = {
          inputMint,
          outputMint,
          inAmount: amount,
          outAmount: data.outAmount,
          priceImpactPct: data.priceImpact || 0,
          routePlan: data.route || [],
          otherAmountThreshold: data.otherAmountThreshold || data.outAmount,
          swapMode: 'ExactIn',
          slippageBps: parseInt(slippageBps),
          priceInfo: {
            inputPrice: inputPrice || 0,
            outputPrice: outputPrice || 0,
            rate: outAmountNum / inAmountNum,
          },
          provider: 'orca',
          orcaData: data,
        };

        console.log('Orca quote successful');
        return quoteResponse;
      }
    }
  } catch (err: any) {
    console.log(`Orca API failed: ${err.message}`);
  }
  return null;
}

async function tryDexScreenerQuote(inputMint: string, outputMint: string, amount: string, slippageBps: string): Promise<any | null> {
  try {
    // Get prices from DexScreener for both tokens
    const [inputData, outputData] = await Promise.all([
      fetchDexScreenerPrice(inputMint),
      fetchDexScreenerPrice(outputMint),
    ]);

    if (!inputData || !outputData) {
      return null;
    }

    const inputDecimals = getDecimals(inputMint);
    const outputDecimals = getDecimals(outputMint);

    const inAmountNum = parseInt(amount) / Math.pow(10, inputDecimals);
    const inputValueUsd = inAmountNum * inputData.price;
    const outputAmountNum = inputValueUsd / outputData.price;

    // Apply 0.3% DEX fee
    const outputWithFee = outputAmountNum * 0.997;
    const outAmount = Math.floor(outputWithFee * Math.pow(10, outputDecimals));

    // Find best liquidity pool for this pair
    const bestPool = await findBestPool(inputMint, outputMint);

    const quoteResponse = {
      inputMint,
      outputMint,
      inAmount: amount,
      outAmount: outAmount.toString(),
      priceImpactPct: 0.3,
      routePlan: bestPool ? [{ pool: bestPool.pairAddress, dex: bestPool.dexId }] : [],
      otherAmountThreshold: Math.floor(outAmount * (1 - parseInt(slippageBps) / 10000)).toString(),
      swapMode: 'ExactIn',
      slippageBps: parseInt(slippageBps),
      priceInfo: {
        inputPrice: inputData.price,
        outputPrice: outputData.price,
        rate: outputWithFee / inAmountNum,
      },
      provider: 'dexscreener',
      poolData: bestPool,
    };

    console.log('DexScreener quote successful');
    return quoteResponse;
  } catch (err: any) {
    console.log(`DexScreener quote failed: ${err.message}`);
  }
  return null;
}

async function fetchDexScreenerPrice(mint: string): Promise<{ price: number; liquidity: number } | null> {
  try {
    // Handle stablecoins
    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
        mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
      return { price: 1.0, liquidity: 1000000000 };
    }

    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      const pairs = (data.pairs || []).filter((p: any) => p.chainId === 'solana');
      if (pairs.length > 0) {
        // Get highest liquidity pair
        const bestPair = pairs.sort((a: any, b: any) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        return {
          price: parseFloat(bestPair.priceUsd) || 0,
          liquidity: bestPair.liquidity?.usd || 0,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function findBestPool(inputMint: string, outputMint: string): Promise<any | null> {
  try {
    // Search for direct pairs
    const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${inputMint}`, {
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      // Find pair that matches both tokens
      const matchingPair = (data.pairs || []).find((p: any) =>
        (p.baseToken?.address === inputMint && p.quoteToken?.address === outputMint) ||
        (p.baseToken?.address === outputMint && p.quoteToken?.address === inputMint)
      );
      return matchingPair || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function createFallbackQuote(inputMint: string, outputMint: string, amount: string, slippageBps: string): Promise<any | null> {
  const [inputPrice, outputPrice] = await Promise.all([
    getTokenPrice(inputMint),
    getTokenPrice(outputMint),
  ]);

  if (!inputPrice || !outputPrice) {
    return null;
  }

  const inputDecimals = getDecimals(inputMint);
  const outputDecimals = getDecimals(outputMint);

  const inputAmountNum = parseInt(amount) / Math.pow(10, inputDecimals);
  const inputValueUsd = inputAmountNum * inputPrice;
  const outputAmountNum = inputValueUsd / outputPrice;
  const outputWithSpread = outputAmountNum * 0.995; // 0.5% spread for fallback
  const outAmount = Math.floor(outputWithSpread * Math.pow(10, outputDecimals));
  const rate = inputPrice / outputPrice;

  return {
    inputMint,
    outputMint,
    inAmount: amount,
    outAmount: outAmount.toString(),
    priceImpactPct: 0.5,
    routePlan: [],
    otherAmountThreshold: Math.floor(outAmount * (1 - parseInt(slippageBps) / 10000)).toString(),
    swapMode: 'ExactIn',
    slippageBps: parseInt(slippageBps),
    priceInfo: {
      inputPrice,
      outputPrice,
      rate: rate * 0.995,
    },
    isFallbackQuote: true,
    provider: 'fallback',
  };
}

function getDecimals(mint: string): number {
  const decimals: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5, // BONK
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 6, // JUP
    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 6, // WIF
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 6, // RAY
    'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 6, // PYTH
  };
  return decimals[mint] || 6;
}

async function getTokenPrice(mint: string): Promise<number | null> {
  try {
    if (mint === 'So11111111111111111111111111111111111111112') {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        return data.solana?.usd || 200;
      }
      return 200; // Fallback SOL price
    }

    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
        mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
      return 1.0; // Stablecoins
    }

    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const pair = data.pairs?.find((p: any) => p.chainId === 'solana');
      if (pair?.priceUsd) {
        return parseFloat(pair.priceUsd);
      }
    }
    return null;
  } catch {
    return null;
  }
}
