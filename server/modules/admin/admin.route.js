import { Router } from 'express';
import { reviewQueue, moderateReport, trends } from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';

const router = Router();

router.get('/reports', requireAuth, requireAdmin, reviewQueue);
router.patch('/reports/:id', requireAuth, requireAdmin, moderateReport);
router.get('/trends', requireAuth, requireAdmin, trends);

export default router;