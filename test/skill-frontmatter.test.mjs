import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Frontmatter must be valid YAML, or `npx skills` silently skips the skill
// while scanning the repo ("Found N skill" undercounts) — add/update then fail
// with no usable error. The classic trap: an unquoted plain scalar (like the
// `description:` line) containing ": " — YAML reads it as a nested mapping and
// aborts. Guard both SKILL.md files against it.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = ["skills/draft/SKILL.md", "skills/verify/SKILL.md"];

for (const rel of SKILLS) {
  test(`${rel} frontmatter has no YAML-breaking ": " in unquoted scalars`, () => {
    const text = readFileSync(join(root, rel), "utf8");
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(m, `${rel}: missing frontmatter block`);
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([A-Za-z][\w-]*): (.*)$/);
      if (!kv) continue;
      const [, key, value] = kv;
      const quoted = /^".*"$/.test(value) || /^'.*'$/.test(value);
      if (quoted) continue;
      assert.ok(
        !value.includes(": "),
        `${rel}: "${key}" value contains ": " — YAML parses it as a nested mapping and the skill gets skipped`,
      );
    }
  });
}
