---
name: specforge-draft
description: Use when a user wants to turn an idea/requirement into a reviewable spec. Interviews then relentlessly grills the user to resolve every decision branch, then emits a single self-contained <name>.spec.html (visual, zero-dependency, with an embedded machine-readable JSON contract). Trigger on "写个 spec / draft a spec / 把需求理成 spec / spec it".
---

# SpecForge Draft

把一个模糊 idea 变成「人能最小成本拍板、机器能消费」的 spec.html。

## 流程

1. **发散**：一次一个问题，挖目标 / 非目标 / 约束 / 成功标准。必要时提 2-3 方案带取舍与推荐。
2. **收敛拷问**：对每个决策分支穷追到底，把模糊点逼成明确选择，直到没有悬而未决项。
3. **结构化**：把结论写成符合 `references/spec.schema.json` 的 JSON 对象（字段见该 schema）。

   **spec.html 是给人 review/拍板看的**——优先沉淀人最该看的三类（渲染时置顶展开）：
   - `decisions[]` **决策点**：拷问中每个有取舍的分支都显式记一条。ID 用 `D-1 / D-2 …`；`question`=决策项、`options`=候选、`resolution`=当前拍板、`rationale`=为什么。**还没拍板的写 `status:"open"`**（渲染为醒目「待拍板」），已定的写 `status:"decided"`。别把决策只留在对话里。
   - `awareness[]` **知情项**：用户该知道的影响 / 边界 / 不改动承诺 / 风险。ID 用 `A-1 / A-2 …`；破坏性或风险类写 `severity:"warning"`（标红），其余 `info`。
   - 整体流程用 `sections[]` 里的 `type:"flow"`（默认展开）。

   其余为次要内容（渲染时默认折叠，按需展开）：
   - `summary`、背景 / 口径 / 表格类 `prose`/`table` section 默认折叠；要强制展开某节设 `collapsed:false`，要强制折叠某流程设 `collapsed:true`。
   - `criteria[]` 是验收点，**给 `specforge-verify` 消费的机器契约、默认折叠**；不是人 review 的重点，但仍要写全。ID 用 `AC-1 / AC-2 …`，**一旦分配不要因排序/增删而重排或复用**。
   - 每个待拍板的 `decisions` 与 `criteria` 应能对应：决策落地后才好定验收点。

   每次重大修订 `meta.revision++`，并把上一版 `specId` 填入 `meta.previousSpecId`。
4. **渲染**：把 JSON 写到临时文件，运行本 skill 自带的渲染脚本生成 spec.html：

   ```bash
   node "<SKILL_DIR>/scripts/render.mjs" <spec.json> <out>.spec.html
   ```

   - `<SKILL_DIR>` 是本 SKILL.md 所在目录（先用 Glob/Read 定位真实路径，勿猜）。
   - 默认输出 `specs/YYYY-MM-DD-<slug>.spec.html`；同名先问再覆盖。
   - 脚本会先按 schema 校验，不合规直接报错——按报错修 JSON 再跑。
5. **交付**：提示用户双击打开 spec.html 可视化拍板。后续修改走对话——改 JSON、重跑脚本。

## 边界
- 只做「需求 → spec.html」，不写实现代码。
- 不手工拼 HTML：HTML 一律由 `scripts/render.mjs` 生成（确保转义与 CSP 正确）。
