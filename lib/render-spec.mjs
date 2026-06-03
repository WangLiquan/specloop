import { htmlSafeJsonIsland, escHtml } from './escape.mjs';
import { THEME_CSS, CSP_META } from './theme.mjs';

// 生成时把 spec 烤成整页静态 HTML，并内嵌 application/json 数据岛。无任何渲染期脚本。
export function renderSpecHtml(spec) {
  const body = [
    `<h1>${escHtml(spec.meta.title)}</h1>`,
    `<p class="summary">${escHtml(spec.summary)}</p>`,
    ...spec.sections.map(renderSection),
    renderCriteria(spec.criteria)
  ].join('\n');
  return page(spec.meta.title, body, spec);
}

function renderSection(s) {
  if (s.type === 'prose') return `<section><h2>${escHtml(s.title)}</h2><p>${escHtml(s.body)}</p></section>`;
  if (s.type === 'flow') return `<section><h2>${escHtml(s.title)}</h2><ol>${s.steps.map(x => `<li>${escHtml(x)}</li>`).join('')}</ol></section>`;
  if (s.type === 'table') return `<section><h2>${escHtml(s.title)}</h2><table>${s.rows.map(r => `<tr>${r.map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('')}</table></section>`;
  return '';
}

function renderCriteria(criteria) {
  const items = criteria.map(c =>
    `<li data-id="${escHtml(c.id)}"><strong>${escHtml(c.id)}</strong><span class="pri">${escHtml(c.priority)}</span>${escHtml(c.text)}</li>`
  ).join('');
  return `<section><h2>验收点</h2><ul>${items}</ul></section>`;
}

function page(title, body, dataObj) {
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
${CSP_META}
<title>${escHtml(title)} · SpecLoop</title>
<style>${THEME_CSS}</style>
</head>
<body>
<main>${body}</main>
<script type="application/json" id="specloop-data">${htmlSafeJsonIsland(dataObj)}</script>
</body>
</html>`;
}
