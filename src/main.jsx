import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from './config/wagmi';
import ErrorBoundary from './components/ErrorBoundary';
import RiskDisclaimer from './components/RiskDisclaimer';
import App from './App';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once to avoid hammering dead RPC
      staleTime: 10000,
      throwOnError: false, // CRITICAL: Never throw - prevents ErrorBoundary crashes
      refetchOnWindowFocus: false, // Reduce RPC calls
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RiskDisclaimer />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#4a9eff',
              accentColorForeground: '#0a0a0a',
              borderRadius: 'small',
              fontStack: 'system',
            })}
            modalSize="compact"
          >
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


