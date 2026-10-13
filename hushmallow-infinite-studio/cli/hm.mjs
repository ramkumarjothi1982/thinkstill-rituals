#!/usr/bin/env node
// hm — the Hushmallow Infinite Studio command line.
//
//   node cli/hm.mjs help                 list every command
//   node cli/hm.mjs help <command>       usage of one command
//   node cli/hm.mjs <command> [args…]    e.g. `hm lib validate`, `hm lock status`
//   (also: npm run hm -- <command> …)
//
// Commands are auto-loaded from cli/commands/*.mjs (see cli/lib/registry.mjs
// for the file-name convention and the module contract).

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as paths from '../render/lib/paths.mjs';
import { withHeavyLock, acquireHeavy } from '../render/lib/heavy-lock.mjs';
import { discover, load, resolve, suggest } from './lib/registry.mjs';

export const COMMANDS_DIR = fileURLToPath(new URL('./commands/', import.meta.url));

async function help(entries, target) {
  if (target.length) {
    const r = resolve(entries, target);
    if (r.entry && !r.args.length) {
      const c = await load(r.entry);
      console.log(`${c.usage}\n\n${c.summary}`);
      return 0;
    }
    if (r.group) {
      console.log(`hm ${r.group} <subcommand>\n`);
      for (const m of r.members) console.log(`  hm ${m.name.padEnd(22)} ${(await load(m)).summary}`);
      return 0;
    }
    console.error(`hm: no command "${target.join(' ')}"`);
    return 2;
  }
  console.log('hm — Hushmallow Infinite Studio\n\nusage: hm <command> [args…]   (hm help <command> for details)\n');
  for (const e of entries) console.log(`  hm ${e.name.padEnd(22)} ${(await load(e)).summary}`);
  return 0;
}

/** Run hm with argv (without node/script). Returns the exit code. */
export async function main(argv, { commandsDir = COMMANDS_DIR } = {}) {
  const entries = discover(commandsDir);
  if (!argv.length || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') return help(entries, argv.slice(1));
  const r = resolve(entries, argv);
  if (r.group) return help(entries, r.group.split(' '));
  if (r.unknown !== undefined) {
    const s = suggest(entries, r.unknown);
    console.error(`hm: unknown command "${r.unknown}"${s.length ? ` (did you mean: ${s.join(', ')}?)` : ''}. Try: hm help`);
    return 2;
  }
  const cmd = await load(r.entry);
  if (r.args.includes('--help') || r.args.includes('-h')) { console.log(`${cmd.usage}\n\n${cmd.summary}`); return 0; }
  const ctx = {
    name: cmd.name,
    paths,
    heavy: { withHeavyLock, acquireHeavy },
    log: (...a) => console.error(`[hm ${cmd.name}]`, ...a),
  };
  const code = await cmd.run(r.args, ctx);
  return typeof code === 'number' ? code : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    console.error(`hm: ${e.stack || e.message}`);
    process.exitCode = 1;
  });
}
