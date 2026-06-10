import { createHash } from 'node:crypto';

// 现状假设的核验指纹：锁定核验当时的 claim+evidence。reviewer 回写 verified 时写入；
// 之后只要 claim/evidence 任一字符变动，重算指纹即不匹配 → 该条核验视为失效（D-12）。
// 仅防 spec 自身编辑致的陈旧，不读被断言的代码内容、不记 commit（边界见 spec A-7/D-14）。
// 不做隐式 trim/归一化——任何字符变化都使核验失效（Codex 定议）。
export function digest(claim, evidence) {
  return createHash('sha256').update(JSON.stringify([claim, evidence]), 'utf8').digest('hex');
}

// 派生的「有效核验态」：render / masthead 统计 / check-ready 一律据此判定，绝不直读原始
// verified——否则会出现「页面显示 ✓ 但 check-ready 判未核」的口径分叉（Codex rev2#4）。
// verifiedDigest=null（未核）时永远不等于当前 hex，自然落回 null。
export function effectiveVerified(a) {
  return a.verifiedDigest === digest(a.claim, a.evidence) ? a.verified : null;
}
