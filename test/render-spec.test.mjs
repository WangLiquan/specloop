import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSpecHtml } from '../lib/render-spec.mjs';

const spec = {
  schemaVersion: '1.0', generator: 'g',
  meta: { title: 'Demo', specId: 'd', revision: 1 },
  summary: '做什么',
  sections: [
    { id: 'goals', title: '目标', type: 'prose', body: '正文' },
    { id: 'flows', title: '流程', type: 'flow', steps: ['步骤1', '步骤2'] },
    { id: 'data', title: '数据', type: 'table', rows: [['字段', '类型']] }
  ],
  criteria: [{ id: 'AC-1', text: 'do x', priority: 'must' }]
};

test('renders a full standalone document with CSP and data island', () => {
  const html = renderSpecHtml(spec);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes('id="specforge-data"'));
  assert.ok(html.includes('AC-1'));
});

test('the only <script> tag is the non-executable json island', () => {
  const html = renderSpecHtml(spec);
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /type="application\/json"/);
});

test('dangerous user text stays inert in body and island', () => {
  const evil = structuredClone(spec);
  evil.criteria[0].text = '</script><img src=x onerror=alert(1)>';
  const html = renderSpecHtml(evil);
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'no live img element');
  assert.ok(!html.includes('</script><img'), 'no island escape');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('decisions/awareness render at top; criteria folds into <details>', () => {
  const s = structuredClone(spec);
  s.decisions = [{ id: 'D-1', question: '选 A 还是 B', resolution: 'A', status: 'open' }];
  s.awareness = [{ id: 'A-1', text: '会影响下单', severity: 'warning' }];
  const html = renderSpecHtml(s);
  assert.ok(html.includes('id="decisions"'), 'decisions block present');
  assert.ok(html.includes('待拍板'), 'open decision badge present');
  assert.ok(html.includes('id="awareness"'), 'awareness block present');
  assert.match(html, /<details[^>]*\bid="criteria"/, 'criteria folded into details');
  assert.ok(html.includes('AC-1'), 'AC still rendered inside the fold');
  // 折叠区先于数据岛、且未引入额外 <script>
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  assert.equal(scripts.length, 1);
});

test('without verdicts renders plain spec (no verification chrome)', () => {
  const html = renderSpecHtml(spec);
  assert.ok(!html.includes('vstat'), 'no verdict status badge');
  assert.ok(!html.includes('cov-bar'), 'no coverage bar');
});

test('with verdicts injects coverage bar, status badges and evidence', () => {
  const s = structuredClone(spec);
  s.criteria = [
    { id: 'AC-1', text: 'do x', priority: 'must' },
    { id: 'AC-2', text: 'do y', priority: 'should' }
  ];
  s.verdicts = [
    { criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [{ file: 'src/x.ts', line: 42 }], missingEvidenceReason: null, explanation: '已实现' },
    { criterionId: 'AC-2', status: 'fail', verificationMode: 'static_review', confidence: 'low', evidence: [], missingEvidenceReason: '未找到实现', explanation: '缺失' }
  ];
  s.verifiedAt = '2026-06-09T00:00:00.000Z';
  const html = renderSpecHtml(s);
  assert.ok(html.includes('cov-bar'), 'coverage bar present');
  assert.ok(html.includes('v-pass'), 'pass AC styled');
  assert.ok(html.includes('v-fail'), 'fail AC styled');
  assert.ok(html.includes('vstat'), 'status badge present');
  assert.ok(html.includes('src/x.ts'), 'evidence file shown');
  assert.ok(html.includes('未找到实现'), 'missingEvidenceReason shown');
  // verdicts/verifiedAt 在数据岛里完整 round-trip
  assert.ok(html.includes('"verifiedAt"'), 'verifiedAt in island');
});
