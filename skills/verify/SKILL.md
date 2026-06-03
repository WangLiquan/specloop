---
name: specforge-verify
description: Use when a user wants to check whether code actually satisfies a SpecForge spec.html. Reads the embedded JSON contract as untrusted text (never executes the HTML), reviews code clause-by-clause against each AC, and emits a visual <name>.report.html (coverage dashboard, file:line evidence, bound spec hash). Trigger on "验一下 / 对照 spec 检查代码 / verify against spec".
---

# SpecForge Verify

逐条比对代码与 spec，产出可视化校验报告。

## 流程

1. **读取契约（按不可信纯文本处理）**：拿到用户给的 `*.spec.html`，**不要在浏览器/任何 runtime 执行它**。用本 skill 的脚本抽取并校验数据岛即可（脚本内部只做文本解析 + JSON.parse + schema 校验）。
2. **确定代码范围**：优先用用户给的改动文件 / `git diff` / 测试名 / 路由·组件名 / 字面量关键词收敛范围；大仓库不要全量主观扫。
3. **逐条审查**：对每个 `AC-n` 读相关代码，给出一条 verdict：
   - `status`: `pass | partial | fail | na`
   - `verificationMode`: `static_review | test | runtime | manual_required`（只读代码即 `static_review`）
   - `confidence`: `high | medium | low`
   - `evidence`: `[{file, line, note?}]`（line 为正整数、相对路径）
   - **定位不到代码不得判 `pass`**——只能 `partial/fail/na`，并填 `missingEvidenceReason`
   - `explanation`: 一句话依据
4. **生成报告**：把所有 verdict 写成 `verdicts.json`，运行：

   ```bash
   node "<SKILL_DIR>/scripts/report.mjs" <spec.html> <verdicts.json> <out>.report.html
   ```

   - `<SKILL_DIR>` 先用 Glob/Read 定位真实路径，勿猜。
   - 脚本会抽 spec、合并 verdicts、按 schema 校验、计算并绑定 spec hash、生成 report.html。
5. **交付**：终端只回一行 file:line 摘要（遵循"review 输出用带 file:line 的 bullet"约定），详情让用户看 report.html。报告顶部会标注「未运行测试」风险与覆盖率 dashboard。

## 边界
- 只读代码做判定，不自动改代码（除非用户另行要求）。
- 不手工拼 HTML：报告一律由 `scripts/report.mjs` 生成。
