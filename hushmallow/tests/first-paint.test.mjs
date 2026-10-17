// The first paint on a slow first visit is the app's dark background, not white: the boot modulepreloads now share
// the first round trip with the four render-blocking stylesheets (tools/site/boot-preload.mjs), so the page's own
// <html> carries the background (--ink-0) until app.css arrives. The CSP's style-src allows the inline attribute.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');

test('index.html paints the app\'s dark background before any stylesheet arrives', () => {
  const ink = /--ink-0:\s*(#[0-9a-f]{6})/i.exec(read('src/ui/tokens.css'))[1].toLowerCase();
  assert.match(read('index.html'), new RegExp(`^<!doctype html>\\n<html lang="en" style="background:${ink}">\\n`, 'i'));
  assert.match(read('index.html'), new RegExp(`<meta name="theme-color" content="${ink}">`, 'i'));
  assert.match(read('tools/site/security-headers.mjs'), /"style-src 'self' 'unsafe-inline'"/, 'the inline attribute is allowed by the CSP');
});
