import { readFileSync, writeFileSync } from 'node:fs';
import { extractDataIsland } from '../extract.mjs';
import { validateSpec } from '../validate.mjs';
import { renderReportHtml } from '../render-report.mjs';
import { specHash } from '../hash.mjs';

const [, , specHtmlPath, verdictsPath, outPath] = process.argv;
if (!specHtmlPath || !verdictsPath || !outPath) {
  console.error('usage: report.mjs <spec.html> <verdicts.json> <out.report.html>');
  process.exit(2);
}
const spec = extractDataIsland(readFileSync(specHtmlPath, 'utf8'));
const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8'));
const { ok, errors } = validateSpec({ ...spec, verdicts });
if (!ok) {
  console.error('spec+verdicts invalid:\n' + errors.join('\n'));
  process.exit(1);
}
writeFileSync(outPath, renderReportHtml(spec, verdicts, specHash(spec)));
console.error('wrote ' + outPath);
