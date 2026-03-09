import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// TOTP (RFC 6238) implementation – no external deps needed
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer {
  const s = input.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of s) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/** Compute HMAC-based one-time password for the given counter (RFC 4226) */
function hotp(key: Buffer, counter: bigint): number {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(counter);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return code % 1_000_000;
}

/**
 * Verify a 6-digit TOTP code against the given Base32 secret.
 * Accepts a ±1 time-step window to tolerate clock skew.
 */
export function verifyTotp(code: string, secret: string): boolean {
  if (!secret || !code) return false;
  const normalised = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalised)) return false;
  try {
    const key = base32Decode(secret);
    const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
    for (const delta of [-1n, 0n, 1n]) {
      const expected = hotp(key, counter + delta)
        .toString()
        .padStart(6, '0');
      if (expected === normalised) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export const ADMIN_SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours
export const ADMIN_SESSION_COOKIE = 'admin_session';

/** token -> expiry timestamp (ms since epoch) */
export const adminSessions = new Map<string, number>();

/** Issue a new admin session and return the token. */
export function createAdminSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_EXPIRY_MS);
  return token;
}

/** Return true if the token is present and has not expired. */
export function isValidAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const expiry = adminSessions.get(token);
  if (expiry === undefined) return false;
  if (Date.now() > expiry) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

/** Invalidate the given session token. */
export function revokeAdminSession(token: string): void {
  adminSessions.delete(token);
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';

/** Extract admin session token from cookie or Authorization Bearer header. */
export function getAdminToken(req: Request): string | undefined {
  // HttpOnly cookie (preferred)
  const cookieToken = req.cookies?.[ADMIN_SESSION_COOKIE] as string | undefined;
  if (cookieToken) return cookieToken;
  // Fallback: Authorization header (for API testing convenience)
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}

/** Middleware that rejects non-admin requests with 403. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = getAdminToken(req);
  if (!isValidAdminSession(token)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
