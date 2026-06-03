import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDataIsland } from '../lib/extract.mjs';
import { renderSpecHtml } from '../lib/render-spec.mjs';

const spec = {
  schemaVersion: '1.0', generator: 'g',
  meta: { title: 'T', specId: 'd', revision: 1 },
  summary: 's',
  sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: '</script> tricky', priority: 'must' }]
};

test('round-trips the data island from rendered spec html', () => {
  const html = renderSpecHtml(spec);
  assert.deepEqual(extractDataIsland(html), spec);
});

test('throws when no island present', () => {
  assert.throws(() => extractDataIsland('<html><body>nope</body></html>'), /no #specforge-data/);
});

test('throws on oversize input', () => {
  const html = renderSpecHtml(spec);
  assert.throws(() => extractDataIsland(html, { maxBytes: 10 }), /size limit/);
});

test('throws on malformed json island', () => {
  const broken = '<script type="application/json" id="specforge-data">{ not json }</script>';
  assert.throws(() => extractDataIsland(broken), /not valid JSON/);
});

test('does not execute embedded markup (payload stays as data)', () => {
  const html = renderSpecHtml(spec);
  const data = extractDataIsland(html);
  assert.equal(data.criteria[0].text, '</script> tricky');
});
