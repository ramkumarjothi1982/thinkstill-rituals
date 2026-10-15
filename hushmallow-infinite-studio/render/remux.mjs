// The provenance of a remux (hm remux, FU-5): a farm render's picture with a new
// score, stamped so that G-FINAL:delivery can verify it.
//
//   stamp    "<the render's farm stamp> remux <key12>" (render/lib/provenance.mjs)
//   record   hm-remux/1: the key, the picture kept (file, sha256, H.264 stream sha256),
//            the sound slots and fixes, the audio edit mode, the score files and the
//            output's sha256; written into provenance.json (in place: it then describes
//            the new final.mp4, and remuxHistory lists every remux) or into
//            provenance.remux.json beside final.remux.mp4, with qa-remux.json, a ready
//            hm-qa-target/1 manifest for it.
// The key is the hash of what decides the new file (the farm job, the picture's stream,
// the sound slots, the fixes, the audio edit), so the same remux gets the same stamp.

import fs from 'node:fs';
import path from 'node:path';
import { STUDIO } from './lib/paths.mjs';
import { hashValue, gitInfo, parseStamp, remuxStamp } from './lib/provenance.mjs';
import { h264StreamSha256 } from './encode.mjs';
import { readJson, writeJsonAtomic, sha256File } from './segment.mjs';
import { deliveryTiming } from './mux.mjs';
import { LEGACY } from '../qa/gates/context.mjs';

export const REMUX_SCHEMA = 'hm-remux/1';

/**
 * Prepare the provenance of a remux of `jobDir`. → { stamp(tags, report) for audio/score-cli
 * remux(), write(result) → { provenance, target, record } | null when the source cannot be
 * verified (no farm stamp, or no provenance.json naming its job) }
 */
export function remuxProvenance(jobDir, { audioEdit = 'priming', inPlace = false } = {}) {
  const dir = path.resolve(jobDir);
  const provFile = path.join(dir, 'provenance.json');
  const prov = readJson(provFile);
  const picture = ['video.mp4', 'final.mp4'].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
  if (!picture) throw new Error(`remux: no picture (video.mp4 or final.mp4) in ${dir}`);
  const pictureStream = h264StreamSha256(picture);
  let state = null;
  const stamp = (tags, report) => {
    const st = parseStamp(tags.comment);
    const key = hashValue({ job: prov?.job?.key ?? null, picture: pictureStream, sound: report.sound, fixes: report.fixes, audioEdit });
    const verifiable = st?.kind === 'farm' && !!prov?.job?.key?.startsWith(st.job);
    state = { key, verifiable, sound: report.sound, fixes: report.fixes, mode: report.mode ?? null };
    if (verifiable) return remuxStamp(st, key);
    return `${tags.comment ? `${tags.comment} | ` : ''}remux ${JSON.stringify({ contour: report.sound.contour, tickTempo: report.sound.tickTempo, panSeed: report.sound.panSeed })}`;
  };
  const write = async (r) => {
    if (!state?.verifiable) return null;
    const mp4 = r.mp4, file = path.basename(mp4);
    const record = {
      schema: REMUX_SCHEMA, key: state.key, at: new Date().toISOString(), git: gitInfo(),
      picture: { file: path.basename(picture), sha256: sha256File(picture), videoStream: pictureStream },
      sound: state.sound, fixes: state.fixes, audioEdit, score: { id: 'hm-score', wav: path.basename(r.wav), sha256: sha256File(r.wav), plan: path.basename(r.planFile) },
      output: { file, sha256: sha256File(mp4), bytes: fs.statSync(mp4).size }, stamp: r.stamp,
      ...(inPlace ? { replaced: prov.final ?? null } : {}),
    };
    const next = {
      ...prov, final: { file, sha256: record.output.sha256, bytes: record.output.bytes }, delivery: await deliveryTiming(mp4),
      remux: record, remuxHistory: [...(prov.remuxHistory || []), record],
    };
    const out = inPlace ? provFile : path.join(dir, 'provenance.remux.json');
    writeJsonAtomic(out, next);
    let target = null;
    if (!inPlace) {
      // a ready QA target for the remuxed file (the job directory's own target is final.mp4)
      const has = (f) => fs.existsSync(path.join(dir, f));
      const legacy = !has('direction.json') && Object.hasOwn(LEGACY, prov.job?.direction ?? '') ? prov.job.direction : null;
      const m = {
        schema: 'hm-qa-target/1', label: `${path.basename(dir)}-remux-${state.key.slice(0, 12)}`,
        description: `hm remux of ${path.basename(dir)}: ${JSON.stringify(state.sound)}`,
        video: file, provenance: path.basename(out), plan: path.basename(r.planFile), score: 'hm-score', out: './qa-remux',
        ...(has('spec.json') ? { spec: 'spec.json' } : {}), ...(has('cues.json') ? { cues: 'cues.json' } : {}),
        ...(has('direction.json') ? { direction: 'direction.json' } : legacy ? { legacy, direction: path.relative(dir, path.join(STUDIO, LEGACY[legacy].direction)) } : {}),
      };
      target = path.join(dir, 'qa-remux.json');
      writeJsonAtomic(target, m);
    }
    return { provenance: out, target, record };
  };
  return { stamp, write, picture, pictureStream };
}
