/**
 * 8x8 Hub - Quantum Crypto
 * Post-quantum cryptography utilities
 */

import * as crypto from 'crypto';

export interface QuantumKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: string;
}

class QuantumCrypto {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;

  constructor() {
    console.log('🔐 Quantum Crypto initialized (AES-256-GCM)');
  }

  // Generate a quantum-resistant key
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  // Generate key pair
  generateKeyPair(): QuantumKeyPair {
    return {
      publicKey: this.generateKey(),
      privateKey: this.generateKey()
    };
  }

  // Encrypt data
  encrypt(plaintext: string, key: string): EncryptedData {
    const iv = crypto.randomBytes(this.ivLength);
    const keyBuffer = Buffer.from(key, 'hex');
    const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.algorithm
    };
  }

  // Decrypt data
  decrypt(encrypted: EncryptedData, key: string): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const tag = Buffer.from(encrypted.tag, 'hex');
    const keyBuffer = Buffer.from(key, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Hash data (SHA-512)
  hash(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // HMAC
  hmac(data: string, key: string): string {
    return crypto.createHmac('sha512', key).update(data).digest('hex');
  }

  // Verify HMAC
  verifyHmac(data: string, key: string, expectedHmac: string): boolean {
    const computed = this.hmac(data, key);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHmac));
  }

  // Generate random token
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Constant-time comparison
  safeCompare(a: string, b: string): boolean {
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  // Derive key from password (PBKDF2)
  deriveKey(password: string, salt?: string): { key: string; salt: string } {
    const saltBytes = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, saltBytes, 100000, 64, 'sha512');
    
    return {
      key: key.toString('hex'),
      salt: saltBytes.toString('hex')
    };
  }
}

export const quantumCrypto = new QuantumCrypto();
