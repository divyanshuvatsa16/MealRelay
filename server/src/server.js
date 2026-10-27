import app from './app.js';
import { config } from './config/index.js';
import prisma from './config/prisma.js';
import { initExpiryScheduler } from './modules/donations/expiry.job.js';

const PORT = config.port;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`MealRelay Backend running on http://${HOST}:${PORT} [${config.env}]`);
});

// Start background expiry task
let expiryTask = null;
if (!config.isTest) {
  expiryTask = initExpiryScheduler();
  console.log('[ExpiryJob] Scheduled background donation expiry runner.');
}

// Graceful shutdown handling
async function shutdown(signal) {
  console.log(`Received ${signal}. Initiating graceful shutdown...`);

  if (expiryTask) {
    expiryTask.stop();
    console.log('[ExpiryJob] Expiry scheduler stopped.');
  }

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err.message);
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
