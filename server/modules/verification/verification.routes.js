import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { scanDriver, getHistory } from './verification.service.js';

const router = Router();

router.post('/scan', requireAuth, async (req, res) => {
  try {
    const { plate, descriptor, consent } = req.body;

    if (
      !plate ||
      !Array.isArray(descriptor) ||
      descriptor.length !== 128 ||
      !descriptor.every(Number.isFinite)
    ) {
      return res.status(400).json({
        error: 'A plate and valid face descriptor are required.',
      });
    }

    if (!consent) {
      return res.status(400).json({
        error: 'Consent is required before a scan can be processed.',
      });
    }

    const result = await scanDriver({
      plate,
      descriptor,
      uid: req.user.uid,
    });

    res.json(result);
  } catch (err) {
    console.error('Verification scan failed:', err);

    res.status(err.statusCode || 500).json({
      error: err.statusCode
        ? err.message
        : 'Something went wrong processing the scan. Please try again.',
    });
  }
});

router.get('/history/:plate', requireAuth, async (req, res) => {
  try {
    const attempts = await getHistory(req.params.plate);

    res.json({
      plate: req.params.plate.toUpperCase(),
      attempts,
    });
  } catch (err) {
    console.error('Fetching verification history failed:', err);

    res.status(500).json({
      error: 'Could not load verification history.',
    });
  }
});

export default router;