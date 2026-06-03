import { htmlSafeJsonIsland, escHtml } from './escape.mjs';
import { THEME_CSS, CSP_META } from './theme.mjs';

// 生成时把 spec 烤成整页静态 HTML，并内嵌 application/json 数据岛。无任何渲染期脚本。
// 信息架构：spec.html 是给「人 review/拍板」看的——只有「待拍板」决策（open，含被跳过的）
// 与知情项 / 流程置顶展开抢注意力；已拍板决策（decided）连同概述 / 其余小节 / 验收点
// 一起折叠进 <details>（纯 HTML，无脚本）——保留可查，但不再占据顶部视觉。
export function renderSpecHtml(spec) {
  const decisions = spec.decisions || [];
  const awareness = spec.awareness || [];
  const sections = spec.sections || [];
  const criteria = spec.criteria || [];

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
    renderFoldZone(spec.summary, foldSections, criteria, decidedDecisions)
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
  return parts.join('<span class="dot">·</span>');
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
function renderFoldZone(summary, foldSections, criteria, decidedDecisions = []) {
  const folds = [];
  if (summary) {
    folds.push(detail('summary', '概述', `<p>${enrich(summary)}</p>`));
  }
  if (decidedDecisions.length) {
    folds.push(detail('decided', `已决策 <span class="fold-n">${decidedDecisions.length}</span>`,
      decidedDecisions.map(decisionCard).join(''), 'decided'));
  }
  for (const { s } of foldSections) {
    folds.push(detail(escHtml(s.id), escHtml(s.title), renderInner(s)));
  }
  if (criteria.length) {
    folds.push(detail('criteria', `验收点 <span class="fold-n">${criteria.length}</span>`, criteriaInner(criteria), 'criteria'));
  }
  if (!folds.length) return '';
  return `<section class="folds" id="details"><p class="folds-label">细节（默认折叠，按需展开）</p>${folds.join('')}</section>`;
}

function detail(id, label, inner, extra = '') {
  return `<details class="fold ${extra}" id="${id}">` +
    `<summary>${label}</summary><div class="fold-body">${inner}</div></details>`;
}

function criteriaInner(criteria) {
  const counts = { must: 0, should: 0, could: 0 };
  for (const c of criteria) if (counts[c.priority] != null) counts[c.priority]++;
  const legend = ['must', 'should', 'could']
    .map(p => `<span class="legend-chip"><span class="swatch ${p}"></span>${p} <b>${counts[p]}</b></span>`)
    .join('');
  const items = criteria.map(c => {
    const why = c.rationale ? `<p class="why"><span>依据</span>${enrich(c.rationale)}</p>` : '';
    return `<li class="ac ${escHtml(c.priority)}" id="${escHtml(c.id)}" data-id="${escHtml(c.id)}">` +
      `<div class="ac-h"><strong class="ac-id">${escHtml(c.id)}</strong>` +
      `<span class="pri ${escHtml(c.priority)}">${escHtml(c.priority)}</span></div>` +
      `<p class="ac-t">${enrich(c.text)}</p>${why}</li>`;
  }).join('');
  return `<div class="ac-legend">${legend}</div><ul class="ac-list">${items}</ul>`;
}

function renderNav(spec, openSections, foldSections, openDecisions, awareness, criteria, decidedDecisions = []) {
  const links = [];
  if (openDecisions.length) links.push(navLink('#decisions', '◇', '待拍板', true));
  if (awareness.length) links.push(navLink('#awareness', '▲', '知情项', true));
  for (const { s, n } of openSections) links.push(navLink(`#${escHtml(s.id)}`, pad(n), escHtml(s.title)));
  // 折叠区
  const foldChildren = [];
  if (spec.summary) foldChildren.push(navLink('#summary', '·', '概述', false, true));
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
