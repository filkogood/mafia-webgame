import { Router, Request, Response, IRouter } from 'express';
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

const TOTP_SECRET = () => process.env.ADMIN_TOTP_SECRET ?? '';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: ADMIN_SESSION_EXPIRY_MS,
  // secure: true in production (set separately below)
};

/**
 * POST /admin/login
 * Body: { code: string }
 * Verifies TOTP code, creates a session, sets an HttpOnly cookie, and returns
 * the raw token so the client can pass it in socket payloads.
 */
adminRouter.post('/login', (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };

  if (!code) {
    res.status(400).json({ error: 'OTP code is required' });
    return;
  }

  const secret = TOTP_SECRET();
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
