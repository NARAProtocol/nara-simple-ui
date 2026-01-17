import { CdpClient } from "@coinbase/cdp-sdk";

export default async function handler(request, response) {
  // CORS configuration
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
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

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return response.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Initialize CDP Client with Environment Variables from Vercel
    // CDP_API_KEY_NAME = the "name" field from the JSON key file
    // CDP_API_KEY_PRIVATE_KEY = the "privateKey" field from the JSON key file
    const cdp = new CdpClient({
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });

    console.log(`Requesting faucet for: ${address}`);

    // Request ETH from Base Sepolia Faucet using the EVM namespace
    const faucetResponse = await cdp.evm.requestFaucet({
      address: address,
      network: "base-sepolia",
      token: "eth"
    });

    const txHash = faucetResponse.transactionHash;

    return response.status(200).json({
      success: true,
      message: 'Funds sent successfully',
      txHash: txHash,
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`
    });

  } catch (error) {
    console.error('Faucet Error:', error);
    
    const errorMessage = error.message || 'Failed to request funds';
    
    // Check for rate limit error messages
    if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
      return response.status(429).json({ error: 'Faucet rate limit reached. Please try again later.' });
    }

    return response.status(500).json({ error: errorMessage });
  }
}
