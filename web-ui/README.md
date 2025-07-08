# Solana Cluster Monitor

A real-time web dashboard for monitoring your local Solana blockchain cluster.

## Features

- **Cluster Overview**: Monitor online nodes, block height, total stake, and active validators
- **Node Status**: View detailed information about each validator node
- **Block Explorer**: Browse recent blocks with transaction counts and PoH data
- **Real-time Updates**: Automatically refreshes every 2 seconds
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components

## Getting Started

1. **Start the Solana cluster** (from the parent directory):
   ```bash
   npm run build
   npm run cluster:start
   ```

2. **Start the web dashboard**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:5173`

## API Endpoints

The dashboard connects to the following API endpoints on each validator node:

- `http://localhost:9001/api/status` - Node 1 status
- `http://localhost:9002/api/status` - Node 2 status  
- `http://localhost:9003/api/status` - Node 3 status

Each node also provides:
- `/api/blockchain` - Full blockchain data
- `/api/blocks?limit=10` - Recent blocks
- `/api/consensus` - Consensus information
- `/api/network` - Network status
- `/api/poh` - Proof of History data

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (with @tailwindcss/vite plugin)
- **Components**: shadcn/ui (adapted for Tailwind v4)
- **Icons**: Lucide React
- **Backend**: Express.js APIs on validator nodes

## Tailwind CSS v4 Setup

This project uses Tailwind CSS v4, which has a simplified setup:

- **No config file needed** - Tailwind v4 works without `tailwind.config.js`
- **Vite plugin** - Uses `@tailwindcss/vite` for seamless integration
- **Simple import** - Just `@import "tailwindcss";` in CSS
- **Automatic detection** - Scans all source files for class usage