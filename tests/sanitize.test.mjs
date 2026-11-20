import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, safeImageUrl, fallbackAvatar } from '../assets/js/sanitize.js';

test('escapeHtml encodes markup', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror=alert(1)> " ' &`),
    '&lt;img src=x onerror=alert(1)&gt; &quot; &#39; &amp;'
  );
  assert.equal(escapeHtml(null), '');
});

test('safeImageUrl allows https and Firebase Storage URLs', () => {
  const storage = 'https://firebasestorage.googleapis.com/v0/b/artas-experience.firebasestorage.app/o/artworks%2Fuid%2Fa.jpg?alt=media&token=abc-def';
  assert.equal(safeImageUrl(storage), storage);
  assert.equal(safeImageUrl('  https://example.com/a.png  '), 'https://example.com/a.png');
});

test('safeImageUrl rejects javascript, data, blob, and http', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:image/svg+xml,<svg onload=alert(1)>',
    'blob:https://example.com/uuid',
    'http://example.com/a.jpg',
    'https://user:pass@example.com/a.jpg',
    '//evil.com/a.jpg',
    '/etc/passwd.jpg',
    '../secret.jpg',
    'art.svg',
    'javascript'
  ]) {
    assert.equal(safeImageUrl(bad), '', bad);
  }
});

test('safeImageUrl allows local gallery filenames only', () => {
  assert.equal(safeImageUrl('art.jpeg'), 'art.jpeg');
  assert.equal(safeImageUrl('TRUST.png'), 'TRUST.png');
  assert.equal(safeImageUrl('G__9DIUbcAAt_cy.jpeg'), 'G__9DIUbcAAt_cy.jpeg');
  assert.equal(safeImageUrl('foo/bar.jpg'), '');
  assert.equal(safeImageUrl('name with space.jpg'), '');
});

test('fallbackAvatar does not embed raw display names', () => {
  const url = fallbackAvatar('<script>alert(1)</script>', 32);
  assert.match(url, /^data:image\/svg\+xml,/);
  assert.equal(decodeURIComponent(url.slice('data:image/svg+xml,'.length)).includes('<script>'), false);
  assert.match(fallbackAvatar('pame', 32), /%3E%3F%3C|%3EP%3C|P/);
  const decoded = decodeURIComponent(fallbackAvatar('pame', 32).slice('data:image/svg+xml,'.length));
  assert.match(decoded, />P</);
});
