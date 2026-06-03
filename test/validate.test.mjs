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

test('rejects verdict referencing unknown criterion', () => {
  const bad = structuredClone(good);
  bad.verdicts = [{ criterionId: 'AC-9', status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [], explanation: 'e' }];
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /unknown criterionId AC-9/.test(e)));
});

test('rejects duplicate verdict for same criterion', () => {
  const bad = structuredClone(good);
  const v = { status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [], explanation: 'e' };
  bad.verdicts = [{ criterionId: 'AC-1', ...v }, { criterionId: 'AC-1', ...v }];
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /duplicate verdict for AC-1/.test(e)));
});

test('surfaces schema errors (bad enum)', () => {
  const bad = structuredClone(good);
  bad.criteria[0].priority = 'nope';
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
});
