import test from 'node:test';
import assert from 'node:assert/strict';
import { updateReportStatus } from './admin.service.js';

test('updateReportStatus rejects an invalid status before touching the database', async () => {
  await assert.rejects(
    () => updateReportStatus('some-id', 'not-a-real-status'),
    (err) => err.code === 'INVALID_STATUS'
  );
});
