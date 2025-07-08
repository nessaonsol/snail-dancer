import WebSocket from 'ws';
import { NetworkMessage, ValidatorInfo } from '../../types';
import { SignatureUtils, KeyPair } from '../../crypto';

export class P2PNetwork {
  private server: WebSocket.Server | null;
  private connections: Map<string, WebSocket>;
  private nodeId: string;
  private port: number;
  private peers: ValidatorInfo[];
  private messageHandlers: Map<string, (message: NetworkMessage, senderId: string) => void>;

  constructor(nodeId: string, port: number) {
    this.server = null;
    this.connections = new Map();
    this.nodeId = nodeId;
    this.port = port;
    this.peers = [];
    this.messageHandlers = new Map();
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = new WebSocket.Server({ port: this.port });
        
        this.server.on('connection', (ws: WebSocket, req) => {
          const clientId = req.headers['x-node-id'] as string || `unknown-${Date.now()}`;
          this.handleNewConnection(ws, clientId);
        });

        this.server.on('listening', () => {
          console.log(`P2P server listening on port ${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    this.connections.clear();
  }

  private handleNewConnection(ws: WebSocket, clientId: string): void {
    this.connections.set(clientId, ws);
    
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: NetworkMessage = JSON.parse(data.toString());
        await this.handleMessage(message, clientId);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      this.connections.delete(clientId);
      console.log(`Peer ${clientId} disconnected`);
    });

    ws.on('error', (error) => {
      console.error(`Connection error with ${clientId}:`, error);
      this.connections.delete(clientId);
    });

    console.log(`New peer connected: ${clientId}`);
  }

  async connectToPeer(address: string, port: number, peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${address}:${port}`, {
        headers: {
          'x-node-id': this.nodeId
        }
      });

      ws.on('open', () => {
        this.connections.set(peerId, ws);
        console.log(`Connected to peer: ${peerId} at ${address}:${port}`);
        resolve();
      });

      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message: NetworkMessage = JSON.parse(data.toString());
          await this.handleMessage(message, peerId);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.on('close', () => {
        this.connections.delete(peerId);
        console.log(`Disconnected from peer: ${peerId}`);
      });

      ws.on('error', (error) => {
        console.error(`Connection error with ${peerId}:`, error);
        reject(error);
      });
    });
  }

  private async handleMessage(message: NetworkMessage, senderId: string): Promise<void> {
    const isValid = await this.validateMessage(message);
    if (!isValid) {
      console.warn(`Invalid message from ${senderId} - type: ${message.type}, sender: ${message.sender}`);
      return;
    }

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message, senderId);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  private async validateMessage(message: NetworkMessage): Promise<boolean> {
    try {
      const messageData = {
        type: message.type,
        data: message.data,
        sender: message.sender,
        timestamp: message.timestamp
      };

      return await SignatureUtils.verifySignature(
        JSON.stringify(messageData),
        message.signature,
        message.sender
      );
    } catch {
      return false;
    }
  }

  async broadcast(type: NetworkMessage['type'], data: unknown, privateKey: string): Promise<void> {
    const message = await this.createMessage(type, data, privateKey);
    
    this.connections.forEach((ws, peerId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  async sendToPeer(
    peerId: string, 
    type: NetworkMessage['type'], 
    data: unknown, 
    privateKey: string
  ): Promise<void> {
    const connection = this.connections.get(peerId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection to peer: ${peerId}`);
    }

    const message = await this.createMessage(type, data, privateKey);
    connection.send(JSON.stringify(message));
  }

  private async createMessage(
    type: NetworkMessage['type'], 
    data: unknown, 
    privateKey: string
  ): Promise<NetworkMessage> {
    const keyPair = KeyPair.fromPrivateKey(privateKey);
    const messageData = {
      type,
      data,
      sender: keyPair.publicKeyString,
      timestamp: Date.now()
    };

    const signature = await SignatureUtils.signMessage(
      JSON.stringify(messageData),
      keyPair
    );

    return {
      ...messageData,
      signature
    };
  }

  onMessage(type: NetworkMessage['type'], handler: (message: NetworkMessage, senderId: string) => void): void {
    this.messageHandlers.set(type, handler);
  }

  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys());
  }

  isConnectedToPeer(peerId: string): boolean {
    const connection = this.connections.get(peerId);
    return connection ? connection.readyState === WebSocket.OPEN : false;
  }

  addPeer(peer: ValidatorInfo): void {
    const existingIndex = this.peers.findIndex(p => p.publicKey === peer.publicKey);
    if (existingIndex >= 0) {
      this.peers[existingIndex] = peer;
    } else {
      this.peers.push(peer);
    }
  }

  getPeers(): ValidatorInfo[] {
    return [...this.peers];
  }

  getStats() {
    return {
      nodeId: this.nodeId,
      port: this.port,
      connectedPeers: this.connections.size,
      totalPeers: this.peers.length,
      isServerRunning: this.server !== null
    };
  }
}