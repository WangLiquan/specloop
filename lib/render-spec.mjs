import { htmlSafeJsonIsland, escHtml } from './escape.mjs';
import { THEME_CSS, CSP_META } from './theme.mjs';
import { effectiveVerified } from './digest.mjs';

// 生成时把 spec 烤成整页静态 HTML，并内嵌 application/json 数据岛。无任何渲染期脚本。
// 信息架构：spec.html 是给「人 review/拍板」看的——只有「待拍板」决策（open，含被跳过的）
// 与知情项 / 流程置顶展开抢注意力；现状假设 / 已拍板决策（decided）连同概述 / 其余小节 /
// 验收点一起折叠进 <details>（纯 HTML，无脚本）——保留可查，但不再占据顶部视觉。
export function renderSpecHtml(spec) {
  const decisions = spec.decisions || [];
  const awareness = spec.awareness || [];
  const sections = spec.sections || [];
  const criteria = spec.criteria || [];
  const assumptions = spec.assumptions || [];

  // 只有 open（该决策却没拍板 / 主动跳过）需要置顶催办；其余视为已定，折叠保留。
  const openDecisions = decisions.filter(d => d.status === 'open');
  const decidedDecisions = decisions.filter(d => d.status !== 'open');

  // 折叠判定：显式 collapsed 优先；否则 flow 展开、prose/table 折叠。
  const isCollapsed = s => (s.collapsed != null ? s.collapsed : s.type !== 'flow');
  const indexed = sections.map((s, i) => ({ s, n: i + 1 }));
  const openSections = indexed.filter(({ s }) => !isCollapsed(s));
  const foldSections = indexed.filter(({ s }) => isCollapsed(s));

  const body = [
    `<header class="masthead">`,
    `<p class="kicker">规格说明 · SPEC</p>`,
    `<h1>${escHtml(spec.meta.title)}</h1>`,
    `<p class="mast-meta">${mastMeta(spec, decisions, awareness, criteria)}</p>`,
    `</header>`,
    renderDecisions(openDecisions),
    renderAwareness(awareness),
    ...openSections.map(renderOpenSection),
    renderFoldZone(spec.summary, foldSections, criteria, decidedDecisions, spec.verdicts || [], assumptions)
  ].filter(Boolean).join('\n');
  return page(spec.meta.title, renderNav(spec, openSections, foldSections, openDecisions, awareness, criteria, decidedDecisions), body, spec);
}

function mastMeta(spec, decisions, awareness, criteria) {
  const parts = [];
  if (spec.meta.specId) parts.push(`<span><b>spec</b> ${escHtml(spec.meta.specId)}</span>`);
  if (spec.meta.revision != null) parts.push(`<span><b>rev</b> ${escHtml(spec.meta.revision)}</span>`);
  const open = decisions.filter(d => d.status === 'open').length;
  if (decisions.length) parts.push(`<span>${decisions.length} 决策${open ? ` · <b class="open-n">${open} 待拍板</b>` : ''}</span>`);
  if (awareness.length) parts.push(`<span>${awareness.length} 知情</span>`);
  parts.push(`<span>${criteria.length} 验收点</span>`);
  // 现状假设核验率：按 effectiveVerified 统计（applicable:false 时无 assumptions，自然不显示）
  const assumptions = spec.assumptions || [];
  if (assumptions.length) {
    const c = assumptionCounts(assumptions);
    parts.push(`<span class="cov-sum">现状假设 · <b class="cv pass">${c.ok}✓</b> <b class="cv fail">${c.no}✗</b>${c.pending ? ` <b class="cv na">${c.pending} 未核</b>` : ''}</span>`);
  }
  // 验过的 spec：mast 区直接亮覆盖率，收起折叠也一眼可见落地情况
  const verdicts = spec.verdicts || [];
  if (verdicts.length) {
    const counts = verdictCounts(criteria, verdicts);
    parts.push(`<span class="cov-sum">已验 · <b class="cv pass">${counts.pass}✓</b> <b class="cv partial">${counts.partial}~</b> <b class="cv fail">${counts.fail}✗</b>${counts.na ? ` <b class="cv na">${counts.na} na</b>` : ''}</span>`);
  }
  return parts.join('<span class="dot">·</span>');
}

// 按 criteria 顺序统计各状态计数：无 verdict 的 criterion 记 na
function verdictCounts(criteria, verdicts) {
  const byId = new Map(verdicts.map(v => [v.criterionId, v]));
  const counts = { pass: 0, partial: 0, fail: 0, na: 0 };
  for (const c of criteria) counts[(byId.get(c.id) || {}).status || 'na']++;
  return counts;
}

// 在「已转义」文本上做安全的 inline 强化。escHtml 不会转义数字/斜杠/¥/中文，
// 这些正则只包裹这类安全字符，绝不会还原被转义的 < > & 或引入可执行内容。
function decorate(safe) {
  return safe
    // 代码标识：foo.dart:232 / foo.dart:57-72 / snake_case_name
    .replace(/([A-Za-z_][\w]*\.(?:dart|mjs|js|ts|json)(?::\d+(?:-\d+)?)?|[a-z][a-z0-9]*(?:_[a-z0-9]+)+)/g, '<code>$1</code>')
    // 数字配比：12/15、0/2（仅纯数字，X/Y 这类字母不会命中）
    .replace(/(?<![\w>])(\d+\s*\/\s*\d+)(?![\w<])/g, '<b class="num">$1</b>')
    // 金额：¥59 / ¥59起 / ¥12.5起
    .replace(/(¥\d[\d.]*\s*起?)/g, '<b class="amt">$1</b>')
    // 状态词（先长后短，避免重叠误配）
    .replace(/(已匹配满|已匹配)/g, '<span class="st st-ok">$1</span>')
    .replace(/(暂无在售|未匹配)/g, '<span class="st st-na">$1</span>')
    .replace(/(部分匹配)/g, '<span class="st st-mid">$1</span>');
}
function enrich(raw) {
  return decorate(escHtml(raw));
}

// ── 待拍板决策：置顶、最醒目。只收 open——该决策却没拍板，或看到了却选择跳过 ──
function renderDecisions(openDecisions) {
  if (!openDecisions.length) return '';
  const items = openDecisions.map(decisionCard).join('');
  return `<section class="block decisions" id="decisions">` +
    `<h2><span class="card-n">◇</span>需要你决策</h2>${items}</section>`;
}

// 单张决策卡。open → 红边 + 「待拍板」；decided → 平铺 + 「已定」。置顶区与折叠区共用。
function decisionCard(d) {
  const status = d.status === 'open' ? 'open' : 'decided';
  const badge = status === 'open'
    ? `<span class="d-badge open">待拍板</span>`
    : `<span class="d-badge decided">已定</span>`;
  const resLabel = status === 'open' ? '暂定' : '拍板';
  const opts = Array.isArray(d.options) && d.options.length
    ? `<ul class="d-opts">${d.options.map(o => `<li>${enrich(o)}</li>`).join('')}</ul>` : '';
  const why = d.rationale ? `<p class="why"><span>依据</span>${enrich(d.rationale)}</p>` : '';
  return `<div class="decision ${status}" id="${escHtml(d.id)}">` +
    `<div class="d-h"><strong class="d-id">${escHtml(d.id)}</strong>${badge}</div>` +
    `<p class="d-q">${enrich(d.question)}</p>${opts}` +
    `<p class="d-res"><span class="d-res-l">${resLabel}</span>${enrich(d.resolution)}</p>${why}</div>`;
}

// ── 现状假设：spec 对现有代码/系统的事实断言 + 核验态。折叠保留，核验汇总走 mast 区。 ──
// 一律走 effectiveVerified（指纹失效→未核），不直读原始 verified，杜绝「页面 ✓ 但 gate 未核」。
function assumptionCounts(assumptions) {
  const c = { ok: 0, no: 0, pending: 0 };
  for (const a of assumptions) {
    const ev = effectiveVerified(a);
    c[ev === true ? 'ok' : ev === false ? 'no' : 'pending']++;
  }
  return c;
}

function assumptionItems(assumptions) {
  return assumptions.map(a => {
    const ev = effectiveVerified(a);
    const state = ev === true ? 'ok' : ev === false ? 'no' : 'pending';
    const badge = ev === true ? '✓ 已核' : ev === false ? '✗ 不符' : '未核';
    const note = ev === false && a.note ? `<p class="why"><span>不符</span>${enrich(a.note)}</p>` : '';
    return `<div class="decision asm-${state}" id="${escHtml(a.id)}">` +
      `<div class="d-h"><strong class="d-id">${escHtml(a.id)}</strong><span class="asm-badge ${state}">${badge}</span></div>` +
      `<p class="d-q">${enrich(a.claim)}</p>` +
      `<p class="asm-ev"><span>证据</span>${enrich(a.evidence)}</p>${note}</div>`;
  }).join('');
}

// ── 知情项：你该知道的影响/边界/风险，warning 标红 ──
function renderAwareness(awareness) {
  if (!awareness.length) return '';
  const items = awareness.map(a => {
    const sev = a.severity === 'warning' ? 'warning' : 'info';
    const ic = sev === 'warning' ? '!' : 'i';
    return `<div class="aware ${sev}" id="${escHtml(a.id)}">` +
      `<span class="aw-ic">${ic}</span><p class="aw-t">${enrich(a.text)}</p></div>`;
  }).join('');
  return `<section class="block awareness" id="awareness">` +
    `<h2><span class="card-n">▲</span>你需要知道</h2>${items}</section>`;
}

function renderInner(s) {
  if (s.type === 'prose') {
    return s.body.split(/\n+/).filter(p => p.trim()).map(p => `<p>${enrich(p)}</p>`).join('');
  }
  if (s.type === 'flow') {
    return `<ol class="flow">${s.steps.map(x => `<li>${enrich(x)}</li>`).join('')}</ol>`;
  }
  if (s.type === 'table') {
    return `<table>${s.rows.map((r, i) =>
      `<tr${i === 0 ? ' class="thead"' : ''}>${r.map(c => `<td>${enrich(c)}</td>`).join('')}</tr>`
    ).join('')}</table>`;
  }
  return '';
}

// 展开的小节（流程）——保留 card 视觉
function renderOpenSection({ s, n }) {
  return `<section id="${escHtml(s.id)}" class="card">` +
    `<h2><span class="card-n">${pad(n)}</span>${escHtml(s.title)}</h2>${renderInner(s)}</section>`;
}

// 折叠区：概述 + 已决策 + 折叠小节 + 验收点，各包一个 <details>，默认收起
function renderFoldZone(summary, foldSections, criteria, decidedDecisions = [], verdicts = [], assumptions = []) {
  const folds = [];
  if (summary) {
    folds.push(detail('summary', '概述', `<p>${enrich(summary)}</p>`));
  }
  if (assumptions.length) {
    folds.push(detail('assumptions', `现状假设 <span class="fold-n">${assumptions.length}</span>`,
      assumptionItems(assumptions)));
  }
  if (decidedDecisions.length) {
    folds.push(detail('decided', `已决策 <span class="fold-n">${decidedDecisions.length}</span>`,
      decidedDecisions.map(decisionCard).join(''), 'decided'));
  }
  for (const { s } of foldSections) {
    folds.push(detail(escHtml(s.id), escHtml(s.title), renderInner(s)));
  }
  if (criteria.length) {
    // 验过则展开（落地情况是回看重点），未验保持折叠
    const verified = verdicts.length > 0;
    const label = `验收点 <span class="fold-n">${criteria.length}</span>${verified ? ' <span class="fold-badge">已验</span>' : ''}`;
    folds.push(detail('criteria', label, criteriaInner(criteria, verdicts), 'criteria', verified));
  }
  if (!folds.length) return '';
  return `<section class="folds" id="details"><p class="folds-label">细节（默认折叠，按需展开）</p>${folds.join('')}</section>`;
}

function detail(id, label, inner, extra = '', open = false) {
  return `<details class="fold ${extra}"${open ? ' open' : ''} id="${id}">` +
    `<summary>${label}</summary><div class="fold-body">${inner}</div></details>`;
}

// 验收点清单。无 verdicts → 纯 spec（priority 标注）；有 verdicts → 每条 AC 叠加验收态
// （状态徽章 + 证据 file:line + 依据），区顶加覆盖率条。spec 即活文档：需求 + 落地情况合一。
function criteriaInner(criteria, verdicts = []) {
  const counts = { must: 0, should: 0, could: 0 };
  for (const c of criteria) if (counts[c.priority] != null) counts[c.priority]++;
  const legend = ['must', 'should', 'could']
    .map(p => `<span class="legend-chip"><span class="swatch ${p}"></span>${p} <b>${counts[p]}</b></span>`)
    .join('');

  const byId = new Map(verdicts.map(v => [v.criterionId, v]));
  const verified = verdicts.length > 0;
  const cov = verified ? coverageBar(criteria, verdicts) : '';

  const items = criteria.map(c => {
    const why = c.rationale ? `<p class="why"><span>依据</span>${enrich(c.rationale)}</p>` : '';
    const v = byId.get(c.id);
    const status = verified ? (v ? v.status : 'na') : '';
    const vcls = verified ? ` v-${status}` : '';
    const vbadge = verified ? `<span class="vstat ${status}">${escHtml(status)}</span>` : '';
    const vbody = verified ? renderVerdict(v) : '';
    return `<li class="ac ${escHtml(c.priority)}${vcls}" id="${escHtml(c.id)}" data-id="${escHtml(c.id)}">` +
      `<div class="ac-h"><strong class="ac-id">${escHtml(c.id)}</strong>` +
      `${vbadge}<span class="pri ${escHtml(c.priority)}">${escHtml(c.priority)}</span></div>` +
      `<p class="ac-t">${enrich(c.text)}</p>${why}${vbody}</li>`;
  }).join('');
  return `<div class="ac-legend">${legend}</div>${cov}<ul class="ac-list">${items}</ul>`;
}

// 覆盖率：占比色条 + 计数卡 + 「仅静态审查」横幅
function coverageBar(criteria, verdicts) {
  const counts = verdictCounts(criteria, verdicts);
  const total = criteria.length || 1;
  const onlyStatic = verdicts.length > 0 && verdicts.every(v => v.verificationMode === 'static_review');
  const bar = ['pass', 'partial', 'fail', 'na']
    .map(k => `<i class="${k}" style="width:${(counts[k] / total * 100).toFixed(2)}%"></i>`).join('');
  const dash = ['pass', 'partial', 'fail', 'na']
    .map(k => `<span class="chip ${k}"><span class="chip-n">${counts[k]}</span><span class="chip-l">${k}</span></span>`).join('');
  const banner = onlyStatic
    ? '<div class="banner"><span class="b-ic">⚠️</span><span>未运行测试：以下结论均为静态审查（static review），非真实执行验证。</span></div>'
    : '';
  return `<div class="cov"><div class="cov-bar">${bar}</div><div class="dash">${dash}</div>${banner}</div>`;
}

// 单条 AC 的验收明细：mode/confidence + 证据行（无证据则给 missingReason）+ 一句话依据
function renderVerdict(v) {
  if (!v) return `<div class="ac-v"><p class="v-exp">未给出判定（视为 na）</p></div>`;
  const ev = v.evidence && v.evidence.length
    ? v.evidence.map(e => `<div class="ev"><span><b>${escHtml(e.file)}</b>:${escHtml(e.line)}${e.note ? ' — ' + enrich(e.note) : ''}</span></div>`).join('')
    : `<div class="ev miss"><span>${enrich(v.missingEvidenceReason || '未定位到落地内容')}</span></div>`;
  const meta = `<div class="v-meta"><span>mode=<b>${escHtml(v.verificationMode)}</b></span>` +
    `<span>confidence=<b>${escHtml(v.confidence)}</b></span></div>`;
  return `<div class="ac-v">${meta}${ev}<p class="v-exp">${enrich(v.explanation)}</p></div>`;
}

function renderNav(spec, openSections, foldSections, openDecisions, awareness, criteria, decidedDecisions = []) {
  const links = [];
  if (openDecisions.length) links.push(navLink('#decisions', '◇', '待拍板', true));
  if (awareness.length) links.push(navLink('#awareness', '▲', '知情项', true));
  for (const { s, n } of openSections) links.push(navLink(`#${escHtml(s.id)}`, pad(n), escHtml(s.title)));
  // 折叠区
  const foldChildren = [];
  if (spec.summary) foldChildren.push(navLink('#summary', '·', '概述', false, true));
  if ((spec.assumptions || []).length) foldChildren.push(navLink('#assumptions', '·', '现状假设', false, true));
  if (decidedDecisions.length) foldChildren.push(navLink('#decided', '·', '已决策', false, true));
  for (const { s } of foldSections) foldChildren.push(navLink(`#${escHtml(s.id)}`, '·', escHtml(s.title), false, true));
  if (criteria.length) foldChildren.push(navLink('#criteria', '·', '验收点', false, true));
  if (foldChildren.length) {
    links.push(navLink('#details', '⋯', '细节', true));
    links.push(...foldChildren);
  }
  return `<nav class="toc">` +
    `<div class="brand"><span class="mark">◆</span> SpecForge</div>` +
    `<p class="toc-title">目录</p>${links.join('')}</nav>`;
}

function navLink(href, n, label, mark = false, child = false) {
  const cls = [mark ? 'is-mark' : '', child ? 'is-child' : ''].filter(Boolean).join(' ');
  return `<a href="${href}"${cls ? ` class="${cls}"` : ''}><span class="toc-n">${n}</span><span class="lbl">${label}</span></a>`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function page(title, nav, body, dataObj) {
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
${CSP_META}
<title>${escHtml(title)} · SpecForge</title>
<style>${THEME_CSS}</style>
</head>
<body>
${nav}
<main>${body}</main>
<script type="application/json" id="specforge-data">${htmlSafeJsonIsland(dataObj)}</script>
</body>
</html>`;
}
