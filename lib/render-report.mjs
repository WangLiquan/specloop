import { htmlSafeJsonIsland, escHtml } from './escape.mjs';
import { THEME_CSS, CSP_META } from './theme.mjs';

export function renderReportHtml(spec, verdicts, specHash) {
  const byId = new Map(verdicts.map(v => [v.criterionId, v]));
  const counts = { pass: 0, partial: 0, fail: 0, na: 0 };
  for (const c of spec.criteria) {
    const v = byId.get(c.id);
    counts[v ? v.status : 'na']++;
  }
  const onlyStatic = verdicts.length > 0 && verdicts.every(v => v.verificationMode === 'static_review');

  const island = { ...spec, verdicts, report: { boundSpecHash: specHash, generatedBy: 'specforge-verify' } };

  const dash = ['pass', 'partial', 'fail', 'na']
    .map(k => `<span class="chip ${k}">${k} ${counts[k]}</span>`).join('');

  const banner = onlyStatic
    ? '<div class="banner">⚠️ 未运行测试：以下结论均为静态审查（static review），非真实执行验证。</div>'
    : '';

  const rows = spec.criteria.map(c => {
    const v = byId.get(c.id);
    const status = v ? v.status : 'na';
    const ev = v && v.evidence.length
      ? v.evidence.map(e => `<div class="ev">${escHtml(e.file)}:${escHtml(e.line)}${e.note ? ' — ' + escHtml(e.note) : ''}</div>`).join('')
      : `<div class="ev">${escHtml(v && v.missingEvidenceReason || '无证据')}</div>`;
    return `<div class="verdict ${status}"><strong>${escHtml(c.id)}</strong> [${escHtml(status)}] ${escHtml(c.text)}
<div class="meta">mode=${escHtml(v ? v.verificationMode : 'na')} · confidence=${escHtml(v ? v.confidence : '-')}</div>
${ev}
<p>${escHtml(v ? v.explanation : '未给出判定')}</p></div>`;
  }).join('\n');

  const body = `<h1>${escHtml(spec.meta.title)} · 校验报告</h1>
<p class="meta">bound spec hash: ${escHtml(specHash)} · revision ${escHtml(spec.meta.revision)}</p>
<div class="dash">${dash}</div>
${banner}
${rows}`;

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
