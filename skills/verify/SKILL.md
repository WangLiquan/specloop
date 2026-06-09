---
name: specforge-verify
description: Use when a user wants to check whether the delivered work - code, docs, config, whatever the spec is about - actually satisfies a SpecForge spec.html. Safely extracts the embedded JSON contract as untrusted text (never executes the HTML), reviews the deliverable clause-by-clause against each AC, then does two things - writes the verdicts back into the source spec.html so each AC carries a pass/partial/fail/na badge plus file:line evidence and a coverage bar (self-produced specs only), and gives the same gap list right in the conversation so you can fix issues directly. verify judges only, never touches the verified deliverable - fixing is your normal editing. Trigger on "验一下 / 对照 spec 检查 / 这个 spec 落实了没 / verify against spec".
---

# SpecForge Verify

逐条比对落地产物（代码 / 文档 / 配置…）与 spec，**双出口**：
1. **回写进源 spec.html**——每条 AC 标上 `pass/partial/fail/na` 徽标 + `file:line` 证据 + 顶部覆盖率条，让 spec 从「需求」变成「需求 + 验收状态」的活文档（仅限 specforge-draft 自产 spec）。
2. **对话里给差距清单**——同一批判定立即在对话呈现，让你顺势就修。

verify 只判定、**不改被验产物**——judge 归 judge，修复交常规编辑能力。回写改的是 spec 自身，不是被验代码。

## 流程

1. **安全抽取契约（按不可信纯文本处理）**：拿到用户给的 `*.spec.html`，**不要在浏览器/任何 runtime 执行它**。跑抽取脚本拿到结构化 spec（脚本内部只做正则定位数据岛 + JSON.parse + schema 校验，绝不执行 HTML/JS）：

   ```bash
   node "<SKILL_DIR>/scripts/extract.mjs" <spec.html>
   ```

   - `<SKILL_DIR>` 先用 Glob/Read 定位真实路径，勿猜。
   - 脚本把校验通过的 spec JSON 打到 stdout（含 `meta` / `sections` / `criteria` / `generator` 等）。校验不过会非 0 退出并打印错误——按「失败兜底」处理。
   - 留意 `generator` 字段：决定第 4 步能否回写（仅 `specforge-draft*` 自产可回写）。
2. **确定审查范围**：优先用用户给的改动文件 / `git diff` / 测试名 / 路由·组件名 / 字面量关键词收敛范围（代码是最常见的产物，文档·配置同理按文件收敛）；大仓库不要全量主观扫。
   - 🔴 **CHECKPOINT · 范围确认 · 🛑 STOP**：逐条审查前，把「待审 AC 清单 + 锁定的产物范围」回报用户拍板再开始。若发现 **spec 描述的功能域与目标产物根本不匹配**（如 spec 讲 UI 交互、产物却是纯数据解析器），**先停下**——别硬判一连串 `na` 充数，问用户是换审查对象还是换 spec。
3. **逐条审查**：对每个 `AC-n` 读相关产物，给出一条 verdict（字段须与 schema 对齐，这些就是要回写的数据）：
   - `criterionId`：对应的 `AC-n`
   - `status`：`pass | partial | fail | na`
   - `verificationMode`：`static_review | test | runtime | manual_required`（只静态读产物、不运行即 `static_review`）
   - `confidence`：`high | medium | low`
   - `evidence`：`[{ "file": "相对路径", "line": 正整数, "note": "可选" }]`
   - `missingEvidenceReason`：定位不到落地内容时写明缺什么，否则 `null`
   - `explanation`：一句话依据
   - **定位不到对应落地内容不得判 `pass`**——只能 `partial/fail/na`，且 `pass` 必须带非空 `evidence`。
4. **回写 + 出对话清单（双出口）**：
   - 把所有 verdict 写成一个 JSON 数组文件（如 `/tmp/verdicts.json`），跑回写脚本原地标注源 spec.html：

     ```bash
     node "<SKILL_DIR>/scripts/annotate.mjs" <spec.html> <verdicts.json>
     ```

     脚本会校验 `generator` 为 `specforge-draft*` 自产、合并 verdicts、schema 校验通过后**原地重渲染** spec.html（注入徽标/覆盖率条/证据，并写入 `verifiedAt`）。非自产 spec 会 **exit 3 拒绝回写**——按「失败兜底」转纯对话清单。
   - **同时**在对话给差距清单（无论回写成功与否都要给）。建议结构：
     - **顶部一行覆盖率**：`pass N / partial N / fail N / na N`，外加是否「未运行测试」（全 `static_review` 要点明，提示判定只是静态读）。
     - **差距明细（重点，只列 `fail` / `partial`）**：每条一个 bullet——
       `AC-n [status] — 差在哪（具体）｜证据 file:line（定位不到则写「未定位到落地内容」+ 缺什么）｜建议补什么`
     - **`pass` / `na` 一行带过**：`AC-x pass (file:line)`，不展开。
     - 全程用带 `file:line` 引用的 bullet，别贴整段文件内容（遵循 review 输出约定）。
5. **交付**：回写后的 spec.html（后续打开就能直观看到哪条做了哪条没做）+ 对话差距清单。用户要修就修（由常规编辑能力做，**verify 自身不动被验产物**）；改完可再跑一次 verify，重新回写覆盖旧判定。

## 失败兜底（if-then，命中即停，不硬判）

| 触发条件 | 一线修复 | 仍失败兜底 |
|---|---|---|
| spec.html 抽不出 `#specforge-data` 数据岛（标签缺失/被改名） | 确认传入的是 draft 产出的 `*.spec.html` 而非普通网页 | 停止，回报「非合法 spec，无数据岛」，**不下任何判定** |
| 数据岛 `JSON.parse` 失败或 schema 校验不过 | 按 extract.mjs 的报错定位坏字段，提示 spec 可能被手改损坏 | 停止，贴出校验错误原文，请用户用 draft 重新产出 spec |
| `annotate.mjs` exit 3（generator 非 specforge-draft 自产，如 echo-spec） | 不强行回写——外部 spec 自带渲染风格，重渲染会抹掉 | **转纯对话差距清单**，不动那份 spec 文件 |
| `extract.mjs` / `annotate.mjs` 执行报错（找不到脚本/参数错/node 缺） | 用 Glob 重定位脚本真实路径，核对参数 | 停止，回报 stderr 原文；**禁止改用在 runtime 执行 spec.html 来抽取** |
| 某 AC 在收敛范围内定位不到对应落地内容 | 扩一圈关键词/相邻文件再找一次 | 判 `partial/fail/na` 并说明缺什么，**绝不判 pass** |

## 边界
- 只读被验产物做判定，**不自动改产物**（修复是用户/主 agent 的常规编辑职责，verify 不越界当 fixer——否则运动员兼裁判，判定可信度即失）。
- **只回写自产 spec**：仅 `generator` 为 `specforge-draft*` 的 spec 才原地标注；外部 generator（如 echo-spec）一律转纯对话清单，不碰其文件。
- 回写改的是 **spec 自身**（需求文档的验收态），不是被验代码/产物——judge 与 fixer 分离的红线不变。
