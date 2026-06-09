import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'specforge-'));
const spec = {
  schemaVersion: '1.0', generator: 'specforge-draft/0.1.0',
  meta: { title: 'CLI Demo', specId: 'cli', revision: 1 },
  summary: 's',
  sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: 'x', priority: 'must' }]
};

test('render-spec CLI writes a valid spec.html', () => {
  const specPath = join(dir, 'spec.json');
  const outPath = join(dir, 'out.spec.html');
  writeFileSync(specPath, JSON.stringify(spec));
  execFileSync('node', ['lib/cli/render-spec-main.mjs', specPath, outPath]);
  const html = readFileSync(outPath, 'utf8');
  assert.ok(html.includes('id="specforge-data"'));
  assert.ok(html.includes('CLI Demo'));
});

test('render-spec CLI rejects invalid spec with non-zero exit', () => {
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ schemaVersion: '1.0' }));
  assert.throws(() => execFileSync('node', ['lib/cli/render-spec-main.mjs', bad, join(dir, 'x.html')], { stdio: 'pipe' }));
});

test('extract CLI prints the validated spec island as JSON to stdout', () => {
  const specHtml = join(dir, 'out.spec.html'); // 上面已生成
  const out = execFileSync('node', ['lib/cli/extract-main.mjs', specHtml], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.equal(parsed.meta.title, 'CLI Demo');
  assert.equal(parsed.criteria[0].id, 'AC-1');
});

test('extract CLI rejects a non-spec html with non-zero exit', () => {
  const notSpec = join(dir, 'plain.html');
  writeFileSync(notSpec, '<html><body>no island here</body></html>');
  assert.throws(() => execFileSync('node', ['lib/cli/extract-main.mjs', notSpec], { stdio: 'pipe' }));
});

const withOpen = {
  ...spec,
  decisions: [
    { id: 'D-1', question: '哪个接口?', options: ['a', 'b'], resolution: '待定', status: 'open', rationale: 'r' },
    { id: 'D-2', question: '已定项', options: ['x'], resolution: 'x', status: 'decided', rationale: 'r' }
  ]
};

test('render-spec CLI rejects open decisions without --allow-open', () => {
  const p = join(dir, 'open.json');
  writeFileSync(p, JSON.stringify(withOpen));
  let err;
  try {
    execFileSync('node', ['lib/cli/render-spec-main.mjs', p, join(dir, 'o.html')], { stdio: 'pipe' });
  } catch (e) {
    err = e;
  }
  assert.ok(err, '存在 open 决策时应非 0 退出');
  assert.equal(err.status, 3);
  assert.match(String(err.stderr), /D-1/); // 报错列出待拍板的 D-id
});

test('render-spec CLI allows open decisions only with explicit --allow-open', () => {
  const p = join(dir, 'open2.json');
  const out = join(dir, 'o2.html');
  writeFileSync(p, JSON.stringify(withOpen));
  execFileSync('node', ['lib/cli/render-spec-main.mjs', p, out, '--allow-open'], { stdio: 'pipe' });
  assert.ok(readFileSync(out, 'utf8').includes('id="specforge-data"'));
});
