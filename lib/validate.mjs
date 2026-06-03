import Ajv from 'ajv';
import schema from '../schema/spec.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(schema);

// 返回 { ok, errors[] }。先跑 JSON Schema，再补 schema 表达不了的不变量：
// criteria.id 唯一；verdict 必须引用已存在 criterion；每个 criterion 至多一条 verdict。
export function validateSpec(obj) {
  const errors = [];
  if (!validateSchema(obj)) {
    for (const e of validateSchema.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
    return { ok: false, errors };
  }
  const ids = obj.criteria.map(c => c.id);
  if (new Set(ids).size !== ids.length) errors.push('criteria[].id must be unique');
  if (Array.isArray(obj.verdicts)) {
    const seen = new Set();
    for (const v of obj.verdicts) {
      if (!ids.includes(v.criterionId)) errors.push(`verdict references unknown criterionId ${v.criterionId}`);
      if (seen.has(v.criterionId)) errors.push(`duplicate verdict for ${v.criterionId}`);
      seen.add(v.criterionId);
    }
  }
  return { ok: errors.length === 0, errors };
}
