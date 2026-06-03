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
