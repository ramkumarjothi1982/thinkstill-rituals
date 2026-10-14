// hm spec seal — recompute fingerprint and id of a hand-written spec (for
// example the composer's specs/golden/t01-v2.json). Sealing does not make a
// spec valid: hm spec check judges it.

export const summary = 'Recompute fingerprint and id of a hand-written spec (prints it, or rewrites the file with --write)';
export const usage = 'hm spec seal <spec.json> [--write]';

export async function run(args) {
  const cli = await import('../../planner/cli-support.mjs');
  return cli.guarded(async () => {
    const { values, positionals } = cli.parse(args, { write: { type: 'boolean', default: false } }, 'spec seal');
    if (positionals.length !== 1) throw Object.assign(new Error(`hm spec seal: give one spec file\n${usage}`), { usage: true });
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { sealSpec } = await import('../../planner/fingerprint.mjs');
    const { pretty } = await import('../../planner/canonical.mjs');
    const { assertWritable } = await import('../../render/lib/paths.mjs');
    const file = path.resolve(positionals[0]);
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    const sealed = sealSpec(spec);
    if (!values.write) { process.stdout.write(pretty(sealed)); return 0; }
    fs.writeFileSync(assertWritable(file), pretty(sealed));
    console.log(`${sealed.id}  ${sealed.fingerprint}  -> ${file}${sealed.fingerprint === spec.fingerprint ? ' (unchanged)' : ''}`);
    return 0;
  });
}
