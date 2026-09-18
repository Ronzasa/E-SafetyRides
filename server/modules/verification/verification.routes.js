import { Router } from 'express';
import tempAuth from '../../middleware/tempAuth.js'; // swap for requireAuth once Member 4's auth is live
import { scanPlate, getHistory } from './verification.service.js';

const router = Router();

router.post('/scan', tempAuth, async (req, res) => {
  try {
    const { plate, descriptor, consent } = req.body;

    if (!plate || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'A plate and a valid face descriptor are required.' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Consent is required before a scan can be processed.' });
    }

    const result = await scanPlate({ plate, descriptor, uid: req.user.uid });
    res.json(result);
  } catch (err) {
    console.error('Verification scan failed:', err);
    res.status(500).json({ error: 'Something went wrong processing the scan. Please try again.' });
  }
});

router.get('/history/:plate', tempAuth, async (req, res) => {
  try {
    const attempts = await getHistory(req.params.plate);
    res.json({ plate: req.params.plate.toUpperCase(), attempts });
  } catch (err) {
    console.error('Fetching verification history failed:', err);
    res.status(500).json({ error: 'Could not load verification history.' });
  }
});

export default router;