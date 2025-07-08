# Solana Cluster Demo

## Complete Setup and Demo

### 1. Start the Solana Cluster

```bash
# Build the project
npm run build

# Start 3-node cluster
npm run cluster:start
```

You should see output like:
```
Starting validator node 1...
Starting validator node 2...
Starting validator node 3...
P2P server listening on port 8001
P2P server listening on port 8002
P2P server listening on port 8003
HTTP API listening on port 9001
HTTP API listening on port 9002
HTTP API listening on port 9003
Validator node 1 started successfully
Validator node 2 started successfully
Validator node 3 started successfully
Block produced: abc123... with 0 transactions
Voted on block: abc123...
```

### 2. Start the Web Dashboard

In a new terminal:

```bash
# Start the web UI
npm run web:dev
```

Open your browser to `http://localhost:5173`

### 3. What You'll See

**Cluster Overview Cards:**
- Online Nodes: 3/3 (all green)
- Block Height: Increasing number
- Total Stake: 3,000,000 SOL
- Active Validators: 3

**Validator Nodes List:**
- Node 1, 2, 3 with "Online" and rotating "Leader" badges
- Real-time block counts, peer connections, PoH entries

**Recent Blocks:**
- Latest blocks with transaction counts
- Block hashes and leader information
- Timestamps showing real-time production

### 4. API Testing

Test the APIs directly:

```bash
# Node status
curl http://localhost:9001/api/status

# Recent blocks
curl http://localhost:9001/api/blocks?limit=5

# Consensus info
curl http://localhost:9001/api/consensus

# Network status
curl http://localhost:9001/api/network
```

### 5. Features Demonstrated

✅ **Fixed Issues:**
- No more "Invalid message" errors
- No more "Cannot vote due to lockout constraints" errors
- Clean P2P communication between nodes
- Proper consensus voting

✅ **Working Features:**
- Real-time block production (every ~400ms)
- Leader rotation between all 3 nodes
- Cross-node voting and consensus
- HTTP APIs on all nodes
- Live web dashboard with auto-refresh
- Responsive UI with Tailwind CSS

### 6. Stopping the Demo

```bash
# Stop cluster (Ctrl+C in cluster terminal)
# Stop web UI (Ctrl+C in web terminal)
```

## Architecture Highlights

- **P2P Network**: WebSocket connections between nodes
- **Consensus**: Simplified Tower BFT with stake-weighted voting
- **PoH**: Continuous hash chain generation at ~1000 hashes/second
- **Block Production**: Leader-based with 400ms intervals
- **APIs**: Express.js HTTP endpoints for monitoring
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui