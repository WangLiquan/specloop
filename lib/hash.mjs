import { createHash } from 'node:crypto';

// 只对"契约部分"做 hash：schemaVersion + summary + sections + criteria。
// 忽略 verdicts 与展示性 meta，使 report 绑定的 spec 身份只随契约内容变化。
export function specHash(spec) {
  const contract = {
    schemaVersion: spec.schemaVersion,
    summary: spec.summary,
    sections: spec.sections,
    criteria: spec.criteria
  };
  return createHash('sha256').update(canonicalize(contract)).digest('hex');
}

function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort()
      .map(k => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
