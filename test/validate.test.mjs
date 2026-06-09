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

test('rejects unknown top-level properties like the removed verdicts/report', () => {
  const bad = structuredClone(good);
  bad.verdicts = [{ criterionId: 'AC-1', status: 'pass' }];
  const r = validateSpec(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /additional propert/i.test(e)));
});
