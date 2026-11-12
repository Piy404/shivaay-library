import express from 'express';
import { prisma } from '../db/prisma.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, requireRole('ADMIN'));

// @desc    Get paginated security & admin audit logs
// @route   GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '25', 10)));
    const action = req.query.action ? String(req.query.action).trim() : undefined;

    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// @desc    Basic Phase 1 admin overview counts from PostgreSQL
// @route   GET /api/admin/stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      availableSeats,
      occupiedSeats,
      reservedSeats,
      pendingPayments,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: { not: 'ACTIVE' } } }),
      prisma.seat.count({ where: { isActive: true, status: 'AVAILABLE' } }),
      prisma.seat.count({ where: { isActive: true, status: 'OCCUPIED' } }),
      prisma.seat.count({ where: { isActive: true, status: 'RESERVED' } }),
      prisma.payment.count({ where: { status: { in: ['CREATED', 'PENDING'] } } }),
    ]);

    return res.json({
      totalStudents,
      activeStudents,
      inactiveStudents,
      availableSeats,
      occupiedSeats,
      reservedSeats,
      pendingPayments,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
