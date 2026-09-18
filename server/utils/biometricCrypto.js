import crypto from 'crypto';

const KEY = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY, 'hex');
const ALGO = 'aes-256-gcm';

export function encryptDescriptor(descriptorArray) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(descriptorArray), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptDescriptor({ ciphertext, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}