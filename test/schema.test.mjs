import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync(new URL('../schema/spec.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const validSpec = {
  schemaVersion: '1.0',
  generator: 'specloop-draft/0.1.0',
  meta: { title: 'Demo', specId: 'demo-001', revision: 1, previousSpecId: null, createdAt: '2026-06-03' },
  summary: '一句话',
  sections: [
    { id: 'goals', title: '目标', type: 'prose', body: 'x' },
    { id: 'flows', title: '流程', type: 'flow', steps: ['a', 'b'] },
    { id: 'data', title: '数据', type: 'table', rows: [['字段', '类型']] }
  ],
  criteria: [{ id: 'AC-1', text: 'do x', priority: 'must', rationale: 'r' }]
};

test('valid spec passes', () => {
  assert.ok(validate(validSpec), JSON.stringify(validate.errors));
});

test('rejects missing schemaVersion', () => {
  const bad = structuredClone(validSpec); delete bad.schemaVersion;
  assert.equal(validate(bad), false);
});

test('rejects unknown section type', () => {
  const bad = structuredClone(validSpec);
  bad.sections.push({ id: 'z', title: 'z', type: 'video' });
  assert.equal(validate(bad), false);
});

test('rejects extra top-level property', () => {
  const bad = structuredClone(validSpec); bad.nope = 1;
  assert.equal(validate(bad), false);
});

test('rejects bad criterion priority enum', () => {
  const bad = structuredClone(validSpec); bad.criteria[0].priority = 'maybe';
  assert.equal(validate(bad), false);
});

test('valid verdicts pass', () => {
  const ok = structuredClone(validSpec);
  ok.verdicts = [{
    criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review',
    confidence: 'high', evidence: [{ file: 'src/x.ts', line: 42, note: 'n' }],
    missingEvidenceReason: null, explanation: 'e'
  }];
  assert.ok(validate(ok), JSON.stringify(validate.errors));
});

test('rejects evidence line <= 0', () => {
  const bad = structuredClone(validSpec);
  bad.verdicts = [{ criterionId: 'AC-1', status: 'fail', verificationMode: 'static_review', confidence: 'low', evidence: [{ file: 'a', line: 0 }], missingEvidenceReason: 'x', explanation: 'e' }];
  assert.equal(validate(bad), false);
});
