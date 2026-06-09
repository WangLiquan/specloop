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

test('annotate CLI writes verdicts back into a self-produced spec.html', () => {
  // 先渲染一个 specforge-draft 自产 spec.html
  const specPath = join(dir, 'ann-spec.json');
  const htmlPath = join(dir, 'ann.spec.html');
  writeFileSync(specPath, JSON.stringify(spec));
  execFileSync('node', ['lib/cli/render-spec-main.mjs', specPath, htmlPath]);
  // 判定 AC-1 fail，写回
  const vPath = join(dir, 'verdicts.json');
  writeFileSync(vPath, JSON.stringify([
    { criterionId: 'AC-1', status: 'fail', verificationMode: 'static_review', confidence: 'low', evidence: [], missingEvidenceReason: '未实现', explanation: '缺失' }
  ]));
  execFileSync('node', ['lib/cli/annotate-main.mjs', htmlPath, vPath], { stdio: 'pipe' });
  const html = readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('vstat'), '写回后含状态徽标');
  assert.ok(html.includes('v-fail'), 'fail AC 样式注入');
  assert.ok(html.includes('"verifiedAt"'), 'verifiedAt 落入数据岛');
  // 写回后仍是合法可再抽取的 spec
  const out = execFileSync('node', ['lib/cli/extract-main.mjs', htmlPath], { encoding: 'utf8' });
  assert.equal(JSON.parse(out).verdicts.length, 1);
});

test('annotate CLI refuses to write back into a non-self-produced spec (exit 3)', () => {
  const foreign = { ...spec, generator: 'echo-spec/1.0.0' };
  const specPath = join(dir, 'foreign.json');
  const htmlPath = join(dir, 'foreign.spec.html');
  // 直接用 render 造一个 echo-spec 数据岛（render 不校验 generator 前缀）
  writeFileSync(specPath, JSON.stringify(foreign));
  execFileSync('node', ['lib/cli/render-spec-main.mjs', specPath, htmlPath]);
  const vPath = join(dir, 'fv.json');
  writeFileSync(vPath, JSON.stringify([{ criterionId: 'AC-1', status: 'pass', verificationMode: 'static_review', confidence: 'high', evidence: [{ file: 'a', line: 1 }], missingEvidenceReason: null, explanation: 'e' }]));
  let err;
  try {
    execFileSync('node', ['lib/cli/annotate-main.mjs', htmlPath, vPath], { stdio: 'pipe' });
  } catch (e) { err = e; }
  assert.ok(err, '外部 generator 应非 0 退出');
  assert.equal(err.status, 3);
});
