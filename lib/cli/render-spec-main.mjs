import { readFileSync, writeFileSync } from 'node:fs';
import { validateSpec } from '../validate.mjs';
import { renderSpecHtml } from '../render-spec.mjs';

const args = process.argv.slice(2);
const allowOpen = args.includes('--allow-open');
const [inPath, outPath] = args.filter((a) => !a.startsWith('--'));
if (!inPath || !outPath) {
  console.error('usage: render.mjs <spec.json> <out.spec.html> [--allow-open]');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(inPath, 'utf8'));

// 友好结构 gate：先于 schema 校验，故对错误类型防御、不在 AJV 前崩；缺 evidence 时列出 assumption id。
// 不强制 assumptionReview 存在——存量 spec 兼容，强制声明落在 check-ready 交付关（D-15）。
const ar = spec.assumptionReview;
const asm = Array.isArray(spec.assumptions) ? spec.assumptions : null;
const structErrors = [];
if (ar && typeof ar === 'object' && typeof ar.applicable === 'boolean') {
  if (ar.applicable === true && (!asm || asm.length === 0)) {
    structErrors.push('assumptionReview.applicable=true 但 assumptions 为空——必须列出现状假设，或改 applicable:false');
  }
  if (ar.applicable === false && asm && asm.length > 0) {
    structErrors.push('assumptionReview.applicable=false 却携带 assumptions——applicable:false 时不得有现状假设（否则绕过核验）');
  }
}
if (asm) {
  asm.forEach((a, i) => {
    const id = a && typeof a.id === 'string' ? a.id : `#${i}`;
    const ev = a && a.evidence;
    if (typeof ev !== 'string' || ev.trim() === '') {
      structErrors.push(`assumption ${id} 缺 evidence——现状断言必须带 file:line 锚点（逼你去读代码、别猜）`);
    }
  });
}
if (structErrors.length) {
  console.error('拒绝生成：现状假设（assumptions）结构不合规：\n' + structErrors.map((e) => '  - ' + e).join('\n'));
  process.exit(3);
}

const { ok, errors } = validateSpec(spec);
if (!ok) {
  console.error('spec invalid:\n' + errors.join('\n'));
  process.exit(1);
}

// Gate：spec 不该带着悬而未决项交付。任一 status:"open" 决策都拒绝渲染，
// 逼着先逐条 ask user 拷问到 decided。唯一例外是 user 明确说「先跳过」→ --allow-open。
const open = (spec.decisions || []).filter((d) => d.status === 'open');
if (open.length && !allowOpen) {
  console.error(
    `拒绝生成：还有 ${open.length} 个待拍板决策（status:"open"）未收敛。\n` +
      'spec 不该带着悬而未决项交付——先逐条 ask user 把它们拷问到 status:"decided"：\n' +
      open.map((d) => `  - ${d.id ?? '?'}: ${d.question ?? ''}`).join('\n') +
      '\n\n只有 user 明确说「先跳过 / 先生成」时，才显式加 --allow-open 放行。'
  );
  process.exit(3);
}
if (open.length && allowOpen) {
  console.error(
    `⚠ 带 ${open.length} 个 open 决策生成（--allow-open 已豁免）：` +
      open.map((d) => d.id ?? '?').join(', ')
  );
}

writeFileSync(outPath, renderSpecHtml(spec));
console.error('wrote ' + outPath);
