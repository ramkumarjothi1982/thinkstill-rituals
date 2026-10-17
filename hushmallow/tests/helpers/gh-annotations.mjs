// A node:test reporter for GitHub Actions: one ::error workflow command per failing test, so a CI failure
// can be read from the check run's annotations (GET /repos/…/check-runs/:id/annotations) even where the
// job log cannot be fetched. It runs beside the usual TAP output (.github/workflows/hushmallow-pages.yml);
// it never changes what passes or fails.
//   node --test --test-reporter=tap --test-reporter-destination=stdout \
//     --test-reporter=./hushmallow/tests/helpers/gh-annotations.mjs --test-reporter-destination=stdout …
import { relative } from 'node:path';

const MAX_MESSAGE = 1500;

// workflow-command escaping: the message, and (stricter) a property value
const data = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const prop = (s) => data(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

/** The ::error line for one test:fail event, or null (a parent that failed only because a subtest did). */
export function annotation(ev, root = process.cwd()) {
  const err = ev?.details?.error;
  if (err?.failureType === 'subtestsFailed') return null;
  const cause = err?.cause ?? err;
  const text = cause?.message ?? (cause == null ? 'failed' : String(cause));
  const message = `${ev?.name ?? 'test'}: ${text}`.slice(0, MAX_MESSAGE);
  const props = [];
  if (ev?.file) props.push(`file=${prop(relative(root, String(ev.file).replace(/^file:\/\//, '')))}`);
  if (Number.isInteger(ev?.line)) props.push(`line=${ev.line}`);
  props.push(`title=${prop(String(ev?.name ?? 'test').slice(0, 200))}`);
  return `::error ${props.join(',')}::${data(message)}`;
}

export default async function* githubAnnotations(source) {
  for await (const event of source) {
    if (event.type !== 'test:fail') continue;
    const line = annotation(event.data);
    if (line) yield `${line}\n`;
  }
}
