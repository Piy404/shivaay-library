import { z } from 'zod';

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number')
    .transform((val) => val.replace(/^\+91/, '')),
  password: strongPassword,
  targetExam: z.string().trim().max(80).optional(),
  whatsappOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const verifyTwoFactorLoginSchema = z.object({
  code: z.string().trim().min(6, 'Verification code is required').max(16),
});

export const enableTwoFactorSchema = z.object({
  secret: z.string().trim().min(16).max(128),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  code: z.string().trim().min(6, 'Valid 2FA code is required').max(16),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, 'Invalid reset token').max(256),
  newPassword: strongPassword,
});

export const updateSettingsSchema = z.object({
  libraryName: z.string().trim().min(2).max(120).optional(),
  totalSeats: z.number().int().min(1).max(500).optional(),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24h format').optional(),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24h format').optional(),
  openDays: z.string().trim().min(3).max(80).optional(),
  reservationHoldMinutes: z.number().int().min(5).max(1440).optional(),
  expiryReminderDays: z.number().int().min(1).max(30).optional(),
  address: z.string().trim().min(5).max(300).optional(),
  supportPhone: z.string().trim().min(8).max(20).optional(),
});
