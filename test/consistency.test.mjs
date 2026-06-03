import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('schema is in sync across skills', () => {
  execFileSync('node', ['scripts/sync-schema.mjs', '--check']); // 非零退出会 throw
});

test('bundled ship scripts are fresh', () => {
  execFileSync('node', ['scripts/bundle.mjs', '--check']);
});
