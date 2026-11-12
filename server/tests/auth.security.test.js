import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { authenticator } from 'otplib';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { hashPassword, sha256, generateSecureToken } from '../src/utils/crypto.js';

const app = createApp();

async function getCsrfAgent() {
  const agent = request.agent(app);
  const csrfRes = await agent.get('/api/auth/csrf').expect(200);
  return { agent, csrfToken: csrfRes.body.csrfToken };
}

describe('Phase 1 Security, Authentication, 2FA, RBAC & Settings', () => {
  const studentEmail = `phase1.student.${Date.now()}@example.com`;
  const studentPhone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
  const adminEmail = `phase1.admin.${Date.now()}@example.com`;
  const strongPass = 'Shivaay@2026!';
  const newPass = 'ShivaayNew@2027!';

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [studentEmail, adminEmail] } },
    });
    await prisma.$disconnect();
  });

  it('rejects mutating requests without a valid CSRF token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: strongPass });
    assert.equal(res.status, 403);
  });

  it('registers a student with Argon2id hash, HttpOnly cookies, and no leaked secrets', async () => {
    const { agent, csrfToken } = await getCsrfAgent();
    const res = await agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Test Student',
        email: studentEmail,
        phone: studentPhone,
        password: strongPass,
        targetExam: 'UPSC',
        whatsappOptIn: true,
      })
      .expect(201);

    assert.equal(res.body.user.email, studentEmail);
    assert.equal(res.body.user.role, 'STUDENT');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.ok(res.body.user.studentProfile?.admissionCode);

    const setCookies = res.headers['set-cookie'] || [];
    assert.ok(setCookies.some((c) => c.startsWith('shivaay_access=') && c.includes('HttpOnly')));
    assert.ok(setCookies.some((c) => c.startsWith('shivaay_refresh=') && c.includes('HttpOnly')));

    const dbUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    assert.equal(dbUser.passwordAlgo, 'ARGON2ID');
    assert.ok(dbUser.passwordHash.startsWith('$argon2id$'));
  });

  it('enforces RBAC (401 unauthenticated, 403 student accessing admin endpoint)', async () => {
    await request(app).get('/api/admin/stats').expect(401);

    const { agent, csrfToken } = await getCsrfAgent();
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: studentEmail, password: strongPass })
      .expect(200);

    await agent.get('/api/admin/stats').expect(403);
    await agent.get('/api/auth/me').expect(200);
  });

  it('locks account after repeated failed login attempts and writes audit log', async () => {
    const { agent, csrfToken } = await getCsrfAgent();
    for (let i = 0; i < 4; i += 1) {
      await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({ email: studentEmail, password: 'WrongPassword1!' })
        .expect(401);
    }

    const lockedRes = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: studentEmail, password: 'WrongPassword1!' })
      .expect(423);

    assert.match(lockedRes.body.message, /locked/i);

    const lockAudit = await prisma.auditLog.findFirst({
      where: { actorEmail: studentEmail, action: 'ACCOUNT_LOCKED' },
    });
    assert.ok(lockAudit);

    // Unlock for subsequent password reset test
    await prisma.user.update({
      where: { email: studentEmail },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it('supports secure password reset token and invalidates old password', async () => {
    const user = await prisma.user.findUnique({ where: { email: studentEmail } });
    const rawToken = generateSecureToken(32);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const { agent, csrfToken } = await getCsrfAgent();
    await agent
      .post('/api/auth/reset-password')
      .set('X-CSRF-Token', csrfToken)
      .send({ token: rawToken, newPassword: newPass })
      .expect(200);

    // Old password fails
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: studentEmail, password: strongPass })
      .expect(401);

    // New password succeeds
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: studentEmail, password: newPass })
      .expect(200);
  });

  it('enables and enforces TOTP 2FA for administrators and allows configuring settings', async () => {
    const hash = await hashPassword(strongPass);
    await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: adminEmail,
        passwordHash: hash,
        passwordAlgo: 'ARGON2ID',
        role: 'ADMIN',
        status: 'ACTIVE',
        adminProfile: { create: { designation: 'Test Owner' } },
      },
    });

    const { agent, csrfToken } = await getCsrfAgent();
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: adminEmail, password: strongPass })
      .expect(200);

    const setupRes = await agent
      .post('/api/auth/2fa/setup')
      .set('X-CSRF-Token', csrfToken)
      .expect(200);

    assert.ok(setupRes.body.secret);
    assert.ok(setupRes.body.qrCodeDataUrl.startsWith('data:image/png;base64,'));

    const validCode = authenticator.generate(setupRes.body.secret);
    const enableRes = await agent
      .post('/api/auth/2fa/enable')
      .set('X-CSRF-Token', csrfToken)
      .send({ secret: setupRes.body.secret, code: validCode })
      .expect(200);

    assert.equal(enableRes.body.backupCodes.length, 8);

    // Logout and verify 2FA is required on next login
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken).expect(200);

    const login2fa = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: adminEmail, password: strongPass })
      .expect(200);
    assert.equal(login2fa.body.requires2FA, true);

    // Protected route still blocked before 2FA verification
    await agent.get('/api/admin/stats').expect(401);

    // Verify with TOTP code
    const code2 = authenticator.generate(setupRes.body.secret);
    const verifyRes = await agent
      .post('/api/auth/2fa/verify-login')
      .set('X-CSRF-Token', csrfToken)
      .send({ code: code2 })
      .expect(200);
    assert.equal(verifyRes.body.user.role, 'ADMIN');

    // Now admin endpoints & configurable settings work
    const statsRes = await agent.get('/api/admin/stats').expect(200);
    assert.equal(typeof statsRes.body.totalStudents, 'number');

    const publicSettings = await request(app).get('/api/settings/public').expect(200);
    assert.equal(publicSettings.body.totalSeats, 75);
    assert.equal(publicSettings.body.openingTime, '07:00');
    assert.equal(publicSettings.body.closingTime, '22:00');
  });

  it('exposes security headers (X-Content-Type-Options, X-Frame-Options)', async () => {
    const res = await request(app).get('/api/settings/public').expect(200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
  });
});
