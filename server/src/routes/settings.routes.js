import express from 'express';
import { prisma } from '../db/prisma.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { recordAuditLog } from '../utils/audit.js';
import { updateSettingsSchema } from '../validators/auth.schemas.js';

const router = express.Router();

export async function ensureLibrarySettings() {
  return prisma.librarySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      libraryName: 'Shivaay Library',
      totalSeats: 75,
      openingTime: '07:00',
      closingTime: '22:00',
      openDays: 'Mon-Sun (All 7 Days)',
      reservationHoldMinutes: 30,
      expiryReminderDays: 3,
      address: 'Plot No. 1, Sterling Globe, Hanuman Nagar, Jatkhedi, Bhopal, MP 462047',
      supportPhone: '+91 9993165583',
    },
  });
}

// @desc    Get public library configuration (capacity, hours, contact)
// @route   GET /api/settings/public
router.get('/public', async (_req, res, next) => {
  try {
    const settings = await ensureLibrarySettings();
    return res.json({
      libraryName: settings.libraryName,
      totalSeats: settings.totalSeats,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      openDays: settings.openDays,
      address: settings.address,
      supportPhone: settings.supportPhone,
    });
  } catch (err) {
    return next(err);
  }
});

// @desc    Update library settings & sync seat capacity (Admin only)
// @route   PUT /api/settings
router.put('/', protect, requireRole('ADMIN'), validateBody(updateSettingsSchema), async (req, res, next) => {
  try {
    const current = await ensureLibrarySettings();
    const nextTotalSeats = req.body.totalSeats ?? current.totalSeats;

    // Prevent shrinking capacity below an actively occupied/reserved seat number
    if (nextTotalSeats < current.totalSeats) {
      const activeHighSeat = await prisma.seat.findFirst({
        where: {
          seatNumber: { gt: nextTotalSeats },
          status: { in: ['OCCUPIED', 'RESERVED'] },
        },
        orderBy: { seatNumber: 'desc' },
      });
      if (activeHighSeat) {
        return res.status(409).json({
          message: `Cannot reduce capacity to ${nextTotalSeats} because Seat #${activeHighSeat.seatNumber} is currently ${activeHighSeat.status}.`,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.librarySettings.update({
        where: { id: 1 },
        data: req.body,
      });

      if (req.body.totalSeats !== undefined) {
        for (let num = 1; num <= nextTotalSeats; num += 1) {
          await tx.seat.upsert({
            where: { seatNumber: num },
            update: { isActive: true },
            create: {
              seatNumber: num,
              label: `S-${String(num).padStart(2, '0')}`,
              zone: num <= 40 ? 'Silent Hall A' : 'Silent Hall B',
              status: 'AVAILABLE',
              isActive: true,
            },
          });
        }
        await tx.seat.updateMany({
          where: { seatNumber: { gt: nextTotalSeats } },
          data: { isActive: false },
        });
      }

      return saved;
    });

    await recordAuditLog({
      req,
      action: 'LIBRARY_SETTINGS_UPDATED',
      entityType: 'LibrarySettings',
      entityId: '1',
      details: req.body,
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

export default router;
