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

**三件不可替代物（README 主打，而非空泛攻击 superpowers「臃肿」）**：

1. **稳定的机器可读 JSON 契约**——spec 不只是给人看，是可被工具消费/校验的 artifact。
2. **spec-hash 绑定 report**——校验报告锚定被验 spec 的内容哈希，杜绝拿旧报告对新 spec。
3. **criteria 覆盖率 dashboard**——每条验收点的 pass/partial/fail/na 一眼可见的覆盖率视图。

**命名**：项目名 **SpecLoop**（spec → code → verify 闭环）。备选：SpecMirror / SpecLens / ClearSpec。

## 2. 仓库结构（按 `npx skills` 分发约束设计）

分发走 Vercel Labs 的 `skills` CLI：`npx skills add <owner>/specloop`。该 CLI 自动发现 `skills/<name>/SKILL.md` 布局下的**所有 skill**，按 agent/scope 装进对应 skills 目录（symlink 或 copy）；也支持 `--skill draft` 点装。

> ⚠️ **分发措辞别写死**：安装落点随 agent 与 scope 变化，且 Claude Code 的 global install 链接到 `~/.claude/skills` 当前仍有开放 issue（github/vercel-labs skills #851 / #744）。README **不要**无条件写「软链进 `.claude/skills/`」，改为给一张**验证矩阵**：`add <owner>/specloop`（全量）、`--skill draft`、`--skill verify`、`-a claude-code`、`-a codex`、`--copy`、global/project，并附 `npx skills list` 自检 + Claude Code 链接失败的手动 workaround。

**运行时资产为何放进 skill 目录内**：保守起见，模板与 schema 放在各自 skill 目录（`assets/`、`references/`），是为了**兼容「按单个 skill 安装」与「跨 agent 拷贝」两种模式**——而不是依赖某个可能随 CLI 实现变化的「根资产一定不随安装」内部假设。

```
specloop/
├── README.md                              # 卖点、安装、用法、对比 superpowers
├── README_EN.md                           # 英文版
├── showcase.html                          # 引流 demo（对标 darwin 的 showcase.html）
├── docs/superpowers/specs/                # 本设计文档所在
├── schema/spec.schema.json                # canonical 契约单源；build 复制进各 skill
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

- **契约用 canonical 单源 + build 复制**：仓库保留**一份** canonical `schema/spec.schema.json`，build/release 脚本把它复制进两个 skill 的 `references/`。CI 同时校验：①两份与 canonical 字节一致；②`schemaVersion` 一致。仅靠「字节一致测试」不够——它只能发现漂移，不能防维护者忘跑、忘发或装了不匹配版本。
- **不要 `plugin.json`**：`npx skills` 链路不需要 Claude Code 原生 plugin 清单，纯 skills 布局更轻、更聚焦，正好佐证「比 superpowers 简单」。

## 3. 对接契约：JSON 数据岛 schema

两个 skill 的**唯一真相**。spec.html 内嵌 `<script type="application/json" id="specloop-data">…</script>`，模板的渲染 JS 在浏览器打开时读取该数据岛、客户端渲染可视化视图（零 build、零 server）。

```json
{
  "schemaVersion": "1.0",
  "generator": "specloop-draft/<version>",
  "meta": { "title": "...", "specId": "...", "revision": 1, "previousSpecId": null, "createdAt": "..." },
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

**正式 JSON Schema 的硬约束（不能停在「示例」级别）**：

- `schemaVersion` 必填；`generator` 标注产出方与版本。
- 顶层与各对象 `additionalProperties: false`，required 字段明确。
- `sections[]` 是 **discriminated union**（按 `type`：prose / flow / table），各类型有各自 required 字段；后续扩展类型走 schema 版本升级。
- `criteria[].id` **全局唯一且稳定**——ID 不随排序/增删重排（见 §「spec 修改可审计」），是 verify 逐条要验的锚点；`priority` 为 enum。
- verify 产出时对同一份 JSON 追加 `verdicts[]`，每条**必须引用已存在的 `criterionId`**、且**每个 criterion 至多一条 verdict**：

```json
"verdicts": [
  { "criterionId": "AC-1",
    "status": "pass|partial|fail|na",                 // enum
    "verificationMode": "static_review|test|runtime|manual_required",
    "confidence": "high|medium|low",
    "evidence": [{ "file": "src/x.ts", "line": 42, "note": "..." }],  // line 为正整数、相对路径
    "missingEvidenceReason": null,                      // 定位不到时必填
    "explanation": "..." }
]
```

- `status` / `verificationMode` / `confidence` 均为 enum；`evidence[].line` 正整数、`file` 相对路径。
- **定位不到代码不得判 `pass`**——只能 `partial/fail/na`，并填 `missingEvidenceReason`。
- **verify 必须先 schema-validate 再做语义审查**；遇不支持的 `schemaVersion` → 明确报错，不猜。

## 4. Skill 1：`specloop:draft`

**触发**：用户给一个模糊 idea / 「帮我写个 spec」/「draft a spec」。

**流程**：

1. **发散**（brainstorming 内核）：一次一个问题，挖目标 / 约束 / 成功标准，必要时提 2-3 方案带取舍。
2. **收敛拷问**（grill-me 内核）：对每个决策分支穷追，把模糊点逼成明确选择，直到无悬而未决。
3. **结构化**：把结论写成第 3 节的 JSON。
4. **产出**：读 `assets/spec-template.html`，把 JSON 注入 `#specloop-data` 数据岛 → 写出 spec.html（默认 `specs/YYYY-MM-DD-<slug>.spec.html`；同名先问再覆盖）。
   - **注入必须 HTML-safe**：JSON 序列化后至少把 `<` → `<`（防 `</script>` 逃逸），并转义 U+2028/U+2029 与控制字符。
5. 提示用户双击打开、可视化拍板；改动走对话——改 JSON、重渲染。

**spec 修改可审计**：criteria ID 不随排序/增删重排（删除保留墓碑或不复用 ID）；每次更新 `meta.revision++` 并记 `previousSpecId`，确保历史 verify 报告仍可追溯到对应 spec。

**职责边界**：只做「需求 → spec.html」；不写实现代码。

## 5. Skill 2：`specloop:verify`

**触发**：用户说「验一下 / 对照 spec 检查代码」/「verify against spec」，给出 spec.html 路径（+ 可选代码范围）。

**流程**：

1. **把 spec.html 当不可信纯文本**：限制文件大小，仅文本解析抽出 `script[type="application/json"]#specloop-data` 那段，`JSON.parse` → schema-validate（含 `schemaVersion` 兼容性）；失败即拒绝。**绝不在浏览器/JS runtime 中执行输入的 spec.html，也不打开它的 inline JS**（打开 report 可以，打开输入 spec 不可以自动执行）。
2. **确定代码范围**：优先用用户给的 changed files / `git diff` / 测试名 / 路由·组件名 / 字面量关键词建定位线索；大仓库下显式收敛范围，避免全量主观扫。
3. **逐条语义审查**：对每个 `AC-n` 产出 `status + verificationMode + confidence + evidence(file:line) + explanation`；**定位不到代码不得判 pass**，只能 `partial/fail/na` 且填 `missingEvidenceReason`。
4. 汇总成 `verdicts[]`，连同原 JSON + **被验 spec 的内容 hash** 注入 `assets/report-template.html` → 写出 `<name>.report.html`。报告头展示：覆盖率 dashboard（pass/partial/fail/na）+ 「未跑测试」风险标注 + 绑定的 spec hash/revision。
5. **不强依赖项目测试环境**；区分 `static_review`（看起来实现了）与 `test/runtime`（真验过），报告顶部显著标注，避免把静态审查误读成「验证通过」。
6. 终端只回一行 file:line 摘要，详情看 HTML 报告。

**职责边界**：只读代码做比对判定；不自动改代码（除非用户另行要求）。

## 6. 安全模型（Critical）

spec.html 同时是「带 inline JS 的可执行 HTML」和「verify 的输入」，威胁面必须明确。

**生成侧（draft / 模板）**：

- **数据岛注入做 HTML-safe escape**：JSON 写进 `<script type="application/json">` 前，至少 `<` → `<`，并转义 U+2028/U+2029 与控制字符——否则 criteria/section 文本含 `</script><script>…` 即可逃逸数据岛 → XSS。
- **模板渲染用户字段只用 `textContent`，禁 `innerHTML`**；不做 Markdown/HTML 直出；链接只按本地相对路径展示为纯文本。
- 生成的 HTML 带 **CSP `<meta>`**：禁外链脚本/字体、禁 `eval`、禁远程资源——保证「双击即开」也不会偷偷联网或执行注入代码。

**消费侧（verify）**：

- 输入 spec.html **一律当不可信纯文本**：限大小、只解析指定数据岛、`JSON.parse` + schema 校验，**不执行其 inline JS、不在浏览器里打开它来「读」**。
- report.html 同样会渲染来自 spec 与 agent 的 `explanation/evidence.note`（皆不可信文本），复用同一套严格 `renderText/renderList` 规则与 CSP。

**为什么重要**：单文件、双击即开是卖点，但也意味着 spec.html 会被随手转发/打开；一旦数据岛可逃逸或 verify 会执行输入 HTML，「轻」就变成攻击面。

## 7. 分发与测试

**分发**：

- GitHub repo + `npx skills add <owner>/specloop` 一键装两个 skill。
- README 头部放 showcase 截图 + 一句话对比 superpowers（轻、可视化、闭环）。

**测试**：

- **模板渲染**：用一份固定样例 JSON 喂 `spec-template.html` / `report-template.html`，做快照式人工/自动校验（打开 showcase.html 看渲染正确）。
- **契约一致性**：CI 断言两个 skill 的 `references/spec.schema.json` 与 canonical 字节一致、`schemaVersion` 一致。
- **schema 校验**：用合法/非法样例验证 schema 能正确接受/拒绝（缺 required、重复 criterion id、verdict 引用不存在 id、line 非正整数等）。
- **注入安全用例**：构造含 `</script>`、`<`、U+2028 的 criteria 文本，断言生成的 spec.html 不逃逸数据岛、不触发脚本执行。
- **端到端走查**：跑一遍真实 idea → draft 出 spec.html → 改代码 → verify 出 report.html，确认闭环通畅、报告绑定 spec hash。

## 8. 非目标（YAGNI）

- 不做交互式 HTML 回写（人勾选/批注导出）——反馈走对话即可，保持单文件最轻。
- 不做本地 server / 多 spec 管理面板——与「单个自包含 .html、零依赖」冲突。
- 不强制生成/运行测试——保持通用、不绑项目测试环境。
- 不出 `plugin.json` / 不绑特定语言或框架。
