import { KeyPair } from '../keys';
import { createHash } from 'crypto';

export class SignatureUtils {
  static async signMessage(message: string | Uint8Array, keyPair: KeyPair): Promise<string> {
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    const messageHash = createHash('sha256').update(messageBytes).digest();
    const signature = await keyPair.sign(messageHash);
    return Buffer.from(signature).toString('hex');
  }

  static async verifySignature(
    message: string | Uint8Array,
    signature: string,
    publicKey: string | Uint8Array
  ): Promise<boolean> {
    try {
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message) 
        : message;
      
      const messageHash = createHash('sha256').update(messageBytes).digest();
      const signatureBytes = Buffer.from(signature, 'hex');
      const publicKeyBytes = typeof publicKey === 'string' 
        ? Buffer.from(publicKey, 'hex') 
        : publicKey;

      return await KeyPair.verify(signatureBytes, messageHash, publicKeyBytes);
    } catch {
      return false;
    }
  }

  static createMessageHash(data: unknown): string {
    const message = JSON.stringify(data);
    const hash = createHash('sha256').update(new TextEncoder().encode(message)).digest();
    return Buffer.from(hash).toString('hex');
  }
}

export { KeyPair };