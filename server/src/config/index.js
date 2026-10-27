import './env.js';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'dev-mealrelay-jwt-secret-key-32chars-minimum-needed!') {
  if (isProd) {
    console.warn(
      '⚠️ [SECURITY NOTICE] JWT_SECRET was not configured in environment variables. Generated a secure random 256-bit secret for this instance. To persist authentication sessions across server restarts, set a dedicated JWT_SECRET in your hosting dashboard.'
    );
    jwtSecret = crypto.randomBytes(32).toString('hex');
  } else {
    jwtSecret = 'dev-mealrelay-jwt-secret-key-32chars-minimum-needed!';
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null,
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET ? process.env.ADMIN_BOOTSTRAP_SECRET.trim() : null,
  isTest: process.env.NODE_ENV === 'test',
  isProd
};

// Validate required production configurations at startup
if (config.isProd) {
  const missing = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(
      `[Startup Error] Missing required environment variables in production:\n  - ${missing.join('\n  - ')}`
    );
  }
}


