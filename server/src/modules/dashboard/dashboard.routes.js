import { Router } from 'express';
import * as dashboardController from './dashboard.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/summary', requireAuth, dashboardController.getSummary);

export default router;
