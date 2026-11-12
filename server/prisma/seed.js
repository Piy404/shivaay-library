import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/crypto.js';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // 1. Provisional defaults matching live production site (75 seats, 7 AM - 10 PM)
  const settings = await prisma.librarySettings.upsert({
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

  // 2. Seed physical seats up to configured capacity (default 75)
  for (let num = 1; num <= settings.totalSeats; num += 1) {
    await prisma.seat.upsert({
      where: { seatNumber: num },
      update: {},
      create: {
        seatNumber: num,
        label: `S-${String(num).padStart(2, '0')}`,
        zone: num <= 40 ? 'Silent Hall A' : 'Silent Hall B',
        hasPower: true,
        isErgonomic: true,
        status: 'AVAILABLE',
        isActive: true,
      },
    });
  }

  // 3. Seed standard membership plans (idempotent by code)
  const plans = [
    {
      code: 'DAILY',
      name: 'Daily Access Pass',
      description: 'Flexible single-day silent study access.',
      durationDays: 1,
      priceInr: 100,
      features: [
        'Full day access (7 AM - 10 PM)',
        'Flexible non-reserved seating',
        'High-speed Wi-Fi & power socket',
        'AC Study Hall & RO water',
      ],
      isPopular: false,
      sortOrder: 1,
    },
    {
      code: 'MONTHLY',
      name: 'Monthly Reserved',
      description: 'Dedicated reserved workstation for consistent daily preparation.',
      durationDays: 30,
      priceInr: 1200,
      features: [
        'Full day access (7 AM - 10 PM)',
        'Dedicated reserved seat',
        'Ergonomic chair & personal socket',
        'High-speed Wi-Fi & AC Hall',
      ],
      isPopular: false,
      sortOrder: 2,
    },
    {
      code: 'QUARTERLY',
      name: 'Quarterly Pass',
      description: '3-month focused preparation plan with savings.',
      durationDays: 90,
      priceInr: 3200,
      features: [
        'Save ₹400 compared to monthly',
        'Dedicated reserved premium seat',
        'Full day access (7 AM - 10 PM)',
        'High-speed Wi-Fi & dining lounge',
      ],
      isPopular: true,
      sortOrder: 3,
    },
    {
      code: 'HALF_YEARLY',
      name: 'Half-Yearly Pass',
      description: '6-month exam preparation plan with maximum value.',
      durationDays: 180,
      priceInr: 6000,
      features: [
        'Save ₹1,200 over 6 months',
        'Dedicated reserved premium seat',
        'Full day access (7 AM - 10 PM)',
        'Priority support & locker access',
      ],
      isPopular: false,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }

  // 4. Seed initial admin ONLY if no admin exists yet and ADMIN_PASSWORD is provided
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@shivaaylibrary.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 8) {
      console.warn(
        'Skipping admin seed: set ADMIN_PASSWORD (min 8 chars) in server/.env to create the initial admin account.'
      );
    } else {
      const passwordHash = await hashPassword(adminPassword);
      await prisma.user.create({
        data: {
          name: process.env.ADMIN_NAME || 'Shivaay Library Admin',
          email: adminEmail,
          passwordHash,
          passwordAlgo: 'ARGON2ID',
          role: 'ADMIN',
          status: 'ACTIVE',
          adminProfile: {
            create: {
              designation: 'Owner / Administrator',
              totpEnabled: false,
            },
          },
        },
      });
      console.log(`Initial admin account seeded for ${adminEmail}`);
    }
  }

  console.log(`Seed complete: ${settings.totalSeats} seats, ${plans.length} membership plans.`);
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
