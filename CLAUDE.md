# SpecForge

两个 skill：`specforge-draft`（把模糊需求拷问成可视化 `*.spec.html`）+ `specforge-verify`（拿 spec 逐条验落地产物，**双出口**：把判定回写进自产 spec.html + 在对话里给差距清单，不当 fixer，修复交常规编辑）。定位是「任何要想清楚、定下来、再回头验收的事」，代码只是最常见的产物——不是前提（详见两个 SKILL.md 的 description）。

## 源 vs 派生产物（红线）

- **源**：`lib/`（渲染/抽取逻辑）、`schema/spec.schema.json`
- **派生**：`skills/*/scripts/*.mjs`（由 `lib/` esbuild 打包）、`skills/*/references/*.json`（由 `schema/` 同步）、`.claude-plugin/{plugin.json,marketplace.json}` 的 `version` 字段（由 `package.json.version` 经 `scripts/sync-version.mjs` 同步）。
- 改了 `lib/` / `schema/`，或 bump 了 `package.json` version 后，**必须跑 `npm run build`** 重新生成派生文件再提交，否则 `npm run check`（CI 同款）的一致性校验会拦。
- **禁止手改 `skills/*/scripts/*.mjs`** 或这两处 plugin/marketplace 的 `version`——都是派生产物，下次 build 会覆盖。版本号唯一真源是 `package.json.version`。

## 关键契约

- spec.html 数据岛 DOM id = `specforge-data`（draft 注入、verify 抽取的唯一契约）。改动它须同步：`lib/render-spec.mjs` 注入、`lib/extract.mjs` 正则、`showcase.html`、`test/*` 断言。
- verify 两条 CLI：`extract-main.mjs` 抽 spec JSON 给 agent 逐条判定；`annotate-main.mjs` 把 verdicts 合并进 spec 并**原地重渲染** spec.html（注入徽标/覆盖率条 + `verifiedAt`）。`render-spec.mjs` 是双模式：无 verdicts 出素 spec，有 verdicts 注入验收态。
- **回写边界**：annotate 只写回 `generator` 为 `specforge-draft*` 自产 spec，外部 generator（如 echo-spec）`exit 3` 拒绝。`schema/spec.schema.json` 的 `verdicts`/`verifiedAt` 是可选字段（素 spec 无此字段）。
- **judge/fixer 分离红线**：verify 回写改的是 **spec 自身**（需求的验收态），绝不改被验产物（代码/文档/配置）——运动员不当裁判。

## 校验

- `npm run check` = schema 同步检查 + bundle 一致性检查 + version 一致性检查（三处 version）+ `node --test` 全部测试。

## 分发

- 两条通道并存、命名空间隔离：`npx skills add WangLiquan/specforge`（skill 通道）与 Claude Code `/plugin`（plugin 通道，靠根目录 `.claude-plugin/{plugin.json,marketplace.json}`）。加 plugin manifest 是纯 additive，不影响 skill 通道。发版流程：bump `package.json` version → `npm run build` → commit → `git tag -a vX` → `git push --tags`。

## 发布

- `showcase.html`（spec 示例）/ `index.html`（落地页）经 GitHub Pages 发布：**branch deploy（main 分支 / 根路径）**，靠根目录 `.nojekyll` 原样托管静态文件，URL `https://wangliquan.github.io/specforge/`。无 Pages workflow。
- README 首屏截图在 `assets/spec-showcase.png`，由 Playwright 截 showcase 页生成——**改了 showcase 的视觉后需重新截图**再同步 README，否则首屏与真实产物脱节。
