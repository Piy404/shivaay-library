import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function requireSecret(name, fallbackDevSeed) {
  const value = process.env[name];
  if (value && value.trim().length >= 32) {
    return value.trim();
  }
  if (isProd) {
    throw new Error(`FATAL: Environment variable ${name} must be configured with at least 32 characters in production.`);
  }
  // Deterministic per-process ephemeral secret in dev/test when not explicitly set
  if (!globalThis.__shivaayDevSecrets) {
    globalThis.__shivaayDevSecrets = {};
  }
  if (!globalThis.__shivaayDevSecrets[name]) {
    const base = value?.trim() || fallbackDevSeed;
    globalThis.__shivaayDevSecrets[name] = crypto
      .createHash('sha256')
      .update(`${base}:${process.pid}`)
      .digest('hex');
  }
  return globalThis.__shivaayDevSecrets[name];
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 5001),
  databaseUrl: process.env.DATABASE_URL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  forceHttps: process.env.FORCE_HTTPS === 'true',
  jwtAccessSecret: requireSecret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  csrfSecret: requireSecret('CSRF_SECRET', 'dev-csrf-secret'),
  totpEncryptionKey: requireSecret('TOTP_ENCRYPTION_KEY', 'dev-totp-key'),
  qrSigningSecret: requireSecret('QR_SIGNING_SECRET', 'dev-qr-secret'),
  accessTokenTtlMinutes: Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  maxFailedLoginAttempts: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5),
  lockoutMinutes: Number(process.env.ACCOUNT_LOCKOUT_MINUTES || 15),
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@shivaaylibrary.com').toLowerCase(),
  adminName: process.env.ADMIN_NAME || 'Shivaay Library Admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};
