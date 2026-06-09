import { readFileSync, writeFileSync } from 'node:fs';
import { extractDataIsland } from '../extract.mjs';
import { validateSpec } from '../validate.mjs';
import { renderSpecHtml } from '../render-spec.mjs';

const [, , specHtmlPath, verdictsPath] = process.argv;
if (!specHtmlPath || !verdictsPath) {
  console.error('usage: annotate.mjs <spec.html> <verdicts.json>');
  process.exit(2);
}
// 把判定回写进源 spec.html：抽数据岛 → 校验 generator 自产 → 合并 verdicts → 校验 → 原地重渲染。
// 只写回 specforge-draft 自产的 spec；外部 generator（如 echo-spec）拒绝写回（exit 3），避免重渲染抹掉其风格。
const spec = extractDataIsland(readFileSync(specHtmlPath, 'utf8'));
if (!/^specforge-draft\b/.test(spec.generator || '')) {
  console.error(`拒绝写回：generator="${spec.generator}" 非 specforge-draft 自产 spec。判定结果请看对话摘要，勿改源 spec。`);
  process.exit(3);
}
const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8'));
const merged = { ...spec, verdicts, verifiedAt: new Date().toISOString() };
const { ok, errors } = validateSpec(merged);
if (!ok) {
  console.error('spec+verdicts invalid:\n' + errors.join('\n'));
  process.exit(1);
}
writeFileSync(specHtmlPath, renderSpecHtml(merged));
console.error(`annotated ${specHtmlPath} (${verdicts.length} verdicts)`);
