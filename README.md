# SpecForge

[![CI](https://github.com/WangLiquan/specforge/actions/workflows/ci.yml/badge.svg)](https://github.com/WangLiquan/specforge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

更轻的「定义需求 → 验证实现」闭环，做成两个 skill：

- **`specforge-draft`** —— 把一个模糊 idea，经访谈 + 拷问，变成一份**单文件可视化的 `*.spec.html`**，让你用最小成本看懂「AI 要做什么」并拍板。
- **`specforge-verify`** —— 拿着这份 spec.html 逐条比对你的代码，产出一份**可视化的 `*.report.html`**，告诉你哪条验收点真的做到了、哪条没有。

spec 不再是一坨 markdown，而是**人一眼能读、机器也能消费**的 HTML 产物；写完代码还能回头验证实现是否真的对齐 spec。

---

## 为什么是它

模型越强，多 skill 编排越显臃肿；人越依赖模型写码，markdown spec 对**人**的阅读成本反而越高。SpecForge 押注三件不可替代物：

1. **稳定的机器可读 JSON 契约** —— spec 内嵌一份结构化验收点清单，不只给人看，也能被工具消费/校验。
2. **spec-hash 绑定 report** —— 校验报告锚定被验 spec 的内容哈希，杜绝拿旧报告对新 spec。
3. **验收点覆盖率 dashboard** —— 每条验收点 pass / partial / fail / na 一眼可见。

先打开 [`showcase.html`](./showcase.html) 看一份真实生成出的 spec 长什么样。

---

## 安装

```bash
npx skills add WangLiquan/specforge                  # 一次装上 draft + verify
npx skills add WangLiquan/specforge --skill specforge-draft   # 只装其一
npx skills add WangLiquan/specforge -g               # 装到全局(所有项目可用)
```

装完用 `npx skills list` 自检。

> 安装落点随 agent / scope 变化（symlink 或 copy）。Claude Code 的 global 链接当前在上游仍有已知 issue（vercel-labs/skills #851 / #744），如遇 `~/.claude/skills` 未生成，改用 project scope 或手动软链。

**运行期要求**：你的机器需有 `node`（≥ 22）—— 两个 skill 会在本地调用自带脚本生成 HTML。脚本已 inline 全部依赖，**无需 `npm install`**。

---

## 怎么用

装好之后，直接在你的 AI 编码会话里用自然语言触发，不用记命令。

### 1. 用 `draft` 把需求理成 spec

对你的 agent 说类似：

> 「帮我写个给博客加暗色模式的 spec」 / 「draft a spec」 / 「把这个需求理成 spec」

它会：

1. **发散访谈**：一次一个问题，挖目标 / 非目标 / 约束 / 成功标准；
2. **收敛拷问**：对每个模糊的决策分支穷追到底，逼成明确选择；
3. **产出**：在你项目里生成 `specs/<日期>-<slug>.spec.html`。

双击打开就是一份可视化 spec：目标、流程、数据、以及带稳定编号（`AC-1 / AC-2 …`）的**验收点清单**。看着拍板，要改就继续对话、重新生成。

### 2. 写代码

照着 spec 实现。

### 3. 用 `verify` 验证实现

对你的 agent 说：

> 「对照 `xxx.spec.html` 检查代码」 / 「verify against spec」

它会**把 spec.html 当不可信文本读取**（绝不执行它），抽出验收点清单，逐条审你的代码，然后生成 `<名字>.report.html`。

### 一个完整例子

```
你：帮我写个「给博客加暗色模式」的 spec
draft：（访谈+拷问几轮）→ 生成 specs/2026-06-03-blog-dark-mode.spec.html
你：（打开 HTML，确认 4 条验收点 AC-1..AC-4，OK）
你：（写代码：加切换按钮、切 class、写 localStorage…）
你：对照 specs/2026-06-03-blog-dark-mode.spec.html 检查代码
verify：→ 生成 report.html
        覆盖率：pass 2 · partial 0 · fail 1 · na 1
        AC-3 [fail] 刷新后保留上次选择 —— 未见 localStorage 写入
```

一眼就知道还差哪一条，去补 `localStorage`。

---

## 产物长什么样

**`*.spec.html`（draft 产出）**

- **单个自包含文件**：CSS 全内联，双击即开，能直接发给别人评审；
- 内嵌一段 `<script type="application/json">` **数据岛**作为契约——这就是 verify 后续要逐条验的验收点清单；
- 生成时就把视图烤成静态 HTML、**无渲染期脚本**、CSP 严格，因此安全、可随手转发。

**`*.report.html`（verify 产出）**

- 顶部一个**覆盖率 dashboard**（pass / partial / fail / na）；
- 每条验收点：状态色 + `file:line` 证据 + 一句话依据；定位不到代码不会判 pass；
- **绑定被验 spec 的内容哈希**，避免拿旧报告对新 spec；
- 若结论都来自静态审查（没跑测试），顶部会显著标注「未运行测试」，免得误读成"验证通过"。

---

## License

[MIT](./LICENSE) © 2026 WangLiquan

---

## Contributing

欢迎 issue / PR。本地开发：

```bash
npm install      # 装 dev 依赖
npm run check    # schema/bundle 一致性 + 全部测试(CI 同款)
```

> 注意：`skills/*/scripts/*.mjs` 与 `references/*.json` 是从 `lib/` 和 `schema/` 派生的产物。改了 `lib/` 或 `schema/` 后务必跑 `npm run build` 重新打包再提交，否则 CI 的一致性检查会拦住。
