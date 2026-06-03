// 极严 CSP：无 script-src（任何 inline/外链脚本都不执行）；样式仅允许 inline；图片仅本地/data。
export const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; ' +
  'style-src \'unsafe-inline\'; img-src \'self\' data:; base-uri \'none\'; form-action \'none\'">';

export const THEME_CSS = `
:root{--ok:#1a7f37;--partial:#9a6700;--fail:#cf222e;--na:#6e7781;--bg:#fff;--fg:#1f2328;--mut:#656d76;--line:#d0d7de}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--fg);background:var(--bg);line-height:1.6}
main{max-width:860px;margin:0 auto;padding:32px 20px}
h1{font-size:1.7rem;margin:0 0 .3em}
h2{font-size:1.15rem;margin:1.6em 0 .4em;padding-bottom:.2em;border-bottom:1px solid var(--line)}
.summary{color:var(--mut)}
section ol,section ul{padding-left:1.3em}
table{border-collapse:collapse;width:100%}
td{border:1px solid var(--line);padding:6px 10px}
.pri{font-size:.72rem;color:var(--mut);border:1px solid var(--line);border-radius:10px;padding:1px 7px;margin:0 4px}
.dash{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 18px}
.chip{border-radius:8px;padding:6px 12px;color:#fff;font-size:.85rem}
.chip.pass{background:var(--ok)}.chip.partial{background:var(--partial)}.chip.fail{background:var(--fail)}.chip.na{background:var(--na)}
.banner{background:#fff8c5;border:1px solid #d4a72c;border-radius:8px;padding:10px 14px;margin:12px 0}
.verdict{border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:8px 0}
.verdict.pass{border-left:4px solid var(--ok)}.verdict.partial{border-left:4px solid var(--partial)}
.verdict.fail{border-left:4px solid var(--fail)}.verdict.na{border-left:4px solid var(--na)}
.ev{font-family:ui-monospace,monospace;font-size:.82rem;color:var(--mut)}
.meta{color:var(--mut);font-size:.8rem}
`.trim();
