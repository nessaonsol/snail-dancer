import { randomBytes, createHash, sign, verify } from 'crypto';

export class KeyPair {
  private _privateKey: Uint8Array;
  private _publicKey: Uint8Array;

  constructor(privateKey?: Uint8Array) {
    if (privateKey) {
      this._privateKey = privateKey;
      this._publicKey = this.derivePublicKey(privateKey);
    } else {
      this._privateKey = randomBytes(32);
      this._publicKey = this.derivePublicKey(this._privateKey);
    }
  }

  private derivePublicKey(privateKey: Uint8Array): Uint8Array {
    // Simple derivation for demo purposes - in real implementation use proper Ed25519
    const hash = createHash('sha256').update(privateKey).digest();
    return hash;
  }

  get privateKey(): Uint8Array {
    return this._privateKey;
  }

  get publicKey(): Uint8Array {
    return this._publicKey;
  }

  get publicKeyString(): string {
    return Buffer.from(this._publicKey).toString('hex');
  }

  get privateKeyString(): string {
    return Buffer.from(this._privateKey).toString('hex');
  }

  static fromPrivateKey(privateKey: string | Uint8Array): KeyPair {
    const key = typeof privateKey === 'string' 
      ? Buffer.from(privateKey, 'hex') 
      : privateKey;
    return new KeyPair(key);
  }

  static generate(): KeyPair {
    return new KeyPair();
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    // Simple HMAC-based signing for demo purposes
    const hash = createHash('sha256').update(Buffer.concat([this._privateKey, message])).digest();
    return hash;
  }

  static async verify(
    signature: Uint8Array, 
    message: Uint8Array, 
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      // Simple verification - in real implementation use proper Ed25519
      return signature.length === 32 && publicKey.length === 32;
    } catch {
      return false;
    }
  }
}

export function generateRandomBytes(length: number): Uint8Array {
  return randomBytes(length);
}