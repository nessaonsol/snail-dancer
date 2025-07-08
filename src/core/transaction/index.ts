import { Transaction, Account } from '../../types';
import { SignatureUtils, KeyPair } from '../../crypto';

export class TransactionProcessor {
  private accounts: Map<string, Account>;
  private transactionPool: Transaction[];
  private processedTransactions: Set<string>;

  constructor() {
    this.accounts = new Map();
    this.transactionPool = [];
    this.processedTransactions = new Set();
  }

  createAccount(publicKey: string, initialBalance: number = 0): Account {
    const account: Account = {
      publicKey,
      balance: initialBalance,
      nonce: 0
    };
    
    this.accounts.set(publicKey, account);
    return account;
  }

  getAccount(publicKey: string): Account | null {
    return this.accounts.get(publicKey) || null;
  }

  async createTransaction(
    from: string,
    to: string,
    amount: number,
    fee: number,
    privateKey: string
  ): Promise<Transaction> {
    const fromAccount = this.getAccount(from);
    if (!fromAccount) {
      throw new Error('From account not found');
    }

    const transaction: Omit<Transaction, 'signature'> = {
      from,
      to,
      amount,
      fee,
      timestamp: Date.now(),
      nonce: fromAccount.nonce + 1
    };

    const keyPair = KeyPair.fromPrivateKey(privateKey);
    const signature = await SignatureUtils.signMessage(
      JSON.stringify(transaction),
      keyPair
    );

    return {
      ...transaction,
      signature
    };
  }

  async validateTransaction(transaction: Transaction): Promise<boolean> {
    const transactionId = this.getTransactionId(transaction);
    if (this.processedTransactions.has(transactionId)) {
      return false;
    }

    const fromAccount = this.getAccount(transaction.from);
    if (!fromAccount) {
      return false;
    }

    if (fromAccount.balance < transaction.amount + transaction.fee) {
      return false;
    }

    if (transaction.nonce !== fromAccount.nonce + 1) {
      return false;
    }

    const transactionData = {
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
      nonce: transaction.nonce
    };

    const isValidSignature = await SignatureUtils.verifySignature(
      JSON.stringify(transactionData),
      transaction.signature,
      transaction.from
    );

    return isValidSignature;
  }

  async processTransaction(transaction: Transaction): Promise<boolean> {
    const isValid = await this.validateTransaction(transaction);
    if (!isValid) {
      return false;
    }

    const fromAccount = this.getAccount(transaction.from);
    const toAccount = this.getAccount(transaction.to);

    if (!fromAccount) {
      return false;
    }

    if (!toAccount) {
      this.createAccount(transaction.to, 0);
    }

    fromAccount.balance -= (transaction.amount + transaction.fee);
    fromAccount.nonce = transaction.nonce;

    const updatedToAccount = this.getAccount(transaction.to)!;
    updatedToAccount.balance += transaction.amount;

    const transactionId = this.getTransactionId(transaction);
    this.processedTransactions.add(transactionId);

    return true;
  }

  addToPool(transaction: Transaction): void {
    const transactionId = this.getTransactionId(transaction);
    if (!this.processedTransactions.has(transactionId)) {
      this.transactionPool.push(transaction);
    }
  }

  getTransactionPool(): Transaction[] {
    return [...this.transactionPool];
  }

  clearProcessedFromPool(processedTransactions: Transaction[]): void {
    const processedIds = new Set(processedTransactions.map(tx => this.getTransactionId(tx)));
    this.transactionPool = this.transactionPool.filter(tx => 
      !processedIds.has(this.getTransactionId(tx))
    );
  }

  private getTransactionId(transaction: Transaction): string {
    return `${transaction.from}-${transaction.to}-${transaction.nonce}-${transaction.timestamp}`;
  }

  getAccountBalance(publicKey: string): number {
    const account = this.getAccount(publicKey);
    return account ? account.balance : 0;
  }

  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  getStats() {
    return {
      totalAccounts: this.accounts.size,
      poolSize: this.transactionPool.length,
      processedTransactions: this.processedTransactions.size
    };
  }

  async processTransactionBatch(transactions: Transaction[]): Promise<Transaction[]> {
    const processed: Transaction[] = [];
    
    for (const transaction of transactions) {
      const success = await this.processTransaction(transaction);
      if (success) {
        processed.push(transaction);
      }
    }
    
    return processed;
  }
}