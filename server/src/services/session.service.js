import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { generateSecureToken, sha256 } from '../utils/crypto.js';
import { getClientIp } from '../utils/audit.js';

export function signAccessToken({ userId, sessionId, role }) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      role,
      type: 'access',
    },
    env.jwtAccessSecret,
    {
      expiresIn: `${env.accessTokenTtlMinutes}m`,
      issuer: 'shivaay-library-api',
      audience: 'shivaay-library-client',
    }
  );
}

export function signTwoFactorChallengeToken({ userId }) {
  return jwt.sign(
    {
      sub: userId,
      type: '2fa_challenge',
    },
    env.jwtAccessSecret,
    {
      expiresIn: '5m',
      issuer: 'shivaay-library-api',
      audience: 'shivaay-library-client',
    }
  );
}

export async function createUserSession({ user, req }) {
  const rawRefreshToken = generateSecureToken(48);
  const refreshTokenHash = sha256(rawRefreshToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      userAgent: req.headers['user-agent']?.slice(0, 255) || null,
      ipAddress: getClientIp(req),
      expiresAt,
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    sessionId: session.id,
    role: user.role,
  });

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      sid: session.id,
      rt: rawRefreshToken,
      type: 'refresh',
    },
    env.jwtRefreshSecret,
    {
      expiresIn: `${env.refreshTokenTtlDays}d`,
      issuer: 'shivaay-library-api',
      audience: 'shivaay-library-client',
    }
  );

  return { session, accessToken, refreshToken };
}

export async function rotateUserSession({ refreshTokenJwt, req }) {
  const decoded = jwt.verify(refreshTokenJwt, env.jwtRefreshSecret, {
    issuer: 'shivaay-library-api',
    audience: 'shivaay-library-client',
  });

  if (decoded.type !== 'refresh' || !decoded.sid || !decoded.rt || !decoded.sub) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const existing = await prisma.session.findUnique({
    where: { id: decoded.sid },
    include: { user: true },
  });

  if (!existing) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const providedHash = sha256(decoded.rt);

  // Reuse detection: if a previously rotated/revoked refresh token is presented, revoke all user sessions
  if (existing.revokedAt || existing.refreshTokenHash !== providedHash) {
    await prisma.session.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new Error('REFRESH_REUSE_DETECTED');
  }

  if (existing.expiresAt <= new Date() || existing.user.status !== 'ACTIVE') {
    throw new Error('SESSION_EXPIRED_OR_INACTIVE');
  }

  const nextRawRefresh = generateSecureToken(48);
  const nextHash = sha256(nextRawRefresh);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const nextSession = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        userId: existing.userId,
        refreshTokenHash: nextHash,
        userAgent: req.headers['user-agent']?.slice(0, 255) || null,
        ipAddress: getClientIp(req),
        expiresAt,
      },
    });

    await tx.session.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: created.id,
      },
    });

    return created;
  });

  const accessToken = signAccessToken({
    userId: existing.user.id,
    sessionId: nextSession.id,
    role: existing.user.role,
  });

  const refreshToken = jwt.sign(
    {
      sub: existing.user.id,
      sid: nextSession.id,
      rt: nextRawRefresh,
      type: 'refresh',
    },
    env.jwtRefreshSecret,
    {
      expiresIn: `${env.refreshTokenTtlDays}d`,
      issuer: 'shivaay-library-api',
      audience: 'shivaay-library-client',
    }
  );

  return { user: existing.user, session: nextSession, accessToken, refreshToken };
}

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    studentProfile: user.studentProfile
      ? {
          id: user.studentProfile.id,
          admissionCode: user.studentProfile.admissionCode,
          targetExam: user.studentProfile.targetExam,
          joinDate: user.studentProfile.joinDate,
        }
      : null,
    adminProfile: user.adminProfile
      ? {
          id: user.adminProfile.id,
          designation: user.adminProfile.designation,
          totpEnabled: user.adminProfile.totpEnabled,
        }
      : null,
  };
}
