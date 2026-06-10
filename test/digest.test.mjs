import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digest, effectiveVerified } from '../lib/digest.mjs';

test('digest is deterministic and lowercase hex64', () => {
  const a = digest('claim x', 'lib/foo.mjs:10');
  const b = digest('claim x', 'lib/foo.mjs:10');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('digest changes when claim or evidence changes', () => {
  const base = digest('claim x', 'lib/foo.mjs:10');
  assert.notEqual(base, digest('claim y', 'lib/foo.mjs:10'));
  assert.notEqual(base, digest('claim x', 'lib/foo.mjs:11'));
});

test('effectiveVerified: matching digest yields verified', () => {
  const a = { claim: 'c', evidence: 'f:1', verified: true, verifiedDigest: digest('c', 'f:1') };
  assert.equal(effectiveVerified(a), true);
});

test('effectiveVerified: null digest (unverified) yields null', () => {
  const a = { claim: 'c', evidence: 'f:1', verified: null, verifiedDigest: null };
  assert.equal(effectiveVerified(a), null);
});

test('effectiveVerified: stale digest (claim edited after verify) falls back to null', () => {
  const a = { claim: 'edited claim', evidence: 'f:1', verified: true, verifiedDigest: digest('original claim', 'f:1') };
  assert.equal(effectiveVerified(a), null);
});
