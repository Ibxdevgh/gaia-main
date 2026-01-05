import { NextRequest, NextResponse } from 'next/server';

// Fetch NFTs for a wallet using Helius API (free tier available)
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

    // Use Helius API for NFT data (or fallback to simulated data)
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (heliusApiKey) {
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${address}/nfts?api-key=${heliusApiKey}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const nfts = await response.json();
        return NextResponse.json({
          nfts: nfts.map((nft: any) => ({
            mint: nft.mint,
            name: nft.name || 'Unknown NFT',
            symbol: nft.symbol || '',
            image: nft.image || nft.cached_image_uri || '',
            collection: nft.collection?.name || 'Unknown Collection',
            collectionAddress: nft.collection?.address,
            attributes: nft.attributes || [],
            description: nft.description || '',
          })),
          total: nfts.length,
        });
      }
    }

    // Fallback: Use Magic Eden API for basic NFT data
    const meResponse = await fetch(
      `https://api-mainnet.magiceden.dev/v2/wallets/${address}/tokens?offset=0&limit=50&listStatus=both`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }
    );

    if (meResponse.ok) {
      const data = await meResponse.json();
      return NextResponse.json({
        nfts: data.map((item: any) => ({
          mint: item.mintAddress,
          name: item.name || 'Unknown NFT',
          symbol: item.symbol || '',
          image: item.image || '',
          collection: item.collection || 'Unknown Collection',
          collectionAddress: item.collectionAddress,
          listPrice: item.listPrice ? item.listPrice / 1e9 : null,
          attributes: [],
        })),
        total: data.length,
        source: 'magiceden',
      });
    }

    // If all APIs fail, return empty
    return NextResponse.json({
      nfts: [],
      total: 0,
      message: 'Unable to fetch NFTs. Please ensure you have NFTs in this wallet.',
    });
  } catch (error: any) {
    console.error('NFT API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch NFTs' },
      { status: 500 }
    );
  }
}
