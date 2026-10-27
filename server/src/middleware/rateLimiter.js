import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isTest ? 10000 : 30, // 30 attempts per 15 mins in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again later.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isTest ? 10000 : 300, // 300 requests per 15 mins for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please slow down and try again later.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
});

export const bootstrapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isTest ? 10000 : 5, // strict: 5 attempts per 15 minutes in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many bootstrap attempts. Please try again later.',
      code: 'TOO_MANY_REQUESTS'
    }
  }
});


