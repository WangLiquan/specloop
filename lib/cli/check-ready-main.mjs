import { readFileSync } from 'node:fs';
import { extractDataIsland } from '../extract.mjs';
import { validateSpec } from '../validate.mjs';
import { effectiveVerified } from '../digest.mjs';

const [, , specHtmlPath] = process.argv;
if (!specHtmlPath) {
  console.error('usage: check-ready.mjs <spec.html>');
  process.exit(2);
}
// 交付就绪 gate（与 render 分离，D-10）：把 spec.html 当不可信文本抽数据岛（extractDataIsland 纯
// JSON.parse、不执行 HTML）→ schema 校验 → 判现状假设核验是否就绪。
// 强制声明落点（D-15）：缺 assumptionReview → 拒交付（render 不拦，强制声明只在交付关把守）。
const spec = extractDataIsland(readFileSync(specHtmlPath, 'utf8'));
const { ok, errors } = validateSpec(spec);
if (!ok) {
  console.error('spec invalid:\n' + errors.join('\n'));
  process.exit(1);
}
if (!spec.assumptionReview) {
  console.error('未就绪：缺 assumptionReview 声明。交付前必须显式表态本 spec 是否涉及对现有代码/系统的断言（applicable + reason）。');
  process.exit(3);
}
if (spec.assumptionReview.applicable === false) {
  console.error('就绪：applicable:false（本 spec 无现状假设需核验）。');
  process.exit(0);
}
// applicable:true → 必须有非空 assumptions 且每条 effectiveVerified===true（未核/不符/指纹失效都不就绪）
const assumptions = spec.assumptions || [];
if (assumptions.length === 0) {
  console.error('未就绪：applicable:true 但无 assumptions（应列出现状假设，或改 applicable:false）。');
  process.exit(3);
}
const unready = assumptions.filter((a) => effectiveVerified(a) !== true);
if (unready.length) {
  console.error(
    `未就绪：${unready.length}/${assumptions.length} 条现状假设未通过核验（未核 / 不符 / claim·evidence 改动致指纹失效需重核）：\n` +
      unready
        .map((a) => {
          const ev = effectiveVerified(a);
          const why = ev === false ? '不符' : a.verifiedDigest == null ? '未核' : '已改动·需重核';
          return `  - ${a.id}: ${why}${a.note ? ' — ' + a.note : ''}`;
        })
        .join('\n')
  );
  process.exit(3);
}
console.error(`就绪：${assumptions.length} 条现状假设全部核验通过 ✓`);
