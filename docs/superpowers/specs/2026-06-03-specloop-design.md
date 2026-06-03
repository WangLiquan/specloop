# SpecLoop 设计文档

- 日期：2026-06-03
- 状态：已通过 brainstorming，待用户复审 → 转 writing-plans

## 1. 定位与目标

一个 Claude Code / Agent skill 插件（GitHub 开源），用**两个 skill** 覆盖「定义需求 → 验证实现」闭环，正面争夺 superpowers 的生态位。

**核心论点（卖点主线）**：

- 模型能力持续变强后，superpowers 那套多 skill 编排显得臃肿，心智负担高。
- 人越依赖模型写码，纯 markdown 的 spec 对**人**的阅读成本反而越高——人需要花最小成本看懂「AI 要做什么」并拍板。

**SpecLoop 的回应**：

1. 只用 2 个 skill，安装即用、零依赖、不绑语言/框架/MCP。
2. spec 产物是**单个自包含 HTML**，主要受众是**人**——可视化、低阅读成本、能直接发给别人拍板；同时对 AI 同样可读。
3. 补上 superpowers 缺的**代码 ↔ spec 闭环校验**：实现回头逐条对齐 spec，产出可视化校验报告。

**命名**：项目名 **SpecLoop**（spec → code → verify 闭环）。备选：SpecMirror / SpecLens / ClearSpec。

## 2. 仓库结构（按 `npx skills` 分发约束设计）

分发走 Vercel Labs 的 `skills` CLI：`npx skills add <owner>/specloop`。该 CLI 自动发现 `skills/<name>/SKILL.md` 布局下的**所有 skill**，软链进 `.claude/skills/`；也支持 `--skill draft` 点装。

**关键约束**：`npx skills` 安装的是 skill 目录本身（连同其 `assets/ references/ scripts/`），**仓库根目录的资产不会跟随安装**。因此运行时资产（模板、schema）必须放进各自 skill 目录内。

```
specloop/
├── README.md                              # 卖点、安装、用法、对比 superpowers
├── README_EN.md                           # 英文版
├── showcase.html                          # 引流 demo（对标 darwin 的 showcase.html）
├── docs/superpowers/specs/                # 本设计文档所在
└── skills/
    ├── draft/
    │   ├── SKILL.md                        # 访谈+拷问 → JSON → spec.html
    │   ├── assets/spec-template.html       # 自渲染模板（内联 CSS + 读 JSON 岛渲染的 JS）
    │   └── references/spec.schema.json     # JSON 数据岛契约
    └── verify/
        ├── SKILL.md                        # 逐条语义审查 → report.html
        ├── assets/report-template.html     # 复用同套 CSS，多渲染 verdict 列
        └── references/spec.schema.json     # 同一份契约（install 边界使然，各存一份）
```

- 契约 `spec.schema.json` 两边各放一份；用一行测试/CI 校验两份字节一致，防漂移。
- **不要 `plugin.json`**：`npx skills` 链路不需要 Claude Code 原生 plugin 清单，纯 skills 布局更轻、更聚焦，正好佐证「比 superpowers 简单」。

## 3. 对接契约：JSON 数据岛 schema

两个 skill 的**唯一真相**。spec.html 内嵌 `<script type="application/json" id="specloop-data">…</script>`，模板的渲染 JS 在浏览器打开时读取该数据岛、客户端渲染可视化视图（零 build、零 server）。

```json
{
  "meta": { "title": "...", "specId": "...", "version": 1 },
  "summary": "一段话：做什么、为什么",
  "sections": [
    { "id": "goals",    "title": "目标",   "type": "prose", "body": "..." },
    { "id": "nongoals", "title": "非目标", "type": "prose", "body": "..." },
    { "id": "flows",    "title": "流程",   "type": "flow",  "steps": ["..."] },
    { "id": "data",     "title": "数据",   "type": "table", "rows": [["字段","类型","说明"]] }
  ],
  "criteria": [
    { "id": "AC-1", "text": "用户点 X 时系统应 Y", "priority": "must", "rationale": "..." }
  ]
}
```

- `sections[]` 用 `type`（prose / flow / table）驱动模板分区渲染，后续可扩展类型。
- `criteria[]` 带稳定 ID `AC-n`，是 verify 阶段逐条要验的清单。
- verify 产出时，对同一份 JSON 追加 `verdicts[]`：

```json
"verdicts": [
  { "criterionId": "AC-1", "status": "pass|partial|fail|na",
    "evidence": [{ "file": "src/x.ts", "line": 42, "note": "..." }],
    "explanation": "..." }
]
```

## 4. Skill 1：`specloop:draft`

**触发**：用户给一个模糊 idea / 「帮我写个 spec」/「draft a spec」。

**流程**：

1. **发散**（brainstorming 内核）：一次一个问题，挖目标 / 约束 / 成功标准，必要时提 2-3 方案带取舍。
2. **收敛拷问**（grill-me 内核）：对每个决策分支穷追，把模糊点逼成明确选择，直到无悬而未决。
3. **结构化**：把结论写成第 3 节的 JSON。
4. **产出**：读 `assets/spec-template.html`，把 JSON 注入 `#specloop-data` 数据岛 → 写出 `<name>.spec.html` 到用户项目（默认 `./specs/` 或用户指定路径）。
5. 提示用户双击打开、可视化拍板；改动走对话——改 JSON、重渲染。

**职责边界**：只做「需求 → spec.html」；不写实现代码。

## 5. Skill 2：`specloop:verify`

**触发**：用户说「验一下 / 对照 spec 检查代码」/「verify against spec」，给出 spec.html 路径（+ 可选代码范围）。

**流程**：

1. 从 spec.html 抽出 `#specloop-data` 的 JSON 岛，拿到 `criteria[]`。
2. **逐条语义审查**：对每个 `AC-n` 读相关代码，判 `pass / partial / fail / na`，记 `file:line` 证据 + 说明。
3. 汇总成 `verdicts[]`，连同原 JSON 注入 `assets/report-template.html` → 写出 `<name>.report.html`。
4. 报告内容：总体通过率徽标 + 每条折叠项（状态色 + 证据 file:line + 说明）。
5. **不强依赖项目测试环境**；若项目恰好可跑测试，可选附跑测结果（非必须，不作硬约束）。
6. 终端只回一行 file:line 摘要，详情看 HTML 报告。

**职责边界**：只读代码做比对判定；不自动改代码（除非用户另行要求）。

## 6. 分发与测试

**分发**：

- GitHub repo + `npx skills add <owner>/specloop` 一键装两个 skill。
- README 头部放 showcase 截图 + 一句话对比 superpowers（轻、可视化、闭环）。

**测试**：

- **模板渲染**：用一份固定样例 JSON 喂 `spec-template.html` / `report-template.html`，做快照式人工/自动校验（打开 showcase.html 看渲染正确）。
- **契约一致性**：一行测试断言两个 `spec.schema.json` 字节一致。
- **端到端走查**：跑一遍真实 idea → draft 出 spec.html → 改代码 → verify 出 report.html，确认闭环通畅。

## 7. 非目标（YAGNI）

- 不做交互式 HTML 回写（人勾选/批注导出）——反馈走对话即可，保持单文件最轻。
- 不做本地 server / 多 spec 管理面板——与「单个自包含 .html、零依赖」冲突。
- 不强制生成/运行测试——保持通用、不绑项目测试环境。
- 不出 `plugin.json` / 不绑特定语言或框架。
