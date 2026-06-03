import { htmlSafeJsonIsland, escHtml } from './escape.mjs';
import { THEME_CSS, CSP_META } from './theme.mjs';

export function renderReportHtml(spec, verdicts, specHash) {
  const byId = new Map(verdicts.map(v => [v.criterionId, v]));
  const counts = { pass: 0, partial: 0, fail: 0, na: 0 };
  for (const c of spec.criteria) {
    const v = byId.get(c.id);
    counts[v ? v.status : 'na']++;
  }
  const total = spec.criteria.length || 1;
  const onlyStatic = verdicts.length > 0 && verdicts.every(v => v.verificationMode === 'static_review');

  const island = { ...spec, verdicts, report: { boundSpecHash: specHash, generatedBy: 'specforge-verify' } };

  // 覆盖率条：各状态按占比分段
  const bar = ['pass', 'partial', 'fail', 'na']
    .map(k => `<i class="${k}" style="width:${(counts[k] / total * 100).toFixed(2)}%"></i>`).join('');

  // 计数卡：大号数字 + 等宽标签（保留 ">N<" 供测试匹配）
  const dash = ['pass', 'partial', 'fail', 'na']
    .map(k => `<span class="chip ${k}"><span class="chip-n">${counts[k]}</span><span class="chip-l">${k}</span></span>`).join('');

  const banner = onlyStatic
    ? '<div class="banner"><span class="b-ic">⚠️</span><span>未运行测试：以下结论均为静态审查（static review），非真实执行验证。</span></div>'
    : '';

  const rows = spec.criteria.map(c => {
    const v = byId.get(c.id);
    const status = v ? v.status : 'na';
    const ev = v && v.evidence.length
      ? v.evidence.map(e => `<div class="ev"><span><b>${escHtml(e.file)}</b>:${escHtml(e.line)}${e.note ? ' — ' + escHtml(e.note) : ''}</span></div>`).join('')
      : `<div class="ev"><span>${escHtml(v && v.missingEvidenceReason || '无证据')}</span></div>`;
    return `<div class="verdict ${status}" id="${escHtml(c.id)}">` +
      `<div class="v-h"><strong class="ac-id">${escHtml(c.id)}</strong>` +
      `<span class="vstat ${status}">${escHtml(status)}</span>` +
      `<span class="v-t">${escHtml(c.text)}</span></div>` +
      `<div class="v-meta"><span>mode=<b>${escHtml(v ? v.verificationMode : 'na')}</b></span>` +
      `<span>confidence=<b>${escHtml(v ? v.confidence : '-')}</b></span></div>` +
      `${ev}` +
      `<p>${escHtml(v ? v.explanation : '未给出判定')}</p></div>`;
  }).join('\n');

  const body = `<header class="masthead">
<p class="kicker">校验报告 · REPORT</p>
<h1>${escHtml(spec.meta.title)} · 校验报告</h1>
<p class="meta">bound spec hash <code>${escHtml(specHash)}</code> · revision ${escHtml(spec.meta.revision)}</p>
</header>
<section class="dashboard">
<div class="cov-bar">${bar}</div>
<div class="dash">${dash}</div>
</section>
${banner}
<div class="verdicts">${rows}</div>`;

  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
${CSP_META}
<title>${escHtml(spec.meta.title)} 校验报告 · SpecForge</title>
<style>${THEME_CSS}</style>
</head>
<body>
<main>${body}</main>
<script type="application/json" id="specforge-data">${htmlSafeJsonIsland(island)}</script>
</body>
</html>`;
}
