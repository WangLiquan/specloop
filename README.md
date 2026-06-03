# SpecLoop

更轻的「定义需求 → 验证实现」闭环。两个 skill，零运行期依赖，spec 是**单文件可视化 HTML**。

## 为什么不是又一个 superpowers

模型越强，多 skill 编排越显臃肿；人越依赖模型写码，markdown spec 对**人**的阅读成本越高。SpecLoop 押注三件不可替代物：

1. **稳定的机器可读 JSON 契约** —— spec 不只给人看，是可被工具消费/校验的 artifact。
2. **spec-hash 绑定 report** —— 校验报告锚定被验 spec 的内容哈希，杜绝拿旧报告对新 spec。
3. **criteria 覆盖率 dashboard** —— 每条验收点 pass/partial/fail/na 一眼可见。

打开 [`showcase.html`](./showcase.html) 看一份生成出的 spec 长什么样。

## 安装

```bash
npx skills add <owner>/specloop          # 一次装上 draft + verify
npx skills add <owner>/specloop --skill draft   # 只装其一
```

> 安装落点随 agent / scope 变化（symlink 或 copy）。装完用 `npx skills list` 自检。
> Claude Code 的 global 链接当前在上游仍有已知 issue（vercel-labs/skills #851/#744），如遇 `~/.claude/skills` 未生成，改用 project scope 或手动软链。

## 用法

1. `draft`：给个 idea →（访谈+拷问）→ 生成 `specs/<date>-<slug>.spec.html`，双击打开拍板。
2. 写代码。
3. `verify`：对照 spec.html 检查代码 → 生成 `<name>.report.html`，看覆盖率与逐条证据。

## 运行期要求

仅需 `node`（≥22）。ship 脚本已 inline 全部依赖，无需 `npm install`。

## 开发

```bash
npm install      # 装 dev 依赖(esbuild, ajv)
npm test         # 跑全部测试
npm run build    # 同步 schema + 打包 ship 脚本
npm run check    # 同步/打包一致性 + 测试(CI 用)
```
