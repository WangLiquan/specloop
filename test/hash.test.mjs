import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specHash } from '../lib/hash.mjs';

const base = {
  schemaVersion: '1.0', summary: 's',
  sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: 'x', priority: 'must' }]
};

test('hash is stable across key reordering', () => {
  const reordered = { criteria: base.criteria, summary: 's', sections: base.sections, schemaVersion: '1.0' };
  assert.equal(specHash(base), specHash(reordered));
});

test('hash ignores verdicts and presentation-only meta', () => {
  const withExtras = structuredClone(base);
  withExtras.verdicts = [{ criterionId: 'AC-1', status: 'pass' }];
  withExtras.meta = { title: 'whatever', specId: 'z', revision: 9 };
  assert.equal(specHash(base), specHash(withExtras));
});

test('hash ignores vendor payload under meta.ext', () => {
  const withExt = structuredClone(base);
  withExt.meta = { title: 'T', specId: 'd', revision: 1, ext: { mobile: { domain: 'pay', feat: 'checkout', version: 3 } } };
  assert.equal(specHash(base), specHash(withExt));
});

test('hash changes when a criterion text changes', () => {
  const changed = structuredClone(base);
  changed.criteria[0].text = 'y';
  assert.notEqual(specHash(base), specHash(changed));
});
