import { CdpClient } from "@coinbase/cdp-sdk";

export default async function handler(request, response) {
  // CORS configuration
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { address } = request.body;

    if (!address) {
      return response.status(400).json({ error: 'Wallet address is required' });
    }

    // Initialize CDP Client with Environment Variables from Vercel
    // Users need to set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in Vercel
    const client = new CdpClient({
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in secret
    });

    console.log(`Requesting faucet for: ${address}`);

    // Request ETH from Base Sepolia Faucet
    const faucetTx = await client.requestFaucet({
      assetId: 'eth',
      networkId: 'base-sepolia',
      destinationAddress: address
    });

    // Wait for the transaction to be confirmed (optional, but good for UI)
    // The SDK returns the transaction object immediately.
    
    // Note: The SDK might return a generator or a promise depending on version, 
    // but typically requestFaucet returns a FaucetTransaction.
    const txHash = faucetTx.transactionHash;

    return response.status(200).json({
      success: true,
      message: 'Funds sent successfully',
      txHash: txHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`
    });

  } catch (error) {
    console.error('Faucet Error:', error);
    
    // Handle specific CDP errors if known, otherwise generic
    const errorMessage = error.message || 'Failed to request funds';
    
    // Check for rate limit error messages
    if (errorMessage.includes('rate limit')) {
       return response.status(429).json({ error: 'Faucet rate limit reached. Please try again later.' });
    }

    return response.status(500).json({ error: errorMessage });
  }
}
