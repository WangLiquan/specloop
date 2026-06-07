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

test('preserves opaque meta.ext payload verbatim through render round-trip', () => {
  const withExt = structuredClone(spec);
  withExt.meta.ext = { mobile: { domain: 'pay', feat: 'checkout', sources: ['figma://abc'], version: 3 } };
  const html = renderSpecHtml(withExt);
  assert.deepEqual(extractDataIsland(html).meta.ext, withExt.meta.ext);
});

test('does not leak meta.ext into visible html', () => {
  const withExt = structuredClone(spec);
  withExt.meta.ext = { mobile: { secretMarker: 'ZZ_EXT_LEAK_ZZ' } };
  const html = renderSpecHtml(withExt);
  // marker 只允许出现在数据岛里，不得泄进可见 HTML 正文
  const island = html.match(/<script\b[^>]*id=["']specforge-data["'][^>]*>[\s\S]*?<\/script>/i)[0];
  assert.equal(html.replace(island, '').includes('ZZ_EXT_LEAK_ZZ'), false);
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
