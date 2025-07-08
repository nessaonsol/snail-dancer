import { TransactionProcessor } from '../core/transaction';
import { KeyPair } from '../crypto';

describe('Transaction Processing', () => {
  let processor: TransactionProcessor;
  let keyPair1: KeyPair;
  let keyPair2: KeyPair;

  beforeEach(() => {
    processor = new TransactionProcessor();
    keyPair1 = KeyPair.generate();
    keyPair2 = KeyPair.generate();
  });

  test('should create and manage accounts', () => {
    const account = processor.createAccount(keyPair1.publicKeyString, 1000);
    
    expect(account.publicKey).toBe(keyPair1.publicKeyString);
    expect(account.balance).toBe(1000);
    expect(account.nonce).toBe(0);
    
    const retrieved = processor.getAccount(keyPair1.publicKeyString);
    expect(retrieved).toEqual(account);
  });

  test('should process valid transactions', async () => {
    processor.createAccount(keyPair1.publicKeyString, 1000);
    processor.createAccount(keyPair2.publicKeyString, 0);
    
    const transaction = await processor.createTransaction(
      keyPair1.publicKeyString,
      keyPair2.publicKeyString,
      500,
      10,
      keyPair1.privateKeyString
    );
    
    const isValid = await processor.validateTransaction(transaction);
    expect(isValid).toBe(true);
    
    const processed = await processor.processTransaction(transaction);
    expect(processed).toBe(true);
    
    const account1 = processor.getAccount(keyPair1.publicKeyString);
    const account2 = processor.getAccount(keyPair2.publicKeyString);
    
    expect(account1?.balance).toBe(490);
    expect(account2?.balance).toBe(500);
    expect(account1?.nonce).toBe(1);
  });

  test('should reject invalid transactions', async () => {
    processor.createAccount(keyPair1.publicKeyString, 100);
    
    const transaction = await processor.createTransaction(
      keyPair1.publicKeyString,
      keyPair2.publicKeyString,
      500,
      10,
      keyPair1.privateKeyString
    );
    
    const isValid = await processor.validateTransaction(transaction);
    expect(isValid).toBe(false);
  });

  test('should manage transaction pool', async () => {
    processor.createAccount(keyPair1.publicKeyString, 1000);
    
    const transaction = await processor.createTransaction(
      keyPair1.publicKeyString,
      keyPair2.publicKeyString,
      100,
      5,
      keyPair1.privateKeyString
    );
    
    processor.addToPool(transaction);
    
    const pool = processor.getTransactionPool();
    expect(pool).toContain(transaction);
    
    await processor.processTransaction(transaction);
    processor.clearProcessedFromPool([transaction]);
    
    const updatedPool = processor.getTransactionPool();
    expect(updatedPool).not.toContain(transaction);
  });
});