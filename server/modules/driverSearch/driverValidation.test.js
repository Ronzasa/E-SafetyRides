import test from 'node:test';
import assert from 'node:assert/strict';
import { normalisePlate, isValidPlate, isValidReportPlate, REPORT_PLATE_LENGTH } from './driverValidation.js';

test('normalisePlate uppercases and strips spaces/dashes', () => {
  assert.equal(normalisePlate(' abc123 gp '), 'ABC123GP');
  assert.equal(normalisePlate('abc-123-gp'), 'ABC123GP');
});

test('isValidPlate accepts 1-8 alphanumeric characters (search + vehicle linkage)', () => {
  assert.equal(isValidPlate('ABC123GP'), true);    // standard 8-char plate
  assert.equal(isValidPlate('A'), true);           // short legacy value stays findable
  assert.equal(isValidPlate('ABC1234GP'), false);  // 9 chars
  assert.equal(isValidPlate('ABC1234GPA'), false); // 10 chars
  assert.equal(isValidPlate('ABC123GP!'), false);
  assert.equal(isValidPlate('abc123gp'), false);   // callers normalise first
});

test('isValidReportPlate requires exactly 8 alphanumeric characters', () => {
  assert.equal(REPORT_PLATE_LENGTH, 8);
  assert.equal(isValidReportPlate('ABC123GP'), true);
  assert.equal(isValidReportPlate('HNL844NW'), true);
  assert.equal(isValidReportPlate('ABC123'), false);    // 6 chars rejected
  assert.equal(isValidReportPlate('ABC1234GP'), false); // 9 chars rejected
  assert.equal(isValidReportPlate('ABC123G!'), false);
});

test('the report form rule and the API rule agree for new submissions', () => {
  // Mirrors PLATE_FORMAT_REGEX in client/src/features/reports/components/IncidentReportForm.jsx
  const formRule = /^[A-Z0-9]{8}$/;
  for (const plate of ['ABC123GP', 'HNL844NW', '12345678', 'ABC123', 'ABC1234GP', 'A']) {
    assert.equal(formRule.test(plate), isValidReportPlate(plate), `mismatch for ${plate}`);
  }
});
