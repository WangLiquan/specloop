# SpecForge

两个 skill：`specforge-draft`（把模糊需求拷问成可视化 `*.spec.html`）+ `specforge-verify`（拿 spec 逐条验落地产物，**在对话里给出差距清单**，不产任何文件、不当 fixer，修复交常规编辑）。定位是「任何要想清楚、定下来、再回头验收的事」，代码只是最常见的产物——不是前提（详见两个 SKILL.md 的 description）。

## 源 vs 派生产物（红线）

- **源**：`lib/`（渲染/抽取逻辑）、`schema/spec.schema.json`
- **派生**：`skills/*/scripts/*.mjs`（由 `lib/` esbuild 打包）、`skills/*/references/*.json`（由 `schema/` 同步）、`.claude-plugin/{plugin.json,marketplace.json}` 的 `version` 字段（由 `package.json.version` 经 `scripts/sync-version.mjs` 同步）。
- 改了 `lib/` / `schema/`，或 bump 了 `package.json` version 后，**必须跑 `npm run build`** 重新生成派生文件再提交，否则 `npm run check`（CI 同款）的一致性校验会拦。
- **禁止手改 `skills/*/scripts/*.mjs`** 或这两处 plugin/marketplace 的 `version`——都是派生产物，下次 build 会覆盖。版本号唯一真源是 `package.json.version`。

## 关键契约

- spec.html 数据岛 DOM id = `specforge-data`（draft 注入、verify 抽取的唯一契约）。改动它须同步：`lib/render-spec.mjs` 注入、`lib/extract.mjs` 正则、`showcase.html`、`test/*` 断言。
- verify 侧只读不写：`lib/cli/extract-main.mjs` 跑 `extractDataIsland`+`validateSpec` 把 spec JSON 打到 stdout 给 agent 逐条判定，**不生成任何文件**（无 report.html / verdicts.json）。judge 与 fixer 分离是红线——verify 不改产物。

## 校验

- `npm run check` = schema 同步检查 + bundle 一致性检查 + version 一致性检查（三处 version）+ `node --test` 全部测试。

## 分发

- 两条通道并存、命名空间隔离：`npx skills add WangLiquan/specforge`（skill 通道）与 Claude Code `/plugin`（plugin 通道，靠根目录 `.claude-plugin/{plugin.json,marketplace.json}`）。加 plugin manifest 是纯 additive，不影响 skill 通道。发版流程：bump `package.json` version → `npm run build` → commit → `git tag -a vX` → `git push --tags`。

## 发布

- `showcase.html`（spec 示例）/ `index.html`（落地页）经 GitHub Pages 发布：**branch deploy（main 分支 / 根路径）**，靠根目录 `.nojekyll` 原样托管静态文件，URL `https://wangliquan.github.io/specforge/`。无 Pages workflow。
- README 首屏截图在 `assets/spec-showcase.png`，由 Playwright 截 showcase 页生成——**改了 showcase 的视觉后需重新截图**再同步 README，否则首屏与真实产物脱节。
