import { prisma } from '../db/prisma.js';

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export async function recordAuditLog({
  req,
  actor = null,
  action,
  entityType,
  entityId = null,
  details = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id || req?.user?.id || null,
        actorEmail: actor?.email || req?.user?.email || null,
        actorRole: actor?.role || req?.user?.role || null,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        ipAddress: req ? getClientIp(req) : null,
        userAgent: req?.headers?.['user-agent']?.slice(0, 255) || null,
        details: details || undefined,
      },
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}
