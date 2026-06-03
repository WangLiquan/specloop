import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = readFileSync(join(root, 'schema/spec.schema.json'));
const targets = [
  join(root, 'skills/draft/references/spec.schema.json'),
  join(root, 'skills/verify/references/spec.schema.json')
];
const check = process.argv.includes('--check');

let drift = false;
for (const t of targets) {
  let cur = null;
  try { cur = readFileSync(t); } catch {}
  if (cur && cur.equals(canonical)) continue;
  if (check) { console.error('schema drift: ' + t); drift = true; }
  else { writeFileSync(t, canonical); console.error('synced ' + t); }
}
if (check && drift) process.exit(1);
