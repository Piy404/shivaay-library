import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { constantTimeEquals } from '../utils/crypto.js';

export const CSRF_COOKIE_NAME = 'shivaay_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function signCsrfToken(rawToken) {
  return crypto
    .createHmac('sha256', env.csrfSecret)
    .update(rawToken)
    .digest('hex');
}

export function issueCsrfToken(res) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const signature = signCsrfToken(rawToken);
  const cookieValue = `${rawToken}.${signature}`;

  res.cookie(CSRF_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  });

  return rawToken;
}

export function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Webhook endpoints rely on cryptographic provider signatures instead of browser cookies
  if (req.path.startsWith('/api/payments/webhook') || req.path.startsWith('/api/notifications/webhook')) {
    return next();
  }

  const cookieValue = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieValue || typeof headerToken !== 'string' || !headerToken) {
    return res.status(403).json({ message: 'Invalid or missing CSRF token' });
  }

  const parts = String(cookieValue).split('.');
  if (parts.length !== 2) {
    return res.status(403).json({ message: 'Malformed CSRF token' });
  }

  const [cookieRaw, cookieSig] = parts;
  const expectedSig = signCsrfToken(cookieRaw);

  if (!constantTimeEquals(cookieSig, expectedSig) || !constantTimeEquals(cookieRaw, headerToken)) {
    return res.status(403).json({ message: 'CSRF token verification failed' });
  }

  return next();
}
