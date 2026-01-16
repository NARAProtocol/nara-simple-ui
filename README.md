# NARA Protocol - Web3 Interface

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Network](https://img.shields.io/badge/network-Base%20Sepolia-blue)

The official decentralized interface for the **NARA Protocol**, a gamified mining and staking ecosystem built on the Base blockchain. This application facilitates user interaction with the NARA smart contract suite, enabling mining operations, staking management, and reward claiming through a secure and responsive UI.

## 🚀 Key Features

- **Decentralized Mining**: Direct interaction with the `NARAMiner` contract for ticket-based mining.
- **Real-time Analytics**: Live tracking of epoch stats, global hashrate, and reward pools.
- **Secure Wallet Integration**: seamless connection via Wagmi & RainbowKit.
- **Responsive Design**: Mobile-first architecture optimized for all devices.
- **Robust Error Handling**: Transaction simulation and comprehensive feedback systems.

## 🛠 Tech Stack

- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Web3**: [Wagmi v2](https://wagmi.sh/) + [Viem](https://viem.sh/)
- **UI Components**: [RainbowKit](https://www.rainbowkit.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/v5)
- **Styling**: Vanilla CSS (Performance focused)

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/NARAProtocol/nara-simple-ui.git
   cd nara-simple-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**
   Copy `.env.example` to `.env` and populate with your values:

   ```bash
   cp .env.example .env
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

| Variable             | Description                              | Default                    |
| -------------------- | ---------------------------------------- | -------------------------- |
| `VITE_PROJECT_ID`    | WalletConnect/RainbowKit Project ID      | Required                   |
| `VITE_CHAIN_ID`      | Target Chain ID (84532 for Base Sepolia) | `84532`                    |
| `VITE_RPC_URL`       | RPC Endpoint URL                         | `https://sepolia.base.org` |
| `VITE_TOKEN_ADDRESS` | NARA Token Contract Address              | Contract Address           |
| `VITE_MINER_ADDRESS` | NARA Miner Contract Address              | Contract Address           |

## 🏗 Architecture

```
src/
├── components/     # Reusable UI components
├── config/         # App implementation & environment configuration
├── constants/      # Static data & contract ABIs
├── hooks/          # Custom React hooks (Web3 logic)
├── services/       # External API & Blockchain services
├── utils/          # Helper functions & formatters
└── App.jsx         # Main application entry
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
