import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec } from '../lib/validate.mjs';

const good = {
  schemaVersion: '1.0', generator: 'g',
  meta: { title: 't', specId: 's', revision: 1 },
  summary: 's',
  sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: 'x', priority: 'must' }, { id: 'AC-2', text: 'y', priority: 'should' }]
};

test('accepts a valid spec', () => {
  assert.deepEqual(validateSpec(good), { ok: true, errors: [] });
});

test('rejects duplicate criterion ids', () => {
  const bad = structuredClone(good);
  bad.criteria[1].id = 'AC-1';
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /unique/i.test(e)));
});

test('surfaces schema errors (bad enum)', () => {
  const bad = structuredClone(good);
  bad.criteria[0].priority = 'nope';
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
});

test('accepts valid verdicts + verifiedAt', () => {
  const ok = structuredClone(good);
  ok.verdicts = [{
    criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review',
    confidence: 'high', evidence: [{ file: 'src/x.ts', line: 42 }],
    missingEvidenceReason: null, explanation: 'e'
  }];
  ok.verifiedAt = '2026-06-09T00:00:00.000Z';
  assert.deepEqual(validateSpec(ok), { ok: true, errors: [] });
});

test('rejects verdict referencing unknown criterion', () => {
  const bad = structuredClone(good);
  bad.verdicts = [{ criterionId: 'AC-9', status: 'fail', verificationMode: 'static_review', confidence: 'low', evidence: [], missingEvidenceReason: 'x', explanation: 'e' }];
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /unknown criterionId/i.test(e)));
});

test('rejects pass verdict with empty evidence', () => {
  const bad = structuredClone(good);
  bad.verdicts = [{ criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [], missingEvidenceReason: null, explanation: 'e' }];
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /pass.*no evidence/i.test(e)));
});
