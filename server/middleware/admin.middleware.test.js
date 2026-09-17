import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from './admin.middleware.js';

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('requireAdmin returns 401 when there is no authenticated user', () => {
  const req = {};
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('requireAdmin returns 403 for a logged-in non-admin (US-02a)', () => {
  const req = { user: { uid: '1', role: 'passenger' } };
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireAdmin calls next() for an admin user', () => {
  const req = { user: { uid: '1', role: 'admin' } };
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});
