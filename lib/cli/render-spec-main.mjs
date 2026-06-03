import { readFileSync, writeFileSync } from 'node:fs';
import { validateSpec } from '../validate.mjs';
import { renderSpecHtml } from '../render-spec.mjs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: render.mjs <spec.json> <out.spec.html>');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(inPath, 'utf8'));
const { ok, errors } = validateSpec(spec);
if (!ok) {
  console.error('spec invalid:\n' + errors.join('\n'));
  process.exit(1);
}
writeFileSync(outPath, renderSpecHtml(spec));
console.error('wrote ' + outPath);
