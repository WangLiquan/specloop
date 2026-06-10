import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const jobs = [
  { in: 'lib/cli/render-spec-main.mjs', out: 'skills/draft/scripts/render.mjs' },
  { in: 'lib/cli/check-ready-main.mjs', out: 'skills/draft/scripts/check-ready.mjs' },
  { in: 'lib/cli/annotate-assumptions-main.mjs', out: 'skills/draft/scripts/annotate-assumptions.mjs' },
  { in: 'lib/cli/extract-main.mjs', out: 'skills/verify/scripts/extract.mjs' },
  { in: 'lib/cli/annotate-main.mjs', out: 'skills/verify/scripts/annotate.mjs' }
];

let drift = false;
for (const j of jobs) {
  const res = await build({
    entryPoints: [join(root, j.in)],
    bundle: true, platform: 'node', format: 'esm', target: 'node22',
    banner: { js: '#!/usr/bin/env node' },
    write: false, loader: { '.json': 'json' }
  });
  const next = res.outputFiles[0].text;
  const outPath = join(root, j.out);
  if (check) {
    let cur = '';
    try { cur = readFileSync(outPath, 'utf8'); } catch {}
    if (cur !== next) { console.error('bundle stale: ' + j.out); drift = true; }
  } else {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outPath, next);
    console.error('bundled ' + j.out);
  }
}
if (check && drift) process.exit(1);
