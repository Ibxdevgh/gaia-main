import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Token metadata mapping
const TOKEN_METADATA: Record<string, { symbol: string; name: string }> = {
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
};

// Fetch real-time SOL price from CoinGecko with timeout
async function fetchSolPrice() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      price: data.solana.usd,
      change24h: data.solana.usd_24h_change,
      volume24h: data.solana.usd_24h_vol,
      marketCap: data.solana.usd_market_cap,
    };
  } catch {
    return null;
  }
}

// Fetch wallet portfolio - simplified for speed
async function fetchPortfolio(address: string, solPrice: number) {
  try {
    const publicKey = new PublicKey(address);
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    const tokens = [];
    for (const account of tokenAccounts.value) {
      const data = account.account.data.parsed.info;
      const tokenBalance = data.tokenAmount.uiAmount;
      if (tokenBalance <= 0) continue;

      const mint = data.mint;
      const metadata = TOKEN_METADATA[mint] || { symbol: mint.slice(0, 6), name: 'Unknown' };

      tokens.push({
        mint,
        symbol: metadata.symbol,
        name: metadata.name,
        balance: tokenBalance,
      });
    }

    return {
      solBalance,
      solUsdValue: solBalance * solPrice,
      tokens: tokens.slice(0, 10),
      totalUsdValue: solBalance * solPrice,
      tokenCount: tokens.length,
    };
  } catch {
    return null;
  }
}

// Tokens to filter out from trending (stablecoins + SOL itself)
const EXCLUDED_SYMBOLS = ['USDC', 'USDT', 'USDH', 'DAI', 'BUSD', 'UST', 'PAI', 'USD1', 'FRAX', 'TUSD', 'GUSD', 'LUSD', 'SUSD', 'CUSD', 'HUSD', 'USDP', 'FEI', 'MIM', 'DOLA', 'USDD', 'EURC', 'PYUSD', 'SOL', 'WSOL', 'MSOL', 'STSOL', 'JITOSOL'];

// Fetch trending tokens with timeout
async function fetchTrendingTokens() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=10&page=1',
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data
      .filter((coin: any) => !EXCLUDED_SYMBOLS.includes(coin.symbol.toUpperCase()))
      .slice(0, 5)
      .map((coin: any) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        volume: coin.total_volume,
      }));
  } catch {
    return null;
  }
}

// Fetch recent transactions (fast - just signatures)
async function fetchRecentTransactions(address: string) {
  try {
    const publicKey = new PublicKey(address);
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });

    return signatures.map(sig => ({
      signature: sig.signature.slice(0, 8) + '...' + sig.signature.slice(-8),
      fullSignature: sig.signature,
      time: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown',
      success: sig.err === null,
      memo: sig.memo || null,
    }));
  } catch {
    return null;
  }
}

// Fetch token info with timeout
async function fetchTokenInfo(query: string) {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const solanaPairs = data.pairs?.filter((p: any) => p.chainId === 'solana');
    if (!solanaPairs?.[0]) return null;

    const pair = solanaPairs[0];
    return {
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      address: pair.baseToken.address,
      price: pair.priceUsd,
      change24h: pair.priceChange?.h24,
      volume24h: pair.volume?.h24,
      liquidity: pair.liquidity?.usd,
      fdv: pair.fdv,
    };
  } catch {
    return null;
  }
}

// Detect if user is asking about transactions
function detectTransactionQuery(message: string): boolean {
  const txPatterns = [
    /transaction/i,
    /history/i,
    /recent activity/i,
    /what.*did.*i.*do/i,
    /my activity/i,
    /tx history/i,
    /transfers/i,
    /swaps/i,
  ];
  return txPatterns.some(pattern => pattern.test(message));
}

// Detect if user is asking about a specific token
function detectTokenQuery(message: string): string | null {
  const tokenPatterns = [
    /price of (\w+)/i,
    /(\w+) price/i,
    /analyze (\w+)/i,
    /tell me about (\w+)/i,
    /what is (\w+)/i,
    /info on (\w+)/i,
    /\$(\w+)/,
  ];

  for (const pattern of tokenPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const token = match[1].toUpperCase();
      if (!['MY', 'THE', 'A', 'AN', 'THIS', 'THAT', 'SOL', 'SOLANA'].includes(token)) {
        return token;
      }
    }
  }
  return null;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

const SYSTEM_PROMPT = `You are GAIA, an advanced AI assistant specialized in Solana blockchain and Web3. You have access to REAL-TIME data provided in this conversation.

CAPABILITIES:
1. **Real-time SOL Price & Market Data** - Current prices, 24h changes, volume, market cap
2. **Portfolio Analysis** - User's wallet balance, token holdings with USD values
3. **Token Analytics** - Price, volume, liquidity for any Solana token
4. **Trending Tokens** - Top performing tokens in the Solana ecosystem
5. **Transaction History** - Recent wallet transactions with timestamps and status

INSTRUCTIONS:
- ALWAYS use the real-time data provided - never say you can't access current data
- Format responses with markdown for readability
- Include specific numbers and percentages from the data
- When discussing tokens, mention price, 24h change, and volume
- For portfolio queries, calculate and show total USD value
- For transaction queries, show the recent transactions from the data provided
- Be concise but informative

AVAILABLE FEATURES IN THE APP:
- Portfolio dashboard with all token holdings
- Transaction history
- Token search and analytics
- Tools for wallet watching, whale tracking, and token comparison

Be helpful, accurate, and proactive in providing relevant market insights.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, walletAddress } = await request.json();
    const lastMessage = messages[messages.length - 1]?.content || '';

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Detect if asking about specific token or transactions
    const tokenQuery = detectTokenQuery(lastMessage);
    const wantsTransactions = detectTransactionQuery(lastMessage);

    // Fetch ALL data in parallel for speed
    const [priceData, trendingTokens, specificToken, portfolioData, transactions] = await Promise.all([
      fetchSolPrice(),
      fetchTrendingTokens(),
      tokenQuery ? fetchTokenInfo(tokenQuery) : Promise.resolve(null),
      walletAddress ? fetchPortfolio(walletAddress, 200) : Promise.resolve(null),
      walletAddress && wantsTransactions ? fetchRecentTransactions(walletAddress) : Promise.resolve(null),
    ]);

    // Update portfolio with actual SOL price if available
    const portfolio = portfolioData && priceData ? {
      ...portfolioData,
      solUsdValue: portfolioData.solBalance * priceData.price,
      totalUsdValue: portfolioData.solBalance * priceData.price,
    } : portfolioData;

    // Build real-time context
    let realTimeContext = '\n\n=== REAL-TIME DATA (Current as of ' + new Date().toISOString() + ') ===\n\n';

    if (priceData) {
      realTimeContext += `📊 **SOLANA (SOL)**\n`;
      realTimeContext += `• Price: ${formatCurrency(priceData.price)}\n`;
      realTimeContext += `• 24h: ${priceData.change24h >= 0 ? '🟢 +' : '🔴 '}${priceData.change24h.toFixed(2)}%\n`;
      realTimeContext += `• Volume: ${formatNumber(priceData.volume24h)}\n`;
      realTimeContext += `• Market Cap: ${formatNumber(priceData.marketCap)}\n\n`;
    }


    if (portfolio) {
      realTimeContext += `👛 **YOUR PORTFOLIO** (${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)})\n`;
      realTimeContext += `• SOL: ${portfolio.solBalance.toFixed(4)} SOL (${formatCurrency(portfolio.solUsdValue)})\n`;
      realTimeContext += `• Total Value: **${formatCurrency(portfolio.totalUsdValue)}**\n`;
      realTimeContext += `• Tokens Held: ${portfolio.tokenCount}\n`;
      if (portfolio.tokens.length > 0) {
        realTimeContext += `• Top Holdings:\n`;
        portfolio.tokens.slice(0, 5).forEach((t: any) => {
          realTimeContext += `  - ${t.symbol}: ${t.balance.toFixed(4)}\n`;
        });
      }
      realTimeContext += '\n';
    }

    if (specificToken) {
      realTimeContext += `🔍 **${specificToken.symbol} TOKEN INFO**\n`;
      realTimeContext += `• Name: ${specificToken.name}\n`;
      realTimeContext += `• Price: $${specificToken.price}\n`;
      realTimeContext += `• 24h Change: ${specificToken.change24h >= 0 ? '+' : ''}${specificToken.change24h?.toFixed(2)}%\n`;
      realTimeContext += `• 24h Volume: ${formatNumber(specificToken.volume24h || 0)}\n`;
      realTimeContext += `• Liquidity: ${formatNumber(specificToken.liquidity || 0)}\n`;
      realTimeContext += `• FDV: ${formatNumber(specificToken.fdv || 0)}\n`;
      realTimeContext += `• Address: ${specificToken.address}\n\n`;
    }

    if (trendingTokens && trendingTokens.length > 0) {
      realTimeContext += `🔥 **TRENDING SOLANA TOKENS**\n`;
      trendingTokens.forEach((t: any) => {
        realTimeContext += `• ${t.symbol}: ${formatCurrency(t.price)} (${t.change24h >= 0 ? '+' : ''}${t.change24h?.toFixed(2)}%)\n`;
      });
      realTimeContext += '\n';
    }

    if (transactions && transactions.length > 0) {
      realTimeContext += `📜 **RECENT TRANSACTIONS** (Last ${transactions.length})\n`;
      transactions.forEach((tx: any, i: number) => {
        realTimeContext += `${i + 1}. ${tx.success ? '✅' : '❌'} ${tx.signature} - ${tx.time}\n`;
      });
      realTimeContext += `\nView full details on Solscan: https://solscan.io/account/${walletAddress}\n\n`;
    }

    realTimeContext += '=== END OF REAL-TIME DATA ===';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + realTimeContext },
        ...messages.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ message: responseMessage });
  } catch (error: any) {
    console.error('OpenAI API error:', error);

    if (error?.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 401 });
    }

    if (error?.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Failed to get response from AI' }, { status: 500 });
  }
}
