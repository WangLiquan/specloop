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
  assert.ok(html.includes('id="specloop-data"'));
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
