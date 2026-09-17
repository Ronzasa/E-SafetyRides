import { Router } from 'express';
import { reviewQueue, moderateReport, trends, overview, users, reportDetail } from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';

const router = Router();

router.get('/reports', requireAuth, requireAdmin, reviewQueue);
router.get('/reports/:id', requireAuth, requireAdmin, reportDetail);
router.patch('/reports/:id', requireAuth, requireAdmin, moderateReport);
router.get('/trends', requireAuth, requireAdmin, trends);
router.get('/overview', requireAuth, requireAdmin, overview);
router.get('/users', requireAuth, requireAdmin, users);

export default router;