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

// ── 现状假设核验链路（assumptions / check-ready / annotate-assumptions） ──
function runFail(args) {
  let err;
  try { execFileSync('node', args, { stdio: 'pipe' }); } catch (e) { err = e; }
  return err;
}
const asmSpec = {
  schemaVersion: '1.0', generator: 'specforge-draft/0.1.0',
  meta: { title: 'Asm', specId: 'asm', revision: 1 },
  summary: 's', sections: [{ id: 'a', title: 'A', type: 'prose', body: 'b' }],
  criteria: [{ id: 'AC-1', text: 'x', priority: 'must' }],
  assumptionReview: { applicable: true, reason: 'r' },
  assumptions: [{ id: 'ASM-1', claim: 'c', evidence: 'lib/x.mjs:1', verified: null, verifiedDigest: null }]
};
const writeJson = (name, obj) => { const p = join(dir, name); writeFileSync(p, JSON.stringify(obj)); return p; };

test('render preflight rejects applicable:true with empty assumptions (exit 3)', () => {
  const bad = structuredClone(asmSpec); bad.assumptions = [];
  const err = runFail(['lib/cli/render-spec-main.mjs', writeJson('e1.json', bad), join(dir, 'e1.html')]);
  assert.ok(err); assert.equal(err.status, 3);
});

test('render preflight rejects applicable:false carrying assumptions (exit 3)', () => {
  const bad = structuredClone(asmSpec); bad.assumptionReview = { applicable: false, reason: 'r' };
  const err = runFail(['lib/cli/render-spec-main.mjs', writeJson('e2.json', bad), join(dir, 'e2.html')]);
  assert.ok(err); assert.equal(err.status, 3);
  assert.match(String(err.stderr), /applicable:false/);
});

test('render preflight rejects assumption missing evidence, lists its id (exit 3)', () => {
  const bad = structuredClone(asmSpec); bad.assumptions[0].evidence = '  ';
  const err = runFail(['lib/cli/render-spec-main.mjs', writeJson('e3.json', bad), join(dir, 'e3.html')]);
  assert.ok(err); assert.equal(err.status, 3);
  assert.match(String(err.stderr), /ASM-1/);
});

test('check-ready: unverified assumptions are not ready (exit 3)', () => {
  const html = join(dir, 'cr.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('cr.json', asmSpec), html]);
  const err = runFail(['lib/cli/check-ready-main.mjs', html]);
  assert.ok(err); assert.equal(err.status, 3);
  assert.match(String(err.stderr), /未核/);
});

test('check-ready: missing assumptionReview is rejected at delivery (exit 3)', () => {
  const noDecl = structuredClone(asmSpec); delete noDecl.assumptionReview; delete noDecl.assumptions;
  const html = join(dir, 'nd.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('nd.json', noDecl), html]);
  const err = runFail(['lib/cli/check-ready-main.mjs', html]);
  assert.ok(err); assert.equal(err.status, 3);
  assert.match(String(err.stderr), /缺 assumptionReview/);
});

test('check-ready: applicable:false passes (exit 0)', () => {
  const na = { ...asmSpec, assumptionReview: { applicable: false, reason: '纯决策' } };
  delete na.assumptions;
  const html = join(dir, 'na.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('na.json', na), html]);
  execFileSync('node', ['lib/cli/check-ready-main.mjs', html], { stdio: 'pipe' }); // 不抛即 exit 0
});

test('annotate-assumptions: write back true then check-ready passes (exit 0)', () => {
  const html = join(dir, 'ok.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('ok.json', asmSpec), html]);
  const res = writeJson('ok-res.json', [{ id: 'ASM-1', verified: true }]);
  execFileSync('node', ['lib/cli/annotate-assumptions-main.mjs', html, res], { stdio: 'pipe' });
  assert.match(readFileSync(html, 'utf8'), /asm-badge ok/);
  execFileSync('node', ['lib/cli/check-ready-main.mjs', html], { stdio: 'pipe' }); // 就绪，不抛
});

test('annotate-assumptions: id set mismatch is rejected atomically (exit 1)', () => {
  const html = join(dir, 'mm.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('mm.json', asmSpec), html]);
  const res = writeJson('mm-res.json', [{ id: 'ASM-9', verified: true }]); // 未知 id + 缺 ASM-1
  const err = runFail(['lib/cli/annotate-assumptions-main.mjs', html, res]);
  assert.ok(err); assert.equal(err.status, 1);
  assert.match(String(err.stderr), /未知 id ASM-9|缺 id ASM-1/);
});

test('annotate-assumptions: false verdict requires non-empty note', () => {
  const html = join(dir, 'fn.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('fn.json', asmSpec), html]);
  const res = writeJson('fn-res.json', [{ id: 'ASM-1', verified: false }]); // 缺 note
  const err = runFail(['lib/cli/annotate-assumptions-main.mjs', html, res]);
  assert.ok(err); assert.equal(err.status, 1);
});

test('annotate-assumptions: refuses non-self-produced spec (exit 3)', () => {
  const foreign = { ...asmSpec, generator: 'echo-spec/1.0.0' };
  const html = join(dir, 'fa.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('fa.json', foreign), html]);
  const res = writeJson('fa-res.json', [{ id: 'ASM-1', verified: true }]);
  const err = runFail(['lib/cli/annotate-assumptions-main.mjs', html, res]);
  assert.ok(err); assert.equal(err.status, 3);
});

test('check-ready: stale digest (verified true but digest mismatch) is not ready (exit 3)', () => {
  const stale = structuredClone(asmSpec);
  stale.assumptions[0].verified = true;
  stale.assumptions[0].verifiedDigest = 'deadbeef'; // 与当前 claim+evidence 不符 → effectiveVerified=null
  const html = join(dir, 'st.spec.html');
  execFileSync('node', ['lib/cli/render-spec-main.mjs', writeJson('st.json', stale), html]);
  // 页面不应显示 ✓（effectiveVerified=null → pending），且 check-ready 拦
  assert.match(readFileSync(html, 'utf8'), /asm-badge pending/);
  const err = runFail(['lib/cli/check-ready-main.mjs', html]);
  assert.ok(err); assert.equal(err.status, 3);
});
