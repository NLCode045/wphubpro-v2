/**
 * Server-only — decrypt site `api_key` (AES-256-GCM, same family as vault payloads). Do not import from React.
 */
import { createDecipheriv, createHash } from 'node:crypto';

import { ApiError } from '../appwrite/apiResponse';

function deriveKey(encryptionKey: string): Buffer {
  return createHash('sha256').update(encryptionKey, 'utf8').digest();
}

/** iv (12) + ciphertext + authTag (16) — common Node GCM layout. */
function tryDecryptLayoutA(buf: Buffer, keyBuf: Buffer): string | null {
  if (buf.length < 12 + 16 + 1) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  try {
    const d = createDecipheriv('aes-256-gcm', keyBuf, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** iv (12) + authTag (16) + ciphertext */
function tryDecryptLayoutB(buf: Buffer, keyBuf: Buffer): string | null {
  if (buf.length < 12 + 16 + 1) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  try {
    const d = createDecipheriv('aes-256-gcm', keyBuf, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Decrypts a base64 ciphertext produced with AES-256-GCM + ENCRYPTION_KEY (SHA-256 key derivation).
 */
export function decryptSiteApiKey(encryptedBase64: string, encryptionKey: string): string {
  const key = encryptionKey.trim();
  if (!key) {
    throw new ApiError(500, 'CONFIG', 'ENCRYPTION_KEY is required to decrypt site credentials');
  }
  const trimmed = encryptedBase64.trim();
  if (!trimmed) {
    throw new ApiError(400, 'SITE', 'Site has no API credentials');
  }
  const keyBuf = deriveKey(key);
  let buf: Buffer;
  try {
    buf = Buffer.from(trimmed, 'base64');
  } catch {
    throw new ApiError(400, 'SITE', 'Invalid encrypted site API key encoding');
  }
  if (!buf.length) {
    throw new ApiError(400, 'SITE', 'Invalid encrypted site API key');
  }

  const a = tryDecryptLayoutA(buf, keyBuf);
  if (a != null) return a;
  const b = tryDecryptLayoutB(buf, keyBuf);
  if (b != null) return b;

  throw new ApiError(502, 'SITE', 'Could not decrypt site API key (check ENCRYPTION_KEY)');
}
