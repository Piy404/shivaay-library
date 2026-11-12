import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { protect, requireRole } from '../middleware/auth.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { authLimiter, sensitiveActionLimiter } from '../middleware/rateLimiters.js';
import { validateBody } from '../middleware/validate.js';
import {
  createUserSession,
  rotateUserSession,
  serializeUser,
  signTwoFactorChallengeToken,
} from '../services/session.service.js';
import { recordAuditLog } from '../utils/audit.js';
import {
  clearAuthCookies,
  clearTwoFactorChallengeCookie,
  REFRESH_COOKIE,
  setAuthCookies,
  setTwoFactorChallengeCookie,
  TWO_FA_CHALLENGE_COOKIE,
} from '../utils/cookies.js';
import {
  decryptSecret,
  encryptSecret,
  generateAdmissionCode,
  generateSecureToken,
  hashPassword,
  sha256,
  verifyPassword,
} from '../utils/crypto.js';
import {
  changePasswordSchema,
  disableTwoFactorSchema,
  enableTwoFactorSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyTwoFactorLoginSchema,
} from '../validators/auth.schemas.js';

const router = express.Router();

// Progressive delay helper based on failed attempts (capped to prevent request timeouts)
async function applyProgressiveDelay(failedAttempts) {
  if (env.isTest || failedAttempts <= 0) return;
  const delayMs = Math.min(250 * 2 ** (failedAttempts - 1), 3000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// @desc    Issue CSRF token + HttpOnly CSRF cookie
// @route   GET /api/auth/csrf
router.get('/csrf', (req, res) => {
  const csrfToken = issueCsrfToken(res);
  res.json({ csrfToken });
});

// @desc    Register a new student account
// @route   POST /api/auth/register
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, targetExam, whatsappOptIn } = req.body;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existing) {
      return res.status(409).json({
        message: existing.email === email
          ? 'An account with this email already exists'
          : 'An account with this phone number already exists',
      });
    }

    const passwordHash = await hashPassword(password);
    const qrSecretToken = generateSecureToken(32);
    const admissionCode = generateAdmissionCode();

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          passwordAlgo: 'ARGON2ID',
          role: 'STUDENT',
          status: 'ACTIVE',
          studentProfile: {
            create: {
              admissionCode,
              targetExam: targetExam || null,
              qrSecretToken,
            },
          },
          notificationPreference: {
            create: {
              whatsappOptIn: Boolean(whatsappOptIn),
              whatsappConsentAt: whatsappOptIn ? new Date() : null,
            },
          },
        },
        include: {
          studentProfile: true,
          adminProfile: true,
        },
      });
      return user;
    });

    const { accessToken, refreshToken } = await createUserSession({ user: createdUser, req });
    setAuthCookies(res, { accessToken, refreshToken });

    await recordAuditLog({
      req,
      actor: createdUser,
      action: 'STUDENT_REGISTERED',
      entityType: 'User',
      entityId: createdUser.id,
      details: { admissionCode },
    });

    return res.status(201).json({
      user: serializeUser(createdUser),
    });
  } catch (err) {
    return next(err);
  }
});

// @desc    Authenticate user with Argon2id + lockout + optional Admin 2FA
// @route   POST /api/auth/login
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is inactive or suspended. Please contact administration.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked due to repeated failed attempts. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    const isMatch = await verifyPassword(user.passwordHash, user.passwordAlgo, password);

    if (!isMatch) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempts >= env.maxFailedLoginAttempts;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + env.lockoutMinutes * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lockedUntil,
        },
      });

      await recordAuditLog({
        req,
        actor: user,
        action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        details: { failedAttempts: nextAttempts },
      });

      await applyProgressiveDelay(nextAttempts);

      if (shouldLock) {
        return res.status(423).json({
          message: `Account locked for ${env.lockoutMinutes} minutes after repeated failed login attempts.`,
        });
      }

      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Transparently upgrade legacy bcrypt hashes to Argon2id on successful login
    const updateData = {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    };
    if (user.passwordAlgo === 'BCRYPT_LEGACY') {
      updateData.passwordHash = await hashPassword(password);
      updateData.passwordAlgo = 'ARGON2ID';
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        studentProfile: true,
        adminProfile: true,
      },
    });

    // Enforce TOTP 2FA challenge for admins who have enabled 2FA
    if (updatedUser.role === 'ADMIN' && updatedUser.adminProfile?.totpEnabled) {
      const challengeToken = signTwoFactorChallengeToken({ userId: updatedUser.id });
      setTwoFactorChallengeCookie(res, challengeToken);
      return res.json({
        requires2FA: true,
        message: 'Two-factor authentication code required',
      });
    }

    const { accessToken, refreshToken } = await createUserSession({ user: updatedUser, req });
    setAuthCookies(res, { accessToken, refreshToken });

    await recordAuditLog({
      req,
      actor: updatedUser,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: updatedUser.id,
    });

    return res.json({
      requires2FA: false,
      user: serializeUser(updatedUser),
    });
  } catch (err) {
    return next(err);
  }
});

// @desc    Verify TOTP or backup code to complete admin login
// @route   POST /api/auth/2fa/verify-login
router.post(
  '/2fa/verify-login',
  authLimiter,
  validateBody(verifyTwoFactorLoginSchema),
  async (req, res, next) => {
    try {
      const challengeToken = req.cookies?.[TWO_FA_CHALLENGE_COOKIE];
      if (!challengeToken) {
        return res.status(401).json({ message: '2FA challenge session missing or expired' });
      }

      let decoded;
      try {
        decoded = jwt.verify(challengeToken, env.jwtAccessSecret, {
          issuer: 'shivaay-library-api',
          audience: 'shivaay-library-client',
        });
      } catch {
        return res.status(401).json({ message: '2FA challenge expired. Please log in again.' });
      }

      if (decoded.type !== '2fa_challenge' || !decoded.sub) {
        return res.status(401).json({ message: 'Invalid 2FA challenge' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { studentProfile: true, adminProfile: true },
      });

      if (!user || user.role !== 'ADMIN' || !user.adminProfile?.totpEnabled || !user.adminProfile.totpSecretEnc) {
        return res.status(401).json({ message: '2FA is not configured for this account' });
      }

      const code = req.body.code.replace(/\s+/g, '');
      const secret = decryptSecret(user.adminProfile.totpSecretEnc);
      let verified = authenticator.verify({ token: code, secret });
      let usedBackup = false;

      if (!verified && Array.isArray(user.adminProfile.totpBackupHashes)) {
        const codeHash = sha256(code.toUpperCase());
        const idx = user.adminProfile.totpBackupHashes.indexOf(codeHash);
        if (idx !== -1) {
          verified = true;
          usedBackup = true;
          const remaining = [...user.adminProfile.totpBackupHashes];
          remaining.splice(idx, 1);
          await prisma.adminProfile.update({
            where: { id: user.adminProfile.id },
            data: { totpBackupHashes: remaining },
          });
        }
      }

      if (!verified) {
        await recordAuditLog({
          req,
          actor: user,
          action: 'ADMIN_2FA_FAILED',
          entityType: 'User',
          entityId: user.id,
        });
        return res.status(401).json({ message: 'Invalid 2FA verification code' });
      }

      clearTwoFactorChallengeCookie(res);
      const { accessToken, refreshToken } = await createUserSession({ user, req });
      setAuthCookies(res, { accessToken, refreshToken });

      await recordAuditLog({
        req,
        actor: user,
        action: 'ADMIN_2FA_LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        details: { usedBackup },
      });

      return res.json({ user: serializeUser(user) });
    } catch (err) {
      return next(err);
    }
  }
);

// @desc    Generate TOTP secret & QR code for admin 2FA enrollment
// @route   POST /api/auth/2fa/setup
router.post('/2fa/setup', protect, requireRole('ADMIN'), sensitiveActionLimiter, async (req, res, next) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(req.user.email, 'Shivaay Library', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.json({
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    });
  } catch (err) {
    return next(err);
  }
});

// @desc    Verify TOTP token and enable 2FA for current admin
// @route   POST /api/auth/2fa/enable
router.post(
  '/2fa/enable',
  protect,
  requireRole('ADMIN'),
  sensitiveActionLimiter,
  validateBody(enableTwoFactorSchema),
  async (req, res, next) => {
    try {
      const { secret, code } = req.body;
      const isValid = authenticator.verify({ token: code, secret });

      if (!isValid) {
        return res.status(400).json({ message: 'Invalid 6-digit authenticator code' });
      }

      const backupCodes = Array.from({ length: 8 }, () =>
        generateSecureToken(4).toUpperCase()
      );
      const backupHashes = backupCodes.map((c) => sha256(c));

      await prisma.adminProfile.upsert({
        where: { userId: req.user.id },
        update: {
          totpEnabled: true,
          totpSecretEnc: encryptSecret(secret),
          totpBackupHashes: backupHashes,
          totpVerifiedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          totpEnabled: true,
          totpSecretEnc: encryptSecret(secret),
          totpBackupHashes: backupHashes,
          totpVerifiedAt: new Date(),
        },
      });

      await recordAuditLog({
        req,
        action: 'ADMIN_2FA_ENABLED',
        entityType: 'User',
        entityId: req.user.id,
      });

      return res.json({
        message: 'Two-factor authentication enabled successfully',
        backupCodes,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// @desc    Disable TOTP 2FA for current admin
// @route   POST /api/auth/2fa/disable
router.post(
  '/2fa/disable',
  protect,
  requireRole('ADMIN'),
  sensitiveActionLimiter,
  validateBody(disableTwoFactorSchema),
  async (req, res, next) => {
    try {
      const { password, code } = req.body;
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { adminProfile: true },
      });

      if (!user || !(await verifyPassword(user.passwordHash, user.passwordAlgo, password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      if (!user.adminProfile?.totpEnabled || !user.adminProfile.totpSecretEnc) {
        return res.status(400).json({ message: '2FA is not currently enabled' });
      }

      const secret = decryptSecret(user.adminProfile.totpSecretEnc);
      if (!authenticator.verify({ token: code.replace(/\s+/g, ''), secret })) {
        return res.status(400).json({ message: 'Invalid 2FA verification code' });
      }

      await prisma.adminProfile.update({
        where: { id: user.adminProfile.id },
        data: {
          totpEnabled: false,
          totpSecretEnc: null,
          totpBackupHashes: [],
          totpVerifiedAt: null,
        },
      });

      await recordAuditLog({
        req,
        action: 'ADMIN_2FA_DISABLED',
        entityType: 'User',
        entityId: req.user.id,
      });

      return res.json({ message: 'Two-factor authentication disabled' });
    } catch (err) {
      return next(err);
    }
  }
);

// @desc    Rotate refresh session and issue fresh access/refresh HttpOnly cookies
// @route   POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshJwt = req.cookies?.[REFRESH_COOKIE];
    if (!refreshJwt) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    const { user, accessToken, refreshToken } = await rotateUserSession({
      refreshTokenJwt: refreshJwt,
      req,
    });

    setAuthCookies(res, { accessToken, refreshToken });
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { studentProfile: true, adminProfile: true },
    });

    return res.json({ user: serializeUser(fullUser) });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
});

// @desc    Logout current session
// @route   POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const refreshJwt = req.cookies?.[REFRESH_COOKIE];
    if (refreshJwt) {
      try {
        const decoded = jwt.verify(refreshJwt, env.jwtRefreshSecret);
        if (decoded?.sid) {
          await prisma.session.updateMany({
            where: { id: decoded.sid, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await recordAuditLog({
            req,
            actor: { id: decoded.sub },
            action: 'LOGOUT',
            entityType: 'Session',
            entityId: decoded.sid,
          });
        }
      } catch {
        // Ignore expired/invalid token on logout
      }
    }
  } finally {
    clearAuthCookies(res);
  }
  return res.json({ message: 'Logged out successfully' });
});

// @desc    Revoke all active sessions for current user
// @route   POST /api/auth/logout-all
router.post('/logout-all', protect, async (req, res, next) => {
  try {
    await prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearAuthCookies(res);

    await recordAuditLog({
      req,
      action: 'LOGOUT_ALL_SESSIONS',
      entityType: 'User',
      entityId: req.user.id,
    });

    return res.json({ message: 'All sessions have been revoked' });
  } catch (err) {
    return next(err);
  }
});

// @desc    Get current authenticated user
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

// @desc    Change authenticated user's password
// @route   POST /api/auth/change-password
router.post(
  '/change-password',
  protect,
  sensitiveActionLimiter,
  validateBody(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      if (!user || !(await verifyPassword(user.passwordHash, user.passwordAlgo, currentPassword))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const newHash = await hashPassword(newPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            passwordAlgo: 'ARGON2ID',
            mustChangePassword: false,
          },
        }),
        prisma.session.updateMany({
          where: { userId: user.id, id: { not: req.sessionId }, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      await recordAuditLog({
        req,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id,
      });

      return res.json({ message: 'Password updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

// @desc    Request password reset token (enumeration-safe response)
// @route   POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (user && user.status === 'ACTIVE') {
        const rawToken = generateSecureToken(32);
        const tokenHash = sha256(rawToken);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.$transaction([
          prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
          }),
          prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash,
              expiresAt,
            },
          }),
        ]);

        await recordAuditLog({
          req,
          actor: user,
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'User',
          entityId: user.id,
        });

        if (env.nodeEnv === 'development') {
          console.info(`[DEV Password Reset] ${user.email}: ${env.frontendUrl}/reset-password?token=${rawToken}`);
        }
      }

      return res.json({
        message: 'If an account with that email exists, password reset instructions have been issued.',
      });
    } catch (err) {
      return next(err);
    }
  }
);

// @desc    Reset password with valid single-use reset token
// @route   POST /api/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      const tokenHash = sha256(token);

      const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= new Date()) {
        return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: {
            passwordHash,
            passwordAlgo: 'ARGON2ID',
            mustChangePassword: false,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { usedAt: new Date() },
        }),
        prisma.session.updateMany({
          where: { userId: resetRecord.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      await recordAuditLog({
        req,
        actor: resetRecord.user,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: resetRecord.userId,
      });

      return res.json({ message: 'Password has been reset successfully. You may now sign in.' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
