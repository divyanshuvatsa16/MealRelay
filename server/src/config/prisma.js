import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: config.isTest ? [] : ['warn', 'error']
    });
  }
  prisma = global.__prisma;
}

export default prisma;
