// 极严 CSP：无 script-src（任何 inline/外链脚本都不执行）；样式仅允许 inline；图片仅本地/data。
// 注意：不放 font-src（回落 default-src 'none'），因此**不能引外链/嵌入字体**——
// 设计上坚持系统字体栈，把等宽字体当作结构性视觉语言（编号、AC-ID、证据、元信息）。
export const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; ' +
  'style-src \'unsafe-inline\'; img-src \'self\' data:; base-uri \'none\'; form-action \'none\'">';

// 单一样式表，spec.html 与 report.html 共用。「锻造规格」风：暖纸白 / 冷炭黑双主题，
// 跟随系统自动切换（纯 CSS prefers-color-scheme）；单一靛蓝强调色 + 语义状态色；
// 发丝线 + 留白 + 编号小节 + 等宽点缀。spec 用左侧 sticky 目录（锚点跳转），
// report 无 <nav> 仅 <main>，flex 容器下 margin:auto 居中。
// 所有交互（锚点跳转、:target 高亮）纯 CSS、无任何脚本，满足 CSP。
export const THEME_CSS = `
:root{
  color-scheme:light dark;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,"JetBrains Mono",Menlo,Consolas,monospace;
  --bg:#fbfaf8;--surface:#f3f0e9;--raised:#fffefb;
  --fg:#1b1a17;--mut:#6c685f;--faint:#9b958a;
  --line:#e8e3d8;--line-2:#dad4c7;
  --accent:oklch(0.52 0.15 266);--accent-soft:oklch(0.52 0.15 266 / .10);--accent-ink:oklch(0.46 0.16 266);
  --ok:#1a7f37;--partial:#9a6700;--fail:#cf222e;--na:#6e7781;
  --ok-bg:#e6f3e9;--partial-bg:#fbf2dd;--fail-bg:#fbe8e8;--na-bg:#edeff1;
  --must:#c0392f;--should:#9a6700;--could:#8a857b;
  --shadow:0 1px 2px rgba(40,36,28,.04),0 10px 30px -18px rgba(40,36,28,.22);
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#14161b;--surface:#1b1e25;--raised:#1d2129;
    --fg:#e7e8ea;--mut:#9aa0a8;--faint:#6d727c;
    --line:#262a32;--line-2:#343a47;
    --accent:oklch(0.74 0.13 266);--accent-soft:oklch(0.74 0.13 266 / .16);--accent-ink:oklch(0.81 0.12 266);
    --ok:#3fb950;--partial:#d29922;--fail:#f85149;--na:#8b949e;
    --ok-bg:#10271a;--partial-bg:#2a220f;--fail-bg:#2c1416;--na-bg:#1d2026;
    --must:#f0786f;--should:#d8a23a;--could:#8b949e;
    --shadow:0 1px 2px rgba(0,0,0,.34),0 14px 36px -20px rgba(0,0,0,.66);
  }
}
*{box-sizing:border-box}
::selection{background:var(--accent-soft);color:var(--accent-ink)}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--sans);color:var(--fg);background:var(--bg);line-height:1.65;
  font-size:16px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  display:flex;align-items:flex-start;background-image:radial-gradient(var(--line) 0.5px,transparent 0.5px);background-size:22px 22px;background-attachment:fixed}

/* ── 左侧目录（仅 spec.html） ── */
nav.toc{position:sticky;top:0;align-self:flex-start;flex:0 0 248px;width:248px;max-height:100vh;
  overflow:auto;padding:34px 16px 34px 30px;font-size:.875rem;border-right:1px solid var(--line)}
nav.toc .brand{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-weight:600;
  font-size:.82rem;letter-spacing:-.01em;color:var(--fg);margin:0 0 26px;padding-left:11px}
nav.toc .brand .mark{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;
  border-radius:5px;background:var(--accent);color:#fff;font-size:.6rem}
nav.toc .toc-title{font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.14em;
  color:var(--faint);margin:0 0 10px;padding-left:11px}
nav.toc a{display:flex;gap:10px;align-items:baseline;padding:6px 11px;margin:1px 0;border-radius:7px;
  color:var(--mut);text-decoration:none;border-left:2px solid transparent;
  overflow:hidden;white-space:nowrap;transition:background .12s,color .12s,border-color .12s}
nav.toc a .toc-n{font-family:var(--mono);font-size:.7rem;color:var(--faint);font-variant-numeric:tabular-nums;flex:0 0 auto}
nav.toc a span.lbl{overflow:hidden;text-overflow:ellipsis}
nav.toc a:hover{background:var(--surface);color:var(--fg)}
nav.toc a:hover .toc-n{color:var(--accent)}
nav.toc a.is-mark .toc-n{color:var(--accent)}

main{flex:1;min-width:0;max-width:792px;margin:0 auto;padding:64px 56px 120px}

/* ── 报头 ── */
.masthead{margin:0 0 14px}
.kicker{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:.7rem;
  text-transform:uppercase;letter-spacing:.16em;color:var(--accent-ink);font-weight:600;margin:0 0 18px}
.kicker::before{content:"";width:26px;height:2px;background:var(--accent);border-radius:2px;display:inline-block}
h1{font-size:2.3rem;font-weight:700;margin:0 0 .42em;line-height:1.13;letter-spacing:-.025em;text-wrap:balance}
.mast-meta{display:flex;flex-wrap:wrap;gap:7px 14px;font-family:var(--mono);font-size:.74rem;color:var(--mut);margin:0}
.mast-meta b{font-weight:600;color:var(--fg)}
.mast-meta .dot{color:var(--line-2)}
.mast-meta code{background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:.5px 6px;color:var(--accent-ink)}

/* ── 概述 hero ── */
.hero{position:relative;background:var(--raised);border:1px solid var(--line);border-radius:14px;
  padding:22px 26px 22px 28px;margin:30px 0 8px;box-shadow:var(--shadow)}
.hero::before{content:"";position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:3px;background:var(--accent)}
.hero .hero-label{font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.14em;
  color:var(--accent-ink);font-weight:600;margin:0 0 8px}
.hero p{margin:0;color:var(--fg);font-size:1.08rem;line-height:1.6}

/* ── 小节 ── */
.card{margin:54px 0 0;scroll-margin-top:24px}
.card>h2{display:flex;align-items:baseline;gap:12px;font-size:1.28rem;font-weight:650;margin:0 0 .85em;
  padding-bottom:.5em;border-bottom:1px solid var(--line);letter-spacing:-.01em}
.card>h2 .card-n{font-family:var(--mono);font-size:.82rem;font-weight:600;color:var(--accent);
  font-variant-numeric:tabular-nums;letter-spacing:0}
.card:target{border-radius:12px;background:var(--accent-soft);padding:4px 18px 18px;margin-left:-18px;margin-right:-18px}
.card p{margin:.7em 0}
.card>ol,.card>ul{padding-left:0;margin:.6em 0}

/* 流程：等宽计数器 */
ol.flow{list-style:none;counter-reset:step;padding:0;margin:.7em 0}
ol.flow li{counter-increment:step;position:relative;padding:0 0 0 44px;margin:0 0 .55em;min-height:26px;display:flex;align-items:center}
ol.flow li::before{content:counter(step,decimal-leading-zero);position:absolute;left:0;top:0;
  width:28px;height:28px;border-radius:8px;background:var(--surface);border:1px solid var(--line-2);
  font-family:var(--mono);font-size:.74rem;font-weight:600;color:var(--accent-ink);
  display:flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}
ol.flow li:not(:last-child)::after{content:"";position:absolute;left:13.5px;top:28px;bottom:-.55em;width:1px;background:var(--line-2)}

/* 普通列表（防御性，schema 暂不产出 bullet） */
.card ul.bul{list-style:none;padding:0}
.card ul.bul li{position:relative;padding-left:20px;margin:.35em 0}
.card ul.bul li::before{content:"";position:absolute;left:4px;top:.72em;width:5px;height:5px;border-radius:50%;background:var(--accent)}

/* inline 强调 */
.num{font-weight:650;font-variant-numeric:tabular-nums}
.amt{font-weight:600}
.st{font-weight:600}.st-ok{color:var(--ok)}.st-na{color:var(--na)}.st-mid{color:var(--should)}
code{background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:.5px 5px;
  font-family:var(--mono);font-size:.84em;color:var(--accent-ink)}

/* 表格 */
table{border-collapse:separate;border-spacing:0;width:100%;margin:.7em 0;font-size:.95rem;
  border:1px solid var(--line);border-radius:11px;overflow:hidden;box-shadow:var(--shadow)}
td{border-bottom:1px solid var(--line);border-right:1px solid var(--line);padding:9px 14px;vertical-align:top}
tr td:last-child{border-right:none}
tr:last-child td{border-bottom:none}
tr.thead td{background:var(--surface);font-weight:600;font-size:.8rem;text-transform:uppercase;
  letter-spacing:.05em;color:var(--mut)}
tr:not(.thead) td:first-child{font-family:var(--mono);font-size:.88rem;color:var(--accent-ink)}

/* ── 验收点 ── */
.criteria .ac-legend{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 22px}
.legend-chip{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:.72rem;
  color:var(--mut);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:4px 11px}
.legend-chip b{color:var(--fg);font-variant-numeric:tabular-nums}
.legend-chip .swatch{width:8px;height:8px;border-radius:50%}
.swatch.must{background:var(--must)}.swatch.should{background:var(--should)}.swatch.could{background:var(--could)}

.ac-list{list-style:none;padding:0;margin:0}
.ac{position:relative;background:var(--raised);border:1px solid var(--line);border-left:3px solid var(--could);
  border-radius:0 12px 12px 0;padding:15px 18px 16px;margin:0;scroll-margin-top:24px;transition:box-shadow .14s,transform .14s}
.ac+.ac{margin-top:12px}
.ac.must{border-left-color:var(--must)}
.ac.should{border-left-color:var(--should)}
.ac.could{border-left-color:var(--could)}
.ac:target{box-shadow:var(--shadow);transform:translateX(2px)}
.ac:target.must{background:linear-gradient(90deg,var(--fail-bg),var(--raised) 60%)}
.ac:target.should{background:linear-gradient(90deg,var(--partial-bg),var(--raised) 60%)}
.ac .ac-h{display:flex;align-items:center;gap:11px;margin-bottom:5px}
.ac .ac-id{font-family:var(--mono);font-size:.84rem;font-weight:650;color:var(--fg);letter-spacing:-.01em}
.ac .ac-t{margin:0;color:var(--fg);font-size:1.02rem;line-height:1.5}
.ac .why{margin:9px 0 0;font-size:.85rem;color:var(--mut);line-height:1.55}
.ac .why span{font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--faint);margin-right:9px}
.pri{margin-left:auto;font-family:var(--mono);font-size:.64rem;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;padding:3px 9px;border-radius:20px;border:1px solid currentColor}
.pri.must{color:var(--must)}.pri.should{color:var(--should)}.pri.could{color:var(--could)}

/* ── 决策点 / 知情项（置顶一等内容） ── */
.block{margin:42px 0 0;scroll-margin-top:24px}
.block>h2{display:flex;align-items:baseline;gap:12px;font-size:1.28rem;font-weight:650;margin:0 0 .7em;
  padding-bottom:.5em;border-bottom:1px solid var(--line);letter-spacing:-.01em}
.block>h2 .card-n{font-family:var(--mono);font-size:1rem;color:var(--accent);font-weight:600}
.mast-meta .open-n{color:var(--fail)}

.decision{position:relative;background:var(--raised);border:1px solid var(--line);border-left:3px solid var(--accent);
  border-radius:0 12px 12px 0;padding:15px 18px 16px;margin:12px 0;scroll-margin-top:24px;box-shadow:var(--shadow)}
.decision.open{border-left-color:var(--fail);background:linear-gradient(90deg,var(--fail-bg),var(--raised) 55%)}
.decision .d-h{display:flex;align-items:center;gap:11px;margin-bottom:6px}
.decision .d-id{font-family:var(--mono);font-size:.84rem;font-weight:650;color:var(--fg)}
.d-badge{font-family:var(--mono);font-size:.64rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  padding:3px 9px;border-radius:20px}
.d-badge.open{background:var(--fail);color:#fff}
.d-badge.decided{color:var(--mut);border:1px solid var(--line);background:var(--surface)}
.decision .d-q{margin:0 0 8px;font-size:1.05rem;font-weight:600;color:var(--fg);line-height:1.5}
.d-opts{list-style:none;padding:0;margin:0 0 9px;display:flex;flex-wrap:wrap;gap:6px}
.d-opts li{font-family:var(--mono);font-size:.8rem;color:var(--mut);background:var(--surface);
  border:1px solid var(--line);border-radius:7px;padding:3px 9px}
.decision .d-res{margin:0;font-size:1rem;color:var(--fg);line-height:1.55}
.d-res-l{font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--accent-ink);margin-right:9px;font-weight:700}
.decision .why{margin:9px 0 0;font-size:.85rem;color:var(--mut);line-height:1.55}
.decision .why span{font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--faint);margin-right:9px}

.aware{display:flex;gap:11px;align-items:flex-start;background:var(--raised);border:1px solid var(--line);
  border-radius:11px;padding:12px 15px;margin:10px 0;scroll-margin-top:24px}
.aware .aw-ic{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-family:var(--mono);font-size:.74rem;font-weight:700;color:#fff;margin-top:1px}
.aware.info{border-left:3px solid var(--accent)}
.aware.info .aw-ic{background:var(--accent)}
.aware.warning{border-left:3px solid var(--partial);background:linear-gradient(90deg,var(--partial-bg),var(--raised) 55%)}
.aware.warning .aw-ic{background:var(--partial)}
.aware .aw-t{margin:0;font-size:1rem;color:var(--fg);line-height:1.55}

/* ── 折叠区（概述 / 其余小节 / 验收点，默认收起） ── */
.folds{margin:48px 0 0;border-top:1px dashed var(--line-2);padding-top:18px}
.folds-label{font-family:var(--mono);font-size:.68rem;text-transform:uppercase;letter-spacing:.12em;
  color:var(--faint);margin:0 0 12px}
details.fold{border:1px solid var(--line);border-radius:10px;background:var(--raised);margin:8px 0}
details.fold>summary{cursor:pointer;list-style:none;padding:12px 16px;font-weight:600;font-size:1rem;
  color:var(--fg);display:flex;align-items:center;gap:9px;user-select:none;scroll-margin-top:24px}
details.fold>summary::-webkit-details-marker{display:none}
details.fold>summary::before{content:"\\203A";font-family:var(--mono);color:var(--accent);font-weight:700;
  transition:transform .15s;display:inline-block}
details.fold[open]>summary::before{transform:rotate(90deg)}
details.fold[open]>summary{border-bottom:1px solid var(--line)}
.fold-n{font-family:var(--mono);font-size:.76rem;color:var(--mut);background:var(--surface);
  border:1px solid var(--line);border-radius:20px;padding:1px 9px;margin-left:auto}
.fold-body{padding:8px 18px 18px}
.fold-body>p:first-child{margin-top:6px}
.fold.criteria .ac-legend{margin:6px 0 18px}

/* ── report.html 专用（共用样式表） ── */
.dashboard{margin:30px 0 6px}
.cov-bar{display:flex;height:12px;border-radius:20px;overflow:hidden;background:var(--surface);
  border:1px solid var(--line);margin:0 0 16px}
.cov-bar i{display:block;height:100%}
.cov-bar i.pass{background:var(--ok)}.cov-bar i.partial{background:var(--partial)}
.cov-bar i.fail{background:var(--fail)}.cov-bar i.na{background:var(--na)}
.dash{display:flex;gap:10px;flex-wrap:wrap;margin:0}
.chip{display:flex;align-items:baseline;gap:7px;border-radius:11px;padding:9px 14px;
  background:var(--raised);border:1px solid var(--line);box-shadow:var(--shadow)}
.chip .chip-n{font-size:1.35rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.chip .chip-l{font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.chip.pass .chip-n{color:var(--ok)}.chip.partial .chip-n{color:var(--partial)}
.chip.fail .chip-n{color:var(--fail)}.chip.na .chip-n{color:var(--na)}
.banner{display:flex;gap:11px;align-items:flex-start;background:var(--partial-bg);
  border:1px solid var(--partial);border-radius:11px;padding:12px 15px;margin:18px 0;font-size:.92rem;color:var(--fg)}
.banner .b-ic{font-size:1rem;line-height:1.5}
.verdicts{margin-top:8px}
.verdict{background:var(--raised);border:1px solid var(--line);border-left:3px solid var(--na);
  border-radius:0 12px 12px 0;padding:14px 18px 16px;margin:12px 0;scroll-margin-top:24px}
.verdict.pass{border-left-color:var(--ok)}.verdict.partial{border-left-color:var(--partial)}
.verdict.fail{border-left-color:var(--fail)}.verdict.na{border-left-color:var(--na)}
.verdict .v-h{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin-bottom:7px}
.verdict .ac-id{font-family:var(--mono);font-size:.84rem;font-weight:650}
.verdict .vstat{font-family:var(--mono);font-size:.64rem;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;padding:3px 9px;border-radius:20px;color:#fff}
.vstat.pass{background:var(--ok)}.vstat.partial{background:var(--partial)}
.vstat.fail{background:var(--fail)}.vstat.na{background:var(--na)}
.verdict .v-t{font-size:1.02rem;color:var(--fg);flex:1 1 240px;min-width:0}
.verdict .v-meta{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 9px}
.verdict .v-meta span{font-family:var(--mono);font-size:.7rem;color:var(--mut);background:var(--surface);
  border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.verdict .v-meta b{color:var(--fg);font-weight:600}
.ev{font-family:var(--mono);font-size:.8rem;color:var(--mut);padding:6px 11px;background:var(--surface);
  border:1px solid var(--line);border-radius:7px;margin:5px 0;display:flex;gap:8px;align-items:baseline}
.ev::before{content:"\\203A";color:var(--accent);font-weight:700}
.ev b{color:var(--accent-ink);font-weight:600}
.verdict>p{margin:9px 0 0;font-size:.96rem;color:var(--fg);line-height:1.55}
.meta{color:var(--mut);font-size:.78rem;font-family:var(--mono)}

/* ── 窄屏：目录退化为顶部横排 ── */
@media(max-width:820px){
  body{display:block;background-image:none}
  nav.toc{position:static;width:auto;flex:none;max-height:none;border-right:none;border-bottom:1px solid var(--line);
    display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:14px 18px}
  nav.toc .brand{margin:0 14px 0 0}
  nav.toc .toc-title{display:none}
  nav.toc a{margin:0;padding:5px 9px}
  nav.toc a:not(.is-mark) .toc-n{display:none}
  nav.toc a.is-child{display:none}
  main{margin:0;max-width:none;padding:36px 22px 80px}
  h1{font-size:1.85rem}
  .card:target{margin-left:0;margin-right:0}
}
@media print{
  nav.toc{display:none}
  body{background:#fff;background-image:none}
  .hero,.ac,.verdict,.chip,table{box-shadow:none}
}
`.trim();
