import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { bootstrapSchema } from './admin.schema.js';
import { validate } from '../../middleware/validate.js';
import { bootstrapLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// One-time administrator bootstrap endpoint
router.post(
  '/bootstrap',
  bootstrapLimiter,
  validate(bootstrapSchema),
  adminController.bootstrapAdmin
);

export default router;
