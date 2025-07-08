import { ProofOfHistory } from '../../core/poh';
import { SimplifiedConsensus } from '../../core/consensus';
import { BlockProducer } from '../../core/block';
import { TransactionProcessor } from '../../core/transaction';
import { P2PNetwork } from '../../network/p2p';
import { KeyPair } from '../../crypto';
import { NodeConfig, ValidatorInfo, Block, Transaction, Vote, NetworkMessage } from '../../types';
import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';

export class ValidatorNode {
  private config: NodeConfig;
  private poh: ProofOfHistory;
  private consensus: SimplifiedConsensus;
  private blockProducer: BlockProducer;
  private transactionProcessor: TransactionProcessor;
  private network: P2PNetwork;
  private isRunning: boolean;
  private leaderSchedule: string[];
  private blockProductionInterval: NodeJS.Timeout | null;
  private expectedValidatorCount: number;
  private isReadyForConsensus: boolean;
  private httpServer: express.Application;
  private httpPort: number;
  private wsServer: WebSocket.Server | null;
  private wsPort: number;
  private wsClients: Set<WebSocket>;

  private keyPair: KeyPair | null = null;

  constructor(config: NodeConfig) {
    this.config = config;
    
    this.poh = new ProofOfHistory();
    this.consensus = new SimplifiedConsensus();
    this.blockProducer = new BlockProducer();
    this.transactionProcessor = new TransactionProcessor();
    this.network = new P2PNetwork(config.nodeId, config.port);
    this.isRunning = false;
    this.leaderSchedule = [];
    this.blockProductionInterval = null;
    this.expectedValidatorCount = 3; // We expect 3 validators in our cluster
    this.isReadyForConsensus = false;
    this.httpPort = config.port + 1000; // HTTP API on port + 1000
    this.wsPort = config.port + 2000; // WebSocket on port + 2000
    this.httpServer = express();
    this.wsServer = null;
    this.wsClients = new Set();

    this.setupNetworkHandlers();
    this.setupHttpApi();
    this.setupWebSocketServer();
  }

  private initializeKeyPair(): void {
    this.keyPair = this.config.privateKey 
      ? KeyPair.fromPrivateKey(this.config.privateKey)
      : KeyPair.generate();
  }

  private setupValidator(): void {
    if (!this.keyPair) {
      this.initializeKeyPair();
    }
    
    if (this.config.isValidator && this.keyPair) {
      const validatorInfo: ValidatorInfo = {
        publicKey: this.keyPair.publicKeyString,
        stake: this.config.stake,
        address: 'localhost',
        port: this.config.port,
        isActive: true
      };
      
      this.consensus.addValidator(validatorInfo);
    }
  }



  private setupNetworkHandlers(): void {
    this.network.onMessage('block', this.handleBlockMessage.bind(this));
    this.network.onMessage('transaction', this.handleTransactionMessage.bind(this));
    this.network.onMessage('vote', this.handleVoteMessage.bind(this));
    this.network.onMessage('gossip', this.handleGossipMessage.bind(this));
    this.network.onMessage('validator_info', this.handleValidatorInfoMessage.bind(this));
  }

  async start(): Promise<void> {
    console.log(`Starting validator node ${this.config.nodeId}...`);
    
    this.initializeKeyPair();
    this.setupValidator();
    
    await this.network.start();
    this.poh.start();
    this.startHttpApi();
    this.startWebSocketServer();
    
    await this.connectToPeers();
    
    if (this.config.isValidator) {
      // Wait for all validators to be discovered before starting block production
      this.waitForConsensusReady();
    }
    
    this.isRunning = true;
    console.log(`Validator node ${this.config.nodeId} started successfully`);
  }

  stop(): void {
    console.log(`Stopping validator node ${this.config.nodeId}...`);
    
    this.isRunning = false;
    this.poh.stop();
    this.network.stop();
    this.stopHttpApi();
    this.stopWebSocketServer();
    
    if (this.blockProductionInterval) {
      clearInterval(this.blockProductionInterval);
      this.blockProductionInterval = null;
    }
    
    console.log(`Validator node ${this.config.nodeId} stopped`);
  }

  private async connectToPeers(): Promise<void> {
    for (const peer of this.config.peers) {
      try {
        const [address, port] = peer.split(':');
        await this.network.connectToPeer(address, parseInt(port), `peer-${address}-${port}`);
      } catch (error) {
        console.error(`Failed to connect to peer ${peer}:`, error);
      }
    }
    
    // After all connections are established, broadcast our validator info once
    if (this.keyPair && this.config.isValidator) {
      // Add a small delay to prevent simultaneous broadcasts
      setTimeout(async () => {
        const validatorInfo: ValidatorInfo = {
          publicKey: this.keyPair!.publicKeyString,
          stake: this.config.stake,
          address: 'localhost',
          port: this.config.port,
          isActive: true
        };
        
        await this.network.broadcast('validator_info', validatorInfo, this.keyPair!.privateKeyString);
        
        // Also send all known validators to all peers (for nodes that connect later)
        setTimeout(async () => {
          const knownValidators = this.consensus.getActiveValidators();
          for (const validator of knownValidators) {
            if (validator.publicKey !== this.keyPair!.publicKeyString) {
              await this.network.broadcast('validator_info', validator, this.keyPair!.privateKeyString);
            }
          }
        }, 500); // Send known validators after initial exchange
      }, parseInt(this.config.nodeId) * 100); // Stagger broadcasts by node ID
    }
  }

  private waitForConsensusReady(): void {
    console.log(`Waiting for all ${this.expectedValidatorCount} validators to be discovered...`);
    
    // Check every 500ms if we're ready for consensus
    const checkInterval = setInterval(() => {
      if (this.isReadyForConsensus) {
        clearInterval(checkInterval);
        console.log('All validators discovered. Starting block production...');
        this.startBlockProduction();
      }
    }, 500);
    
    // Timeout after 10 seconds and start anyway
    setTimeout(() => {
      if (!this.isReadyForConsensus) {
        clearInterval(checkInterval);
        console.log('Timeout waiting for validators. Starting block production with current validators...');
        this.isReadyForConsensus = true;
        this.startBlockProduction();
      }
    }, 10000);
  }

  private checkConsensusReadiness(): void {
    const activeValidators = this.consensus.getActiveValidators();
    if (activeValidators.length >= this.expectedValidatorCount && !this.isReadyForConsensus) {
      this.isReadyForConsensus = true;
      
      // Update leader schedule with all validators
      this.updateLeaderSchedule();
      
      console.log(`Consensus ready: ${activeValidators.length}/${this.expectedValidatorCount} validators discovered`);
      console.log(`Leader schedule: ${this.leaderSchedule.map(pk => pk.substring(0, 8)).join(', ')}`);
      console.log(`Initial leader: ${this.getCurrentLeader()?.substring(0, 8) || 'none'}`);
    }
  }

  private startBlockProduction(): void {
    if (this.blockProductionInterval) {
      clearInterval(this.blockProductionInterval);
    }
    
    // Add a small delay to ensure all nodes have synchronized their leader schedules
    setTimeout(() => {
      console.log(`Starting block production. Am I leader? ${this.isCurrentLeader()}`);
      
      this.blockProductionInterval = setInterval(async () => {
        if (this.isReadyForConsensus && this.isCurrentLeader()) {
          await this.produceBlock();
        }
      }, 400);
    }, 1000); // 1 second delay to ensure synchronization
  }

  private getCurrentLeader(): string | null {
    return this.consensus.getCurrentLeader();
  }

  private isCurrentLeader(): boolean {
    const currentLeader = this.getCurrentLeader();
    const isLeader = this.keyPair ? currentLeader === this.keyPair.publicKeyString : false;
    
    if (this.keyPair) {
      const currentSlot = this.consensus.getConsensusState().currentSlot;
      const currentEpoch = this.consensus.getConsensusState().currentEpoch;
      const epochInfo = this.consensus.getEpochInfo();
      
      console.log(`Node ${this.config.nodeId}: epoch=${currentEpoch}, slot=${currentSlot} (${epochInfo.slot}/${epochInfo.slotsInEpoch}), currentLeader=${currentLeader?.substring(0, 8)}, myKey=${this.keyPair.publicKeyString.substring(0, 8)}, isLeader=${isLeader}`);
    }
    
    return isLeader;
  }

  private updateLeaderSchedule(): void {
    const validators = this.consensus.getActiveValidators();
    // Sort validators by public key to ensure deterministic order across all nodes
    const newSchedule = validators
      .map(v => v.publicKey)
      .sort();
    
    if (newSchedule.length === 0 && this.keyPair) {
      this.leaderSchedule = [this.keyPair.publicKeyString];
    } else {
      this.leaderSchedule = newSchedule;
    }
    
    // Log the leader schedule for debugging
    if (this.leaderSchedule.length > 0) {
      console.log(`Node ${this.config.nodeId} leader schedule: [${this.leaderSchedule.map(pk => pk.substring(0, 8)).join(', ')}]`);
    }
  }

  private async produceBlock(): Promise<void> {
    try {
      if (!this.keyPair) return;
      
      const transactions = this.transactionProcessor.getTransactionPool();
      const validTransactions = await this.transactionProcessor.processTransactionBatch(transactions);
      
      const pohEntry = this.poh.getLatestEntry();
      if (!pohEntry) return;

      // Get the next slot number
      const nextSlot = this.consensus.getConsensusState().currentSlot + 1;
      const nextEpoch = this.consensus.getEpochFromSlot(nextSlot);
      
      const block = await this.blockProducer.createBlock(
        validTransactions,
        pohEntry.hash,
        pohEntry.count,
        this.keyPair.publicKeyString,
        this.keyPair.privateKeyString,
        nextSlot,
        nextEpoch
      );

      const isValid = await this.blockProducer.validateBlock(block);
      if (isValid) {
        this.blockProducer.addBlock(block);
        this.consensus.addBlock(block); // Add block to consensus for epoch tracking
        this.transactionProcessor.clearProcessedFromPool(validTransactions);
        
        const pohEvent = this.poh.createEvent('block', block.hash);
        this.poh.addEvent(pohEvent);
        
        await this.network.broadcast('block', block, this.keyPair.privateKeyString);
        
        // Don't vote on your own blocks to avoid lockout issues
        
        // Update consensus slot to the block's slot (this may trigger epoch transition)
        this.consensus.updateSlot(block.slot);
        
        console.log(`Block produced: ${block.hash.substring(0, 8)}... with ${validTransactions.length} transactions`);
        
        // Broadcast new block to WebSocket clients
        this.broadcastToClients({
          type: 'new_block',
          data: {
            block,
            status: this.getStatus(),
            consensus: {
              ...this.consensus.getStats(),
              validators: this.consensus.getActiveValidators(),
              leaderSchedule: this.leaderSchedule,
              currentLeader: this.getCurrentLeader(),
              isCurrentLeader: this.isCurrentLeader()
            }
          }
        });
      }
    } catch (error) {
      console.error('Error producing block:', error);
    }
  }

  private async voteOnBlock(block: Block): Promise<void> {
    try {
      if (!this.keyPair) return;
      
      const vote = await this.consensus.createVote(
        block.hash,
        this.keyPair.publicKeyString,
        this.keyPair.privateKeyString
      );
      
      this.consensus.addVote(vote);
      await this.network.broadcast('vote', vote, this.keyPair.privateKeyString);
      
      console.log(`Voted on block: ${block.hash.substring(0, 8)}...`);
      
      // Broadcast vote to WebSocket clients
      this.broadcastToClients({
        type: 'new_vote',
        data: {
          vote,
          blockHash: block.hash
        }
      });
    } catch (error) {
      console.error('Error voting on block:', error);
    }
  }



  private async handleBlockMessage(message: NetworkMessage, senderId: string): Promise<void> {
    try {
      const block = message.data as Block;
      console.log(`Node ${this.config.nodeId}: Received block message from ${senderId}, block slot=${block.slot}, hash=${block.hash.substring(0, 8)}`);
      const isValid = await this.blockProducer.validateBlock(block);
      
      if (isValid) {
        this.blockProducer.addBlock(block);
        this.consensus.addBlock(block); // Add block to consensus for epoch tracking
        
        const pohEvent = this.poh.createEvent('block', block.hash);
        this.poh.addEvent(pohEvent);
        
        // Synchronize to the block's slot number (this may trigger epoch transition)
        const oldSlot = this.consensus.getConsensusState().currentSlot;
        this.consensus.updateSlot(block.slot);
        console.log(`Node ${this.config.nodeId}: Received block from ${senderId}, slot updated from ${oldSlot} to ${block.slot}`);
        
        // Vote on blocks from other validators
        if (this.config.isValidator && this.keyPair && block.leader !== this.keyPair.publicKeyString) {
          await this.voteOnBlock(block);
        }
        
        // Relay blocks to ensure all nodes receive them (only Node 1 relays to prevent loops)
        if (this.config.nodeId === '1' && this.keyPair) {
          const connectedPeers = this.network.getConnectedPeers();
          for (const peerId of connectedPeers) {
            if (peerId !== senderId) {
              try {
                await this.network.sendToPeer(peerId, 'block', block, this.keyPair.privateKeyString);
                console.log(`Node 1 relayed block ${block.hash.substring(0, 8)}... from ${senderId} to ${peerId}`);
              } catch (error) {
                // Ignore relay errors
              }
            }
          }
        }
        
        console.log(`Received and validated block: ${block.hash.substring(0, 8)}... from ${senderId}`);
        
        // Broadcast received block to WebSocket clients
        this.broadcastToClients({
          type: 'new_block',
          data: {
            block,
            status: this.getStatus(),
            consensus: {
              ...this.consensus.getStats(),
              validators: this.consensus.getActiveValidators(),
              leaderSchedule: this.leaderSchedule,
              currentLeader: this.getCurrentLeader(),
              isCurrentLeader: this.isCurrentLeader()
            }
          }
        });
      }
    } catch (error) {
      console.error('Error handling block message:', error);
    }
  }

  private async handleTransactionMessage(message: NetworkMessage, senderId: string): Promise<void> {
    try {
      const transaction = message.data as Transaction;
      const isValid = await this.transactionProcessor.validateTransaction(transaction);
      
      if (isValid) {
        this.transactionProcessor.addToPool(transaction);
        
        const pohEvent = this.poh.createEvent('transaction', transaction.signature);
        this.poh.addEvent(pohEvent);
        
        console.log(`Received transaction: ${transaction.signature.substring(0, 8)}... from ${senderId}`);
      }
    } catch (error) {
      console.error('Error handling transaction message:', error);
    }
  }

  private async handleVoteMessage(message: NetworkMessage, senderId: string): Promise<void> {
    try {
      const vote = message.data as Vote;
      const isValid = await this.consensus.validateVote(vote);
      
      if (isValid) {
        this.consensus.addVote(vote);
        console.log(`Received vote from ${vote.validator.substring(0, 8)}... for block ${vote.blockHash.substring(0, 8)}...`);
        
        // Broadcast received vote to WebSocket clients
        this.broadcastToClients({
          type: 'new_vote',
          data: {
            vote,
            blockHash: vote.blockHash
          }
        });
      }
    } catch (error) {
      console.error('Error handling vote message:', error);
    }
  }

  private handleGossipMessage(message: NetworkMessage, senderId: string): void {
    console.log(`Received gossip message from ${senderId}`);
  }

  private async handleValidatorInfoMessage(message: NetworkMessage, senderId: string): Promise<void> {
    try {
      const validatorInfo = message.data as ValidatorInfo;
      
      // Check if we already know about this validator
      const existingValidators = this.consensus.getActiveValidators();
      const alreadyKnown = existingValidators.some(v => v.publicKey === validatorInfo.publicKey);
      
      if (!alreadyKnown) {
        // Add the validator to our consensus
      this.consensus.addValidator(validatorInfo);
      this.checkConsensusReadiness();        
        // Update our leader schedule
        this.updateLeaderSchedule();
        
        console.log(`Added validator: ${validatorInfo.publicKey.substring(0, 8)}... from ${senderId}`);
        
        // Check if we have all expected validators
        this.checkConsensusReadiness();
        
        // Respond with our own validator info only once per peer
        if (this.keyPair && this.config.isValidator && validatorInfo.publicKey !== this.keyPair.publicKeyString) {
          const ourValidatorInfo: ValidatorInfo = {
            publicKey: this.keyPair.publicKeyString,
            stake: this.config.stake,
            address: 'localhost',
            port: this.config.port,
            isActive: true
          };
          
          await this.network.sendToPeer(senderId, 'validator_info', ourValidatorInfo, this.keyPair.privateKeyString);
        }
        

      }
    } catch (error) {
      console.error('Error handling validator info message:', error);
    }
  }

  async submitTransaction(transaction: Transaction): Promise<void> {
    if (!this.keyPair) throw new Error('Node not initialized');
    
    const isValid = await this.transactionProcessor.validateTransaction(transaction);
    if (isValid) {
      this.transactionProcessor.addToPool(transaction);
      await this.network.broadcast('transaction', transaction, this.keyPair.privateKeyString);
    } else {
      throw new Error('Invalid transaction');
    }
  }

  getStatus() {
    return {
      nodeId: this.config.nodeId,
      publicKey: this.keyPair?.publicKeyString || 'not-initialized',
      isRunning: this.isRunning,
      isValidator: this.config.isValidator,
      blockHeight: this.blockProducer.getBlockHeight(),
      poh: this.poh.getStats(),
      consensus: this.consensus.getStats(),
      network: this.network.getStats(),
      transactions: this.transactionProcessor.getStats(),
      isLeader: this.isCurrentLeader()
    };
  }

  getBlockchain(): Block[] {
    return this.blockProducer.getBlockchain();
  }

  getAccount(publicKey: string) {
    return this.transactionProcessor.getAccount(publicKey);
  }

  createAccount(publicKey: string, initialBalance: number = 0) {
    return this.transactionProcessor.createAccount(publicKey, initialBalance);
  }

  private setupHttpApi(): void {
    this.httpServer.use(cors());
    this.httpServer.use(express.json());

    // Get node status
    this.httpServer.get('/api/status', (req, res) => {
      res.json(this.getStatus());
    });

    // Get blockchain
    this.httpServer.get('/api/blockchain', (req, res) => {
      const blockchain = this.getBlockchain();
      res.json({
        blocks: blockchain,
        height: blockchain.length,
        latestBlock: blockchain[blockchain.length - 1] || null
      });
    });

    // Get recent blocks with limit
    this.httpServer.get('/api/blocks', (req, res) => {
      const limit = parseInt(req.query['limit'] as string) || 10;
      const blockchain = this.getBlockchain();
      const recentBlocks = blockchain.slice(-limit).reverse().map(block => ({
        ...block,
        votes: this.consensus.getVotesForBlock(block.hash)
      }));
      res.json(recentBlocks);
    });

    // Get votes for a specific block
    this.httpServer.get('/api/block/:hash/votes', (req, res) => {
      const votes = this.consensus.getVotesForBlock(req.params.hash);
      res.json(votes);
    });

    // Get specific block by hash
    this.httpServer.get('/api/block/:hash', (req, res) => {
      const blockchain = this.getBlockchain();
      const block = blockchain.find(b => b.hash === req.params.hash);
      if (block) {
        const votes = this.consensus.getVotesForBlock(block.hash);
        res.json({
          ...block,
          votes
        });
      } else {
        res.status(404).json({ error: 'Block not found' });
      }
    });

    // Get consensus info
    this.httpServer.get('/api/consensus', (req, res) => {
      const leaderSchedule = this.consensus.getLeaderSchedule();
      res.json({
        ...this.consensus.getStats(),
        validators: this.consensus.getActiveValidators(),
        leaderSchedule: leaderSchedule?.schedule || this.leaderSchedule,
        currentLeader: this.getCurrentLeader(),
        isCurrentLeader: this.isCurrentLeader()
      });
    });

    // Get epoch info
    this.httpServer.get('/api/epoch', (req, res) => {
      const epochInfo = this.consensus.getEpochInfo();
      const leaderSchedule = this.consensus.getLeaderSchedule();
      res.json({
        ...epochInfo,
        leaderSchedule: leaderSchedule?.schedule || [],
        leaderScheduleSeed: leaderSchedule?.seed || 'genesis',
        finalHash: this.consensus.getConsensusState().epochFinalHash
      });
    });

    // Get leader schedule for specific epoch
    this.httpServer.get('/api/epoch/:epoch/schedule', (req, res) => {
      const epoch = parseInt(req.params.epoch);
      const leaderSchedule = this.consensus.getLeaderSchedule(epoch);
      if (leaderSchedule) {
        res.json(leaderSchedule);
      } else {
        res.status(404).json({ error: 'Leader schedule not found for epoch' });
      }
    });

    // Get network info
    this.httpServer.get('/api/network', (req, res) => {
      res.json({
        ...this.network.getStats(),
        connectedPeers: this.network.getConnectedPeers()
      });
    });

    // Get PoH info
    this.httpServer.get('/api/poh', (req, res) => {
      res.json({
        ...this.poh.getStats(),
        latestEntry: this.poh.getLatestEntry()
      });
    });

    // Get cluster overview
    this.httpServer.get('/api/cluster', (req, res) => {
      res.json({
        nodeId: this.config.nodeId,
        status: this.getStatus(),
        consensus: this.consensus.getStats(),
        network: this.network.getStats(),
        blockchain: {
          height: this.blockProducer.getBlockHeight(),
          latestBlock: this.getBlockchain().slice(-1)[0] || null
        }
      });
    });
  }

  startHttpApi(): void {
    this.httpServer.listen(this.httpPort, () => {
      console.log(`HTTP API listening on port ${this.httpPort}`);
    });
  }

  stopHttpApi(): void {
    // Express doesn't have a direct stop method, but we can track the server
    console.log(`HTTP API on port ${this.httpPort} stopped`);
  }

  private setupWebSocketServer(): void {
    // WebSocket server will be created when started
  }

  private startWebSocketServer(): void {
    this.wsServer = new WebSocket.Server({ port: this.wsPort });
    
    this.wsServer.on('connection', (ws: WebSocket) => {
      console.log(`WebSocket client connected to node ${this.config.nodeId}`);
      this.wsClients.add(ws);
      
      // Send initial state
      this.sendToClient(ws, {
        type: 'initial_state',
        data: {
          status: this.getStatus(),
          blocks: this.getBlockchain().slice(-10).reverse().map(block => ({
            ...block,
            votes: this.consensus.getVotesForBlock(block.hash)
          })),
          consensus: {
            ...this.consensus.getStats(),
            validators: this.consensus.getActiveValidators(),
            leaderSchedule: this.consensus.getLeaderSchedule()?.schedule || this.leaderSchedule,
            currentLeader: this.getCurrentLeader(),
            isCurrentLeader: this.isCurrentLeader()
          }
        }
      });
      
      ws.on('close', () => {
        console.log(`WebSocket client disconnected from node ${this.config.nodeId}`);
        this.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error on node ${this.config.nodeId}:`, error);
        this.wsClients.delete(ws);
      });
    });
    
    console.log(`WebSocket server listening on port ${this.wsPort}`);
  }

  private stopWebSocketServer(): void {
    if (this.wsServer) {
      this.wsClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      this.wsClients.clear();
      this.wsServer.close();
      this.wsServer = null;
      console.log(`WebSocket server on port ${this.wsPort} stopped`);
    }
  }

  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToClients(message: any): void {
    this.wsClients.forEach(ws => {
      this.sendToClient(ws, message);
    });
  }
}

if (require.main === module) {
  const nodeId = process.env['NODE_ID'] || '1';
  const port = parseInt(process.env['PORT'] || '8001');
  
  const config: NodeConfig = {
    nodeId,
    port,
    peers: [],
    isValidator: true,
    stake: 1000000
  };

  if (nodeId !== '1') {
    config.peers = ['localhost:8001'];
  }

  const validator = new ValidatorNode(config);
  
  validator.start().catch(console.error);
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    validator.stop();
    process.exit(0);
  });
}