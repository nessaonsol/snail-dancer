import { Block, Transaction } from '../../types';
import { SignatureUtils, KeyPair } from '../../crypto';
import { createHash } from 'crypto';

export class BlockProducer {
  private blockchain: Block[];
  private readonly maxTransactionsPerBlock: number;

  constructor(maxTransactionsPerBlock: number = 100) {
    this.blockchain = [];
    this.maxTransactionsPerBlock = maxTransactionsPerBlock;
  }

  async createBlock(
    transactions: Transaction[],
    pohHash: string,
    pohCount: number,
    leader: string,
    privateKey: string,
    slot: number,
    epoch: number,
    previousHash?: string
  ): Promise<Block> {
    const limitedTransactions = transactions.slice(0, this.maxTransactionsPerBlock);
    
    const blockData = {
      previousHash: previousHash || this.getLatestBlockHash(),
      pohHash,
      pohCount,
      transactions: limitedTransactions,
      timestamp: Date.now(),
      leader,
      slot,
      epoch
    };

    const hash = this.calculateBlockHash(blockData);
    const keyPair = KeyPair.fromPrivateKey(privateKey);
    const signature = await SignatureUtils.signMessage(hash, keyPair);

    const block: Block = {
      ...blockData,
      hash,
      signature
    };

    return block;
  }

  private calculateBlockHash(blockData: Omit<Block, 'hash' | 'signature'>): string {
    const dataString = JSON.stringify({
      previousHash: blockData.previousHash,
      pohHash: blockData.pohHash,
      pohCount: blockData.pohCount,
      transactions: blockData.transactions,
      timestamp: blockData.timestamp,
      leader: blockData.leader,
      slot: blockData.slot,
      epoch: blockData.epoch
    });
    
    return createHash('sha256').update(new TextEncoder().encode(dataString)).digest('hex');
  }

  async validateBlock(block: Block): Promise<boolean> {
    const expectedHash = this.calculateBlockHash({
      previousHash: block.previousHash,
      pohHash: block.pohHash,
      pohCount: block.pohCount,
      transactions: block.transactions,
      timestamp: block.timestamp,
      leader: block.leader,
      slot: block.slot,
      epoch: block.epoch
    });

    if (block.hash !== expectedHash) {
      return false;
    }

    const isValidSignature = await SignatureUtils.verifySignature(
      block.hash,
      block.signature,
      block.leader
    );

    if (!isValidSignature) {
      return false;
    }

    if (this.blockchain.length > 0) {
      const latestBlock = this.getLatestBlock();
      if (block.previousHash !== latestBlock.hash) {
        return false;
      }
    }

    if (block.transactions.length > this.maxTransactionsPerBlock) {
      return false;
    }

    return true;
  }

  addBlock(block: Block): boolean {
    if (this.blockchain.length === 0 || this.validateBlockSync(block)) {
      this.blockchain.push(block);
      return true;
    }
    return false;
  }

  private validateBlockSync(block: Block): boolean {
    const expectedHash = this.calculateBlockHash({
      previousHash: block.previousHash,
      pohHash: block.pohHash,
      pohCount: block.pohCount,
      transactions: block.transactions,
      timestamp: block.timestamp,
      leader: block.leader,
      slot: block.slot,
      epoch: block.epoch
    });

    if (block.hash !== expectedHash) {
      return false;
    }

    if (this.blockchain.length > 0) {
      const latestBlock = this.getLatestBlock();
      if (block.previousHash !== latestBlock.hash) {
        return false;
      }
    }

    return true;
  }

  getLatestBlock(): Block | null {
    return this.blockchain.length > 0 ? this.blockchain[this.blockchain.length - 1] : null;
  }

  getLatestBlockHash(): string {
    const latestBlock = this.getLatestBlock();
    return latestBlock ? latestBlock.hash : '0'.repeat(64);
  }

  getBlockchain(): Block[] {
    return [...this.blockchain];
  }

  getBlock(hash: string): Block | null {
    const block = this.blockchain.find(block => block.hash === hash);
    return block || null;
  }

  getBlockByIndex(index: number): Block | null {
    return this.blockchain[index] || null;
  }

  getBlockHeight(): number {
    return this.blockchain.length;
  }

  getBlocksFromHeight(fromHeight: number, limit?: number): Block[] {
    const startIndex = Math.max(0, fromHeight);
    const endIndex = limit ? Math.min(this.blockchain.length, startIndex + limit) : this.blockchain.length;
    
    return this.blockchain.slice(startIndex, endIndex);
  }

  async isValidChain(): Promise<boolean> {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const previousBlock = this.blockchain[i - 1];

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      const expectedHash = this.calculateBlockHash({
        previousHash: currentBlock.previousHash,
        pohHash: currentBlock.pohHash,
        pohCount: currentBlock.pohCount,
        transactions: currentBlock.transactions,
        timestamp: currentBlock.timestamp,
        leader: currentBlock.leader,
        slot: currentBlock.slot,
        epoch: currentBlock.epoch
      });

      if (currentBlock.hash !== expectedHash) {
        return false;
      }
    }

    return true;
  }

  getStats() {
    return {
      blockHeight: this.getBlockHeight(),
      latestBlockHash: this.getLatestBlockHash(),
      totalTransactions: this.blockchain.reduce((sum, block) => sum + block.transactions.length, 0),
      chainLength: this.blockchain.length
    };
  }

  createGenesisBlock(leader: string, privateKey: string): Promise<Block> {
    return this.createBlock([], '0'.repeat(64), 0, leader, privateKey, 0, 0, '0'.repeat(64));
  }
}