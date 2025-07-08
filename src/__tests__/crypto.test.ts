import { KeyPair, SignatureUtils } from '../crypto';

describe('Cryptographic Functions', () => {
  describe('KeyPair', () => {
    test('should generate a new key pair', () => {
      const keyPair = KeyPair.generate();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKeyString).toMatch(/^[a-f0-9]{64}$/);
      expect(keyPair.privateKeyString).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should create key pair from private key', () => {
      const keyPair1 = KeyPair.generate();
      const keyPair2 = KeyPair.fromPrivateKey(keyPair1.privateKeyString);
      
      expect(keyPair2.publicKeyString).toBe(keyPair1.publicKeyString);
      expect(keyPair2.privateKeyString).toBe(keyPair1.privateKeyString);
    });

    test('should sign and verify messages', async () => {
      const keyPair = KeyPair.generate();
      const message = new TextEncoder().encode('test message');
      
      const signature = await keyPair.sign(message);
      const isValid = await KeyPair.verify(signature, message, keyPair.publicKey);
      
      expect(isValid).toBe(true);
    });
  });

  describe('SignatureUtils', () => {
    test('should sign and verify string messages', async () => {
      const keyPair = KeyPair.generate();
      const message = 'test message';
      
      const signature = await SignatureUtils.signMessage(message, keyPair);
      const isValid = await SignatureUtils.verifySignature(message, signature, keyPair.publicKeyString);
      
      expect(isValid).toBe(true);
    });

    test('should create consistent message hashes', () => {
      const data = { test: 'data', number: 123 };
      const hash1 = SignatureUtils.createMessageHash(data);
      const hash2 = SignatureUtils.createMessageHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});