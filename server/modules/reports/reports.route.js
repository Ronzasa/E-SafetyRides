import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import upload from '../../middleware/upload.js';
import {
  handleCreateIncident,
  handleListIncidents,
  handleGetMyIncidents,
  handleGetIncident,
  handleUploadEvidence,
  handleAddCorroboration,
  handleGetCorroborations,
} from './reports.controller.js';

const router = express.Router();

router.post('/', requireAuth, handleCreateIncident);
router.get('/', handleListIncidents);
router.get('/mine', requireAuth, handleGetMyIncidents);
router.post('/:id/evidence', requireAuth, upload.single('evidence'), handleUploadEvidence);
router.get('/:id', handleGetIncident);
router.post('/:id/corroborate', requireAuth, handleAddCorroboration);
router.get('/:id/corroborations', handleGetCorroborations);

export default router;