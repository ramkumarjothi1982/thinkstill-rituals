// Remove comments from the JavaScript and CSS the customer build ships, so
// notes written for developers never reach a browser. Strings, template
// literals (with their ${…} parts) and regular expressions are copied as they
// are. tools/build-app.mjs checks every stripped module still parses.

const REGEX_AFTER = new Set('(,=:[!&|?{};+-*%<>~^'.split(''));
const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const isWord = (c) => /[\w$]/.test(c);

export function stripJs(src) {
  let out = '';
  let i = 0;
  let last = '';                 // the last significant character written (for telling a regex from a division)
  let word = '';                 // the identifier or keyword just written
  let gap = false;               // whitespace since the last character
  const braces = [];             // for each open ${ in a template literal: how many { are open inside it
  const n = src.length;
  const copyQuoted = (q) => {    // a '…' or "…" string
    let j = i + 1;
    while (j < n && src[j] !== q) { if (src[j] === '\\') j++; j++; }
    out += src.slice(i, j + 1); i = j + 1; last = q; word = '';
  };
  const copyTemplate = () => {   // from just after ` (or after the } that closes a ${…}) to the closing ` or the next ${
    let j = i;
    while (j < n) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') { out += src.slice(i, j + 1); i = j + 1; last = '`'; word = ''; return; }
      if (src[j] === '$' && src[j + 1] === '{') { out += src.slice(i, j + 2); i = j + 2; braces.push(0); last = '{'; word = ''; return; }
      j++;
    }
    out += src.slice(i); i = n;
  };
  const copyRegex = () => {
    let j = i + 1;
    let inClass = false;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
      else if (c === '\n') throw new Error(`unterminated regular expression at ${i}`);
      j++;
    }
    j++;
    while (j < n && /[a-z]/i.test(src[j])) j++;   // flags
    out += src.slice(i, j); i = j; last = '/'; word = '';
  };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const body = src.slice(i, end < 0 ? n : end + 2);
      out += body.includes('\n') ? '\n' : ' ';
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (c === '\'' || c === '"') { copyQuoted(c); continue; }
    if (c === '`') { out += c; i++; copyTemplate(); continue; }
    if (c === '/') {
      if (last === '' || REGEX_AFTER.has(last) || REGEX_WORDS.has(word)) { copyRegex(); continue; }
      out += c; i++; last = c; word = ''; continue;
    }
    if (braces.length && c === '{') braces[braces.length - 1]++;
    if (braces.length && c === '}') {
      if (braces[braces.length - 1] === 0) { braces.pop(); out += c; i++; copyTemplate(); continue; }
      braces[braces.length - 1]--;
    }
    out += c;
    i++;
    if (/\s/.test(c)) { gap = true; continue; }
    if (isWord(c)) { word = isWord(last) && !gap ? word + c : c; last = c; } else { last = c; word = ''; }
    gap = false;
  }
  return out;                    // (no tidying: a template literal's own spaces and blank lines must stay as written)
}

export function stripCss(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === '"' || c === '\'') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '');
}

export const stripHtml = (src) => src.replace(/<!--[\s\S]*?-->/g, '');
