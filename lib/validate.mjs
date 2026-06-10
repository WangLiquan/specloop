import Ajv from 'ajv';
import schema from '../schema/spec.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(schema);

const isBlank = s => typeof s === 'string' && s.trim() === '';

// 返回 { ok, errors[] }。先跑 JSON Schema，再补 schema 表达不了的不变量：
// criteria.id 唯一、assumptions.id 唯一、claim/evidence/reason 非空白。
export function validateSpec(obj) {
  const errors = [];
  if (!validateSchema(obj)) {
    for (const e of validateSchema.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
    return { ok: false, errors };
  }
  const ids = obj.criteria.map(c => c.id);
  if (new Set(ids).size !== ids.length) errors.push('criteria[].id must be unique');
  // 现状假设：id 唯一（AC-4 靠 id 集合匹配/patch，重复会歧义）+ 字段非空白（schema minLength 挡不住 " "）
  if (Array.isArray(obj.assumptions)) {
    const aids = obj.assumptions.map(a => a.id);
    if (new Set(aids).size !== aids.length) errors.push('assumptions[].id must be unique');
    for (const a of obj.assumptions) {
      if (isBlank(a.claim)) errors.push(`assumption ${a.id} has blank claim`);
      if (isBlank(a.evidence)) errors.push(`assumption ${a.id} has blank evidence`);
    }
  }
  if (obj.assumptionReview && isBlank(obj.assumptionReview.reason)) {
    errors.push('assumptionReview.reason must not be blank');
  }
  if (Array.isArray(obj.verdicts)) {
    const seen = new Set();
    for (const v of obj.verdicts) {
      if (!ids.includes(v.criterionId)) errors.push(`verdict references unknown criterionId ${v.criterionId}`);
      if (seen.has(v.criterionId)) errors.push(`duplicate verdict for ${v.criterionId}`);
      seen.add(v.criterionId);
      if (v.status === 'pass' && (!v.evidence || v.evidence.length === 0)) {
        errors.push(`verdict ${v.criterionId} has status pass but no evidence`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
