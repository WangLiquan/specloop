import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// package.json.version 是版本号唯一真源；plugin.json / marketplace.json 的 version 是派生，
// 由本脚本同步（无 --check）/ 校验（--check），接进 npm run build / npm run check。
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

const targets = [
  {
    file: '.claude-plugin/plugin.json',
    get: o => o.version,
    set: o => { o.version = version; }
  },
  {
    file: '.claude-plugin/marketplace.json',
    get: o => o.plugins.find(p => p.name === 'specforge')?.version,
    set: o => { o.plugins.find(p => p.name === 'specforge').version = version; }
  }
];

let drift = false;
for (const t of targets) {
  const path = join(root, t.file);
  const obj = JSON.parse(readFileSync(path, 'utf8'));
  if (t.get(obj) === version) continue;
  if (check) { console.error(`version drift: ${t.file} (${t.get(obj)} != ${version})`); drift = true; }
  else { t.set(obj); writeFileSync(path, JSON.stringify(obj, null, 2) + '\n'); console.error('synced version ' + t.file); }
}
if (check && drift) process.exit(1);
