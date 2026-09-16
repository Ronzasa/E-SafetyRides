import express from 'express';
import tempAuth from '../../middleware/tempAuth.js';
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

router.post('/', tempAuth, handleCreateIncident);
router.get('/', handleListIncidents);
router.get('/mine', tempAuth, handleGetMyIncidents);
router.post('/:id/evidence', tempAuth, upload.single('evidence'), handleUploadEvidence);
router.get('/:id', handleGetIncident);
router.post('/:id/corroborate', tempAuth, handleAddCorroboration);
router.get('/:id/corroborations', handleGetCorroborations);

export default router;