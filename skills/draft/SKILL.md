---
name: specforge-draft
description: Use BEFORE committing effort to any non-trivial or ambiguous thing - a feature, design, plan, decision, refactor, deletion - to pin it down instead of acting on a vague ask. A proposal / RFC / design doc / 提案 / 方案 / 评审稿 counts as a spec - route it here. Applies whether the user asks or you (the agent) decide such a doc is needed before acting. Relentlessly grills every decision branch, then emits one self-contained <name>.spec.html (visual, zero-dep, embedded JSON contract). Trigger on that intent — "写个 spec / 写个提案 / 起个 RFC / 出个方案 / 把这事理清楚再做 / draft a spec / write a proposal / spec it".
---

# SpecForge Draft

把一个模糊 idea 变成「人能最小成本拍板、机器能消费」的 spec.html。

## 流程

1. **发散**：一次一个问题，挖目标 / 非目标 / 约束 / 成功标准。必要时提 2-3 方案带取舍与推荐。
2. **收敛拷问**：对每个决策分支穷追到底，把模糊点逼成明确选择，直到没有悬而未决项。**这是硬要求**——渲染脚本会拒绝带 `open` 决策生成 spec（见 step 4），别把没问清的甩成「待拍板」糊弄过去。每个决策分支带 `options[]`，**优先用 `AskUserQuestion` 逐条弹结构化选项**让 user 当场拍板，而不是默认标 `open`。
3. **结构化**：把结论写成符合 `references/spec.schema.json` 的 JSON 对象（字段见该 schema）。

   **spec.html 是给人 review/拍板看的**——优先沉淀人最该看的三类（渲染时置顶展开）：
   - `decisions[]` **决策点**：拷问中每个有取舍的分支都显式记一条。ID 用 `D-1 / D-2 …`；`question`=决策项、`options`=候选、`resolution`=当前拍板、`rationale`=为什么。默认都应拷问到 `status:"decided"`。`status:"open"`（待拍板）是**逃生舱、不是常态**——只在 **user 明确说「先跳过 / 这条以后再定」** 时才允许保留，且渲染必须显式 `--allow-open`（见 step 4）。别把决策只留在对话里。
   - `awareness[]` **知情项**：用户该知道的影响 / 边界 / 不改动承诺 / 风险。ID 用 `A-1 / A-2 …`；破坏性或风险类写 `severity:"warning"`（标红），其余 `info`。
   - 整体流程用 `sections[]` 里的 `type:"flow"`（默认展开）。

   其余为次要内容（渲染时默认折叠，按需展开）：
   - `summary`、背景 / 口径 / 表格类 `prose`/`table` section 默认折叠；要强制展开某节设 `collapsed:false`，要强制折叠某流程设 `collapsed:true`。
   - `criteria[]` 是验收点，**给 `specforge-verify` 消费的机器契约、默认折叠**；不是人 review 的重点，但仍要写全。ID 用 `AC-1 / AC-2 …`，**一旦分配不要因排序/增删而重排或复用**。
   - 每个待拍板的 `decisions` 与 `criteria` 应能对应：决策落地后才好定验收点。
   - `assumptionReview` + `assumptions[]` **现状假设**（涉及现有代码/系统时必写）：spec 但凡对「现有代码/系统的真实行为」下断言——「复用 X 现有能力」「X 现在的行为是 Y」——就**必须**把每条断言记进 `assumptions[]`，带 `id`（`ASM-1 / ASM-2 …`，唯一）、`claim`（断言）、`evidence`（`file:line` 锚点，**逼你去读代码而非凭记忆猜**）、`verified:null`、`verifiedDigest:null`，并在顶层声明 `assumptionReview:{applicable:true, reason}`。纯需求/决策/提案类（无现状断言）则显式声明 `assumptionReview:{applicable:false, reason:"…"}`、不写 assumptions。**漏记会被交付关 `check-ready` 拦**（缺声明拒交付）——这是为根治「spec 把现有代码行为猜错」而设的硬约束。

   每次重大修订 `meta.revision++`，并把上一版 `specId` 填入 `meta.previousSpecId`。
4. **渲染**：把 JSON 写到临时文件，运行本 skill 自带的渲染脚本生成 spec.html：

   ```bash
   node "<SKILL_DIR>/scripts/render.mjs" <spec.json> <out>.spec.html
   ```

   - `<SKILL_DIR>` 是本 SKILL.md 所在目录（先用 Glob/Read 定位真实路径，勿猜）。
   - 默认输出 `specs/YYYY-MM-DD-<slug>.spec.html`；🔴 同名**先问再覆盖**，不静默盖掉用户已有 spec。
   - 脚本会先按 schema 校验，不合规直接报错——按报错修 JSON 再跑。
   - 🔴 **Gate（STOP）**：只要还有 `status:"open"` 的决策，脚本会**拒绝生成并退出**（列出哪些 D-id 待拍板）。正常路径是回到 step 2 用 `AskUserQuestion` 把它们逐条拷问到 `decided`。**仅当 user 明确说「先跳过 / 先生成」**，才追加 `--allow-open` 放行：`render.mjs <spec.json> <out> --allow-open`。
5. **现状假设核验**（`assumptionReview.applicable:true` 时；纯需求/决策类跳过）：spec.html 渲染后、交付前——
   - **核验**：对每条 `assumptions[]`，spawn 一个**全新 context、有 codebase 访问**的 subagent（默认用 `Agent` 工具起 Claude subagent；**codex 可用时异构模型独立性更高、可选改用**），拿 `evidence` 的 `file:line` 去**真实代码**核对 `claim` 是否属实，逐条产出 `{id, verified:true|false, note}`（判 `false` 必须给 `note`）。⚠️ 价值在**第二双眼睛重读代码**——别让写 spec 的同一次推理自核自己，盲区一致。
   - **回写**：`node "<SKILL_DIR>/scripts/annotate-assumptions.mjs" <spec.html> <results.json>` 把核验态写回 spec.html（现状假设块带 ✓/✗ 徽标）。results 的 id 集合须与 assumptions 完全一致，否则整次拒绝。
   - **验收**：`node "<SKILL_DIR>/scripts/check-ready.mjs" <spec.html>`——有未核/不符则非 0 退出。**出现 ✗ → 回去修 `claim` 或改方案再重核**（改了 claim/evidence 指纹自动失效、需重新核验），别带病交付。
6. **交付**：`check-ready` 通过（或 applicable:false）后，提示用户双击打开 spec.html 可视化拍板。后续修改走对话——改 JSON、重跑脚本。

## 边界
只做「需求 → spec.html」，产出可视化 spec 供人拍板，不写实现代码。

「要评审、要拍板、再回头验收」的文档——提案 / RFC / 方案 / design doc / 评审稿——一律走本 skill 产出 spec.html，**不另写 `docs/proposals/*.md` 之类的裸 markdown**。它们和 spec 是同一件事，别因为换了个名字就绕开。

## 不要做什么
- ❌ 把没拷问清的决策标 `status:"open"` 糊弄过去当交付——gate 会拦，更别想着绕过它
- ❌ 没经 user 明确同意就用 `--allow-open` 跳过 gate
- ❌ 决策只留在对话里、不写进 `decisions[]`
- ❌ 把对现有代码的断言留在 prose 里凭记忆猜、不记 `assumptions[]` 不标 `file:line`
- ❌ `applicable:true` 却跳过 reviewer 自核自己——独立第二双眼睛是这道关的全部价值
- ❌ 手工拼 HTML——一律由 `scripts/render.mjs` 生成（保证转义与 CSP）
