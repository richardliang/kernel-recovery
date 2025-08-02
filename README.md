# ZeroDev Mainnet USDC Recovery

Transfers the full USDC balance from your ZeroDev smart account to your signer's EOA on Ethereum Mainnet (Kernel v2.4, EntryPoint 0.6).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   - `PRIVATE_KEY`: Your signer's private key
   - `ZERODEV_RPC`: Your ZeroDev Mainnet RPC URL

## Usage

```bash
npm run recover
```

This will:
1. Show your smart account address
2. Display USDC balance
3. Transfer **full balance** to your signer's EOA
4. Confirm transfer (5 second delay)

## What it does

- Transfers ALL USDC from smart account → signer's EOA
- Works only on Ethereum Mainnet
- Uses USDC contract: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

## Troubleshooting

- Ensure your ZeroDev project has Mainnet enabled
- Verify your smart account has USDC
- Check that your RPC URL is correct