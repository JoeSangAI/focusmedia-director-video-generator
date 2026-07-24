#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'prepare_seedance_audio_asset.js');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function hasBinary(name) {
  const result = spawnSync(name, ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

function duration(file) {
  return Number(run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file
  ]));
}

if (!hasBinary('ffmpeg') || !hasBinary('ffprobe')) {
  console.log('test_prepare_seedance_audio_asset skipped: ffmpeg/ffprobe missing');
  process.exit(0);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seedance-audio-'));
const longAudio = path.join(root, 'long.wav');
const shortAudio = path.join(root, 'short.wav');

run('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'sine=frequency=440:duration=16',
  '-ar', '48000',
  longAudio
]);
run('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', 'sine=frequency=440:duration=1',
  '-ar', '48000',
  shortAudio
]);

const preparedLong = path.join(root, 'prepared_long.wav');
const longResult = JSON.parse(run(process.execPath, [
  SCRIPT,
  '--audio', longAudio,
  '--out', preparedLong
]));

assert.equal(longResult.action, 'trimmed_copy');
assert(longResult.original_duration_seconds > 15);
assert(longResult.output_duration_seconds <= 15);
assert(fs.existsSync(preparedLong));
assert(fs.existsSync(`${preparedLong}.json`));
assert(duration(preparedLong) <= 15);

const preparedShort = path.join(root, 'prepared_short.wav');
const shortResult = JSON.parse(run(process.execPath, [
  SCRIPT,
  '--audio', shortAudio,
  '--out', preparedShort
]));

assert.equal(shortResult.action, 'copied');
assert.equal(shortResult.codec_copy, false);
assert(fs.existsSync(preparedShort));
assert(duration(preparedShort) <= 1.1);

console.log('test_prepare_seedance_audio_asset passed');
