import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { generateAdmissionCode, generateSecureToken, hashPassword } from '../src/utils/crypto.js';

dotenv.config();

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = { dryRun: argv.includes('--dry-run'), firebase: null, mongo: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--firebase' && argv[i + 1]) args.firebase = argv[i + 1];
    if (argv[i] === '--mongo' && argv[i + 1]) args.mongo = argv[i + 1];
  }
  return args;
}

function addMonths(dateInput, months) {
  const d = new Date(dateInput);
  d.setMonth(d.getMonth() + Number(months || 1));
  return d;
}

async function migrateFirebase(filePath, dryRun) {
  const raw = JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8'));
  const students = Array.isArray(raw.students) ? raw.students : [];
  const inquiries = Array.isArray(raw.inquiries) ? raw.inquiries : [];

  console.log(`[Firebase] Found ${students.length} students and ${inquiries.length} inquiries.`);
  if (dryRun) return;

  const monthlyPlan = await prisma.membershipPlan.findUnique({ where: { code: 'MONTHLY' } });
  if (!monthlyPlan) {
    throw new Error('Run prisma db seed first so MONTHLY membership plan exists.');
  }

  for (const s of students) {
    const legacySourceId = `firebase:student:${s.id ?? s.seat}`;
    const phone = s.phone ? String(s.phone).replace(/\D/g, '').slice(-10) : null;
    const email = (
      s.email || `student.seat${s.seat}.${phone || s.id || '0'}@migrated.shivaaylibrary.local`
    ).toLowerCase();

    const tempHash = await hashPassword(generateSecureToken(16));
    const joinDate = s.admissionDate ? new Date(s.admissionDate) : new Date();
    const durationMonths = Number(s.durationMonths || 1);
    const endDate = addMonths(joinDate, durationMonths);
    const isExpired = endDate <= new Date();

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { legacySourceId },
        update: { name: s.name || 'Migrated Student', phone },
        create: {
          email,
          phone,
          name: s.name || 'Migrated Student',
          passwordHash: tempHash,
          passwordAlgo: 'ARGON2ID',
          role: 'STUDENT',
          status: isExpired ? 'INACTIVE' : 'ACTIVE',
          mustChangePassword: true,
          legacySource: 'FIREBASE',
          legacySourceId,
          studentProfile: {
            create: {
              admissionCode: generateAdmissionCode(),
              qrSecretToken: generateSecureToken(32),
              joinDate,
            },
          },
          notificationPreference: {
            create: { whatsappOptIn: false },
          },
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          planId: monthlyPlan.id,
          startDate: joinDate,
          endDate,
          status: isExpired ? 'EXPIRED' : 'ACTIVE',
          notes: `Migrated from Firebase (${durationMonths} month(s))`,
        },
      });

      if (s.seat) {
        const seatRecord = await tx.seat.findUnique({ where: { seatNumber: Number(s.seat) } });
        if (seatRecord) {
          const seatStatus = s.seatStatus === 'Available' ? 'AVAILABLE' : 'OCCUPIED';
          await tx.seat.update({ where: { id: seatRecord.id }, data: { status: seatStatus } });
          if (seatStatus !== 'AVAILABLE') {
            await tx.booking.create({
              data: {
                userId: user.id,
                seatId: seatRecord.id,
                membershipId: membership.id,
                status: 'ACTIVE',
                startAt: joinDate,
              },
            });
          }
        }
      }

      if (Number(s.amountPaid || 0) > 0) {
        await tx.payment.create({
          data: {
            userId: user.id,
            membershipId: membership.id,
            billingPeriod: `${joinDate.toISOString().slice(0, 7)} (${durationMonths}m)`,
            amountInr: Math.round(Number(s.amountPaid)),
            status: 'CAPTURED',
            method: 'LEGACY_MANUAL',
            paidAt: joinDate,
            metadata: {
              totalFees: s.totalFees || 0,
              remainingAmount: s.remainingAmount || 0,
              legacyPaymentStatus: s.paymentStatus || 'Paid',
            },
          },
        });
      }
    });
  }

  for (const inq of inquiries) {
    await prisma.inquiry.create({
      data: {
        name: inq.name || 'Unknown',
        phone: String(inq.phone || ''),
        email: inq.email || null,
        examPrep: inq.exam || null,
        createdAt: inq.timestamp ? new Date(inq.timestamp) : new Date(),
      },
    });
  }
}

async function migrateMongo(filePath, dryRun) {
  const raw = JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8'));
  const users = Array.isArray(raw.users) ? raw.users : [];
  const fees = Array.isArray(raw.fees) ? raw.fees : [];

  console.log(`[MongoDB] Found ${users.length} users and ${fees.length} fee records.`);
  if (dryRun) return;

  const userIdMap = new Map();

  for (const u of users) {
    const email = String(u.email).toLowerCase();
    const legacySourceId = `mongo:user:${u._id || email}`;
    const role = u.role === 'admin' ? 'ADMIN' : 'STUDENT';
    const status = u.status === 'inactive' ? 'INACTIVE' : 'ACTIVE';

    const saved = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone: u.phone ? String(u.phone).replace(/\D/g, '').slice(-10) : null,
        name: u.name || 'Migrated User',
        passwordHash: u.password, // Existing bcryptjs hash preserved; auto-upgraded to Argon2id on login
        passwordAlgo: 'BCRYPT_LEGACY',
        role,
        status,
        legacySource: 'MONGODB',
        legacySourceId,
        ...(role === 'STUDENT'
          ? {
              studentProfile: {
                create: {
                  admissionCode: generateAdmissionCode(),
                  qrSecretToken: generateSecureToken(32),
                  joinDate: u.joinDate ? new Date(u.joinDate) : new Date(),
                },
              },
              notificationPreference: {
                create: { whatsappOptIn: false },
              },
            }
          : {
              adminProfile: {
                create: { designation: 'Migrated Admin', totpEnabled: false },
              },
            }),
      },
    });

    if (u._id) userIdMap.set(String(u._id), saved.id);
  }

  for (const f of fees) {
    const mappedUserId = userIdMap.get(String(f.studentId));
    if (!mappedUserId) continue;

    const statusMap = { paid: 'CAPTURED', pending: 'PENDING', overdue: 'FAILED' };
    const methodMap = {
      cash: 'CASH',
      upi: 'UPI',
      card: 'CARD',
      bank_transfer: 'BANK_TRANSFER',
    };

    await prisma.payment.create({
      data: {
        userId: mappedUserId,
        billingPeriod: f.month || 'Legacy Period',
        amountInr: Math.round(Number(f.amount || 0)),
        status: statusMap[f.status] || 'PENDING',
        method: methodMap[f.paymentMethod] || 'LEGACY_MANUAL',
        paidAt: f.paymentDate ? new Date(f.paymentDate) : null,
      },
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.firebase && !args.mongo) {
    console.log('Usage: node scripts/migrate-legacy-data.js [--firebase path.json] [--mongo path.json] [--dry-run]');
    return;
  }
  if (args.firebase) await migrateFirebase(args.firebase, args.dryRun);
  if (args.mongo) await migrateMongo(args.mongo, args.dryRun);
  console.log(args.dryRun ? 'Dry run complete (no database changes made).' : 'Legacy migration complete.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
