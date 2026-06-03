import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReportHtml } from '../lib/render-report.mjs';

const spec = {
  schemaVersion: '1.0', generator: 'g',
  meta: { title: 'T', specId: 'd', revision: 1 },
  summary: 's',
  sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: 'x', priority: 'must' }, { id: 'AC-2', text: 'y', priority: 'should' }]
};
const verdicts = [
  { criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [{ file: 'src/x.ts', line: 5 }], explanation: 'ok' },
  { criterionId: 'AC-2', status: 'fail', verificationMode: 'static_review', confidence: 'low', evidence: [], missingEvidenceReason: 'not found', explanation: 'missing' }
];

test('renders coverage dashboard counts', () => {
  const html = renderReportHtml(spec, verdicts, 'deadbeef');
  assert.ok(html.includes('pass 1') || html.includes('>1<'));
  assert.ok(html.includes('id="specloop-data"'));
});

test('binds the spec hash into the report island', () => {
  const html = renderReportHtml(spec, verdicts, 'deadbeef');
  assert.ok(html.includes('deadbeef'));
});

test('shows untested banner when only static_review present', () => {
  const html = renderReportHtml(spec, verdicts, 'deadbeef');
  assert.match(html, /未运行测试|static review/i);
});

test('only script tag is the json island', () => {
  const html = renderReportHtml(spec, verdicts, 'deadbeef');
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  assert.equal(scripts.length, 1);
});
