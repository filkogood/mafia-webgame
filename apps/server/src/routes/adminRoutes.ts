import { Router, Request, Response, IRouter, NextFunction } from 'express';
import {
  verifyTotp,
  createAdminSession,
  isValidAdminSession,
  revokeAdminSession,
  getAdminToken,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_EXPIRY_MS,
} from '../auth/adminAuth';

export const adminRouter: IRouter = Router();

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: ADMIN_SESSION_EXPIRY_MS,
  // secure: true in production (set separately below)
};

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: max 5 login attempts per IP per 15 minutes
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const loginAttempts = new Map<string, RateLimitEntry>();

function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: 'Too many login attempts. Try again later.' });
      return;
    }
    entry.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }
  next();
}

/**
 * POST /admin/login
 * Body: { code: string }
 * Verifies TOTP code, creates a session, sets an HttpOnly cookie, and returns
 * the raw token so the client can pass it in socket payloads.
 */
adminRouter.post('/login', loginRateLimit, (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };

  if (!code) {
    res.status(400).json({ error: 'OTP code is required' });
    return;
  }

  const secret = process.env.ADMIN_TOTP_SECRET ?? '';
  if (!secret) {
    res.status(503).json({ error: 'Admin authentication is not configured' });
    return;
  }

  if (!verifyTotp(code, secret)) {
    res.status(401).json({ error: 'Invalid OTP code' });
    return;
  }

  const token = createAdminSession();

  const cookieOpts = {
    ...SESSION_COOKIE_OPTIONS,
    secure: process.env.NODE_ENV === 'production',
  };
  res.cookie(ADMIN_SESSION_COOKIE, token, cookieOpts);
  res.json({ ok: true, token });
});

/**
 * POST /admin/logout
 * Revokes the current admin session.
 */
adminRouter.post('/logout', (req: Request, res: Response) => {
  const token = getAdminToken(req);
  if (token) revokeAdminSession(token);
  res.clearCookie(ADMIN_SESSION_COOKIE);
  res.json({ ok: true });
});

/**
 * GET /admin/me
 * Returns { isAdmin: boolean } based on the current session cookie/token.
 */
adminRouter.get('/me', (req: Request, res: Response) => {
  const token = getAdminToken(req);
  res.json({ isAdmin: isValidAdminSession(token) });
});
