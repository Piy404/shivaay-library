import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { ACCESS_COOKIE } from '../utils/cookies.js';

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, env.jwtAccessSecret, {
      issuer: 'shivaay-library-api',
      audience: 'shivaay-library-client',
    });

    if (decoded.type !== 'access' || !decoded.sub || !decoded.sid) {
      return res.status(401).json({ message: 'Invalid session token' });
    }

    const session = await prisma.session.findUnique({
      where: { id: decoded.sid },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            status: true,
            mustChangePassword: true,
            studentProfile: {
              select: {
                id: true,
                admissionCode: true,
                targetExam: true,
                joinDate: true,
              },
            },
            adminProfile: {
              select: {
                id: true,
                designation: true,
                totpEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return res.status(401).json({ message: 'Session expired or revoked' });
    }

    if (!session.user || session.user.id !== decoded.sub) {
      return res.status(401).json({ message: 'Invalid session user' });
    }

    if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is inactive or suspended' });
    }

    req.user = session.user;
    req.sessionId = session.id;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    return next();
  };
}
