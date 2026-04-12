/**
 * Server-only — matches site `api_key` encryption used when registering sites (AES-256-GCM, SHA-256 key derivation).
 */
import { createDecipheriv, createHash } from 'node:crypto';

export function decryptSiteApiKey(encryptedData: string, encryptionKey: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const derivedKey = createHash('sha256').update(String(encryptionKey), 'utf8').digest();
  const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
