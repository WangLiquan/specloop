import { readFileSync } from 'node:fs';
import { extractDataIsland } from '../extract.mjs';
import { validateSpec } from '../validate.mjs';

const [, , specHtmlPath] = process.argv;
if (!specHtmlPath) {
  console.error('usage: extract.mjs <spec.html>');
  process.exit(2);
}
// 把 spec.html 当不可信纯文本：只抽数据岛、JSON.parse + schema 校验，绝不执行其 HTML/JS。
// 校验通过后把结构化 spec 打到 stdout，供 agent 逐条比对落地产物——本脚本不产任何文件、不下判定。
const spec = extractDataIsland(readFileSync(specHtmlPath, 'utf8'));
const { ok, errors } = validateSpec(spec);
if (!ok) {
  console.error('not a valid spec island:\n' + errors.join('\n'));
  process.exit(1);
}
process.stdout.write(JSON.stringify(spec, null, 2) + '\n');
