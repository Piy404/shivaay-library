import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';

const app = createApp();

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma');

    const server = app.listen(env.port, () => {
      console.log(`Shivaay Library API running on port ${env.port} (${env.nodeEnv})`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
