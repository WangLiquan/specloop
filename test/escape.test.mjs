import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlSafeJsonIsland, escHtml } from '../lib/escape.mjs';

test('json island escapes script-context chars', () => {
  const out = htmlSafeJsonIsland({ t: '</script><script>alert(1)</script>' });
  assert.ok(!out.includes('</script>'), 'must not contain literal </script>');
  assert.ok(!out.includes('<script'), 'must not contain literal <script');
  assert.ok(out.includes('\\u003c'), 'must encode < as \\u003c');
});

test('json island round-trips back to original object', () => {
  const obj = { a: '</script>', b: ' line', c: ['x', { d: 1 }] };
  assert.deepEqual(JSON.parse(htmlSafeJsonIsland(obj)), obj);
});

test('escHtml neutralizes html metacharacters', () => {
  assert.equal(escHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escHtml('a & "b"'), 'a &amp; &quot;b&quot;');
});
