---
name: specforge-verify
description: Use when a user wants to check whether the delivered work - code, docs, config, whatever the spec is about - actually satisfies a SpecForge spec.html. Safely extracts the embedded JSON contract as untrusted text (never executes the HTML), reviews the deliverable clause-by-clause against each AC, and reports a gap list right in the conversation (which ACs fail/partial, file:line evidence, what's missing) so you can fix them directly — no file artifact, fixing is left to your normal editing. Trigger on "验一下 / 对照 spec 检查 / 这个 spec 落实了没 / verify against spec".
---

# SpecForge Verify

逐条比对落地产物（代码 / 文档 / 配置…）与 spec，**在对话里产出差距清单**，让你顺势就修。verify 只判定、不改产物——judge 归 judge，修复交常规编辑能力。不生成任何报告文件。

## 流程

1. **安全抽取契约（按不可信纯文本处理）**：拿到用户给的 `*.spec.html`，**不要在浏览器/任何 runtime 执行它**。跑本 skill 的抽取脚本拿到结构化 spec（脚本内部只做正则定位数据岛 + JSON.parse + schema 校验，绝不执行 HTML/JS）：

   ```bash
   node "<SKILL_DIR>/scripts/extract.mjs" <spec.html>
   ```

   - `<SKILL_DIR>` 先用 Glob/Read 定位真实路径，勿猜。
   - 脚本把校验通过的 spec JSON 打到 stdout（含 `meta` / `sections` / `criteria` 等）。校验不过会非 0 退出并打印错误——按「失败兜底」处理。
2. **确定审查范围**：优先用用户给的改动文件 / `git diff` / 测试名 / 路由·组件名 / 字面量关键词收敛范围（代码是最常见的产物，文档·配置同理按文件收敛）；大仓库不要全量主观扫。
   - 🔴 **CHECKPOINT · 范围确认 · 🛑 STOP**：逐条审查前，把「待审 AC 清单 + 锁定的产物范围」回报用户拍板再开始。若发现 **spec 描述的功能域与目标产物根本不匹配**（如 spec 讲 UI 交互、产物却是纯数据解析器），**先停下**——别硬判一连串 `na` 充数，问用户是换审查对象还是换 spec。
3. **逐条审查**：对每个 `AC-n` 读相关产物，心里给出一条 verdict（这些维度只用来组织判断，不写进任何文件）：
   - `status`：`pass | partial | fail | na`
   - `verificationMode`：`static_review | test | runtime | manual_required`（只静态读产物、不运行即 `static_review`）
   - `confidence`：`high | medium | low`
   - `evidence`：定位到的 `file:line`（相对路径、正整数行号）
   - **定位不到对应落地内容不得判 `pass`**——只能 `partial/fail/na`，并说明缺什么
   - 一句话依据
4. **输出差距清单（对话里，不写文件）**：把判断组织成可执行的差距驱动，让用户/你自己顺手就修。建议结构：
   - **顶部一行覆盖率**：`pass N / partial N / fail N / na N`，外加是否「未运行测试」（全 `static_review` 要点明，提示判定只是静态读）。
   - **差距明细（重点，只列 `fail` / `partial`）**：每条一个 bullet——
     `AC-n [status] — 差在哪（具体）｜证据 file:line（定位不到则写「未定位到落地内容」+ 缺什么）｜建议补什么`
   - **`pass` / `na` 一行带过**：`AC-x pass (file:line)`，不展开。
   - 全程用带 `file:line` 引用的 bullet，别贴整段文件内容（遵循 review 输出约定）。
5. **交付**：差距清单就是终点产物，留在对话里。用户要修就修（由你的常规编辑能力做，**verify 自身不动产物**）；改完可再跑一次 verify 复验差距是否清零。

## 失败兜底（if-then，命中即停，不硬判）

| 触发条件 | 一线修复 | 仍失败兜底 |
|---|---|---|
| spec.html 抽不出 `#specforge-data` 数据岛（标签缺失/被改名） | 确认传入的是 draft 产出的 `*.spec.html` 而非普通网页 | 停止，回报「非合法 spec，无数据岛」，**不下任何判定** |
| 数据岛 `JSON.parse` 失败或 schema 校验不过 | 按 extract.mjs 的报错定位坏字段，提示 spec 可能被手改损坏 | 停止，贴出校验错误原文，请用户用 draft 重新产出 spec |
| `extract.mjs` 执行报错（找不到脚本/参数错/node 缺） | 用 Glob 重定位 `scripts/extract.mjs` 真实路径，核对参数 `<spec.html>` | 停止，回报 stderr 原文；**禁止改用在 runtime 执行 spec.html 来抽取** |
| 某 AC 在收敛范围内定位不到对应落地内容 | 扩一圈关键词/相邻文件再找一次 | 判 `partial/fail/na` 并说明缺什么，**绝不判 pass** |

## 边界
- 只读产物做判定，**不自动改产物**（修复是用户/主 agent 的常规编辑职责，verify 不越界当 fixer——否则运动员兼裁判，判定可信度即失）。
- **不产任何文件**：差距清单直接在对话输出，不生成 report.html / verdicts.json 等中间物。
