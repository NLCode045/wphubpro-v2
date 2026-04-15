/**
 * Server-only — HS256 JWT for bridge REST (Bearer), signed with the decrypted site shared secret.
 */
import { createHmac } from 'node:crypto';

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Minimal JWT (HS256) for `Authorization: Bearer` on `.../wp-json/wphubpro/v1/*`.
 */
export function signBridgeRequestJwt(
  siteSecretPlain: string,
  claims: Record<string, unknown> = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        iss: 'wphubpro-hub',
        iat: now,
        exp: now + 300,
        ...claims,
      }),
    ),
  );
  const data = `${header}.${payload}`;
  const sig = b64url(createHmac('sha256', siteSecretPlain).update(data).digest());
  return `${data}.${sig}`;
}
