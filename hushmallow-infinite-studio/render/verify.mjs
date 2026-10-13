// Verify a rendered MP4 against the delivery spec and prove it plays.
//
//   node render/verify.mjs [output/my-brain-at-2am.mp4]
//
// Checks: H.264 High / yuv420p / 1080×1920 / 30 fps / 450 frames / 15.000 s,
// AAC 48 kHz stereo, faststart (moov before mdat), full decode with zero
// errors, loudness (EBU R128) and true peak, audio/video duration match.
// Writes output/verify.json and prints a summary.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'output/my-brain-at-2am.mp4';
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', file], { encoding: 'utf8' }));
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');

// faststart: the 'moov' atom must come before 'mdat'
const head = fs.readFileSync(file).subarray(0, 1 << 20).toString('latin1');
const faststart = head.indexOf('moov') >= 0 && (head.indexOf('mdat') < 0 || head.indexOf('moov') < head.indexOf('mdat'));

const dec = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']);
const decodeErrors = (dec.stderr || '').trim();

let loud = null;
if (a) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const s = r.stderr;
  const grab = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : null; };
  loud = {
    integratedLUFS: grab(/Integrated loudness:\s+I:\s+(-?[\d.]+)/),
    lra: grab(/Loudness range:\s+LRA:\s+(-?[\d.]+)/),
    truePeakDBTP: grab(/True peak:\s+Peak:\s+(-?[\d.]+)/),
  };
}

const checks = {
  'video codec h264 (High)': v?.codec_name === 'h264' && /High/.test(v?.profile || ''),
  'pixel format yuv420p': v?.pix_fmt === 'yuv420p',
  'resolution 1080x1920': v?.width === 1080 && v?.height === 1920,
  'frame rate 30': v?.r_frame_rate === '30/1',
  'frames 450': Number(v?.nb_read_frames) === 450,
  'duration 15.000 s': Math.abs(parseFloat(probe.format.duration) - 15) < 0.03,
  'audio AAC 48 kHz stereo': a?.codec_name === 'aac' && a?.sample_rate === '48000' && a?.channels === 2,
  'audio length matches video': a ? Math.abs(parseFloat(a.duration) - parseFloat(v.duration)) < 0.05 : false,
  'faststart (moov first)': faststart,
  'decodes with zero errors': decodeErrors === '',
};
if (loud) {
  checks['loudness -16 ±1.5 LUFS'] = loud.integratedLUFS != null && Math.abs(loud.integratedLUFS + 16) <= 1.5;
  checks['true peak ≤ -1.0 dBTP'] = loud.truePeakDBTP != null && loud.truePeakDBTP <= -1.0;
}

const report = {
  file: path.resolve(file), bytes: Number(probe.format.size), bitrate: Number(probe.format.bit_rate),
  video: v && { codec: v.codec_name, profile: v.profile, pix_fmt: v.pix_fmt, size: `${v.width}x${v.height}`, fps: v.r_frame_rate, frames: Number(v.nb_read_frames), duration: v.duration, color: [v.color_primaries, v.color_transfer, v.color_space].join('/') },
  audio: a && { codec: a.codec_name, rate: a.sample_rate, channels: a.channels, duration: a.duration, bitrate: a.bit_rate },
  loudness: loud, checks, decodeErrors: decodeErrors || null,
};
fs.writeFileSync(path.join(path.dirname(file), 'verify.json'), JSON.stringify(report, null, 2));
for (const [k, ok] of Object.entries(checks)) console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}`);
if (loud) console.log(`loudness ${loud.integratedLUFS} LUFS, LRA ${loud.lra} LU, true peak ${loud.truePeakDBTP} dBTP`);
console.log(`${(report.bytes / 1e6).toFixed(1)} MB, ${(report.bitrate / 1e6).toFixed(1)} Mb/s`);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
