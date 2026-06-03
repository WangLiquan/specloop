# SpecForge

两个 skill：`specforge-draft`（把模糊需求拷问成可视化 `*.spec.html`）+ `specforge-verify`（拿 spec 逐条验代码，产出 `*.report.html`）。

## 源 vs 派生产物（红线）

- **源**：`lib/`（渲染/抽取逻辑）、`schema/spec.schema.json`
- **派生**：`skills/*/scripts/*.mjs`（由 `lib/` esbuild 打包）、`skills/*/references/*.json`（由 `schema/` 同步）
- 改了 `lib/` 或 `schema/` 后**必须跑 `npm run build`** 重新生成派生文件再提交，否则 `npm run check`（CI 同款）的一致性校验会拦。
- **禁止手改 `skills/*/scripts/*.mjs`**——它是 bundle 产物，下次 build 会覆盖。

## 关键契约

- spec.html ↔ report.html 之间数据岛 DOM id = `specforge-data`。改动它须同步：`lib/extract.mjs` 正则、`lib/render-*.mjs` 注入、`showcase.html`、`test/*` 断言。

## 校验

- `npm run check` = schema 同步检查 + bundle 一致性检查 + `node --test` 全部测试。

## 发布

- `showcase.html` / `showcase.report.html` / `index.html`（落地页）经 GitHub Pages 发布：**branch deploy（main 分支 / 根路径）**，靠根目录 `.nojekyll` 原样托管静态文件，URL `https://wangliquan.github.io/specforge/`。无 Pages workflow。
- README 首屏截图在 `assets/{spec,report}-showcase.png`，由 Playwright 截 showcase 页生成——**改了 showcase 的视觉后需重新截图**再同步 README，否则首屏与真实产物脱节。
