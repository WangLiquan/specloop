import { readFileSync, writeFileSync } from 'node:fs';
import { extractDataIsland } from '../extract.mjs';
import { validateSpec } from '../validate.mjs';
import { renderSpecHtml } from '../render-spec.mjs';
import { digest } from '../digest.mjs';

const [, , specHtmlPath, resultsPath] = process.argv;
if (!specHtmlPath || !resultsPath) {
  console.error('usage: annotate-assumptions.mjs <spec.html> <results.json>');
  process.exit(2);
}
// 把 reviewer 的现状假设核验结果回写进源 spec.html（draft 自带，不依赖 verify 的 annotate，D-11）。
// judge/fixer 分离：只改 spec 自身核验态（verified/verifiedDigest/note），禁改 claim/evidence、绝不碰被断言代码。
// 只写回 specforge-draft 自产 spec；外部 generator 拒绝（exit 3）。
const spec = extractDataIsland(readFileSync(specHtmlPath, 'utf8'));
if (!/^specforge-draft\b/.test(spec.generator || '')) {
  console.error(`拒绝写回：generator="${spec.generator}" 非 specforge-draft 自产 spec。`);
  process.exit(3);
}
const assumptions = spec.assumptions || [];
if (!assumptions.length) {
  console.error('spec 无 assumptions，无可回写。');
  process.exit(1);
}
const results = JSON.parse(readFileSync(resultsPath, 'utf8'));

// 原子校验：results 的 id 集合必须与 assumptions 完全相等（无未知/重复/缺失），verified 只能 true/false，
// 判 false 必须给非空 note。任一不合 → 整次拒绝、不写回（避免半写）。
if (!Array.isArray(results)) {
  console.error('results 必须是数组 [{id,verified,note}]');
  process.exit(1);
}
const asmIds = new Set(assumptions.map((a) => a.id));
const seen = new Set();
const errs = [];
for (const r of results) {
  if (!r || typeof r.id !== 'string') { errs.push('结果项缺 id'); continue; }
  if (!asmIds.has(r.id)) errs.push(`未知 id ${r.id}`);
  if (seen.has(r.id)) errs.push(`重复 id ${r.id}`);
  seen.add(r.id);
  if (r.verified !== true && r.verified !== false) errs.push(`${r.id} verified 必须是 true/false`);
  if (r.verified === false && (typeof r.note !== 'string' || r.note.trim() === '')) {
    errs.push(`${r.id} 判 false 必须给非空 note`);
  }
}
for (const id of asmIds) if (!seen.has(id)) errs.push(`缺 id ${id} 的核验结果`);
if (errs.length) {
  console.error('拒绝写回（整次原子，不半写）：\n' + errs.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}

// 按 id patch：写 verified + verifiedDigest（锁当时 claim+evidence 指纹）；false 留 note、true 清旧 note。
const byId = new Map(results.map((r) => [r.id, r]));
const nextAssumptions = assumptions.map((a) => {
  const r = byId.get(a.id);
  const next = { ...a, verified: r.verified, verifiedDigest: digest(a.claim, a.evidence) };
  if (r.verified === false) next.note = r.note;
  else delete next.note;
  return next;
});
const merged = { ...spec, assumptions: nextAssumptions };
const { ok, errors } = validateSpec(merged);
if (!ok) {
  console.error('spec invalid after patch:\n' + errors.join('\n'));
  process.exit(1);
}
writeFileSync(specHtmlPath, renderSpecHtml(merged));
const pass = nextAssumptions.filter((a) => a.verified === true).length;
console.error(`annotated ${specHtmlPath}: ${pass}/${nextAssumptions.length} 现状假设核验通过`);
