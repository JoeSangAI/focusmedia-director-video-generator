#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {
    audio: '',
    out: '',
    outDir: '',
    maxSeconds: 15,
    targetSeconds: 14.95,
    ffmpeg: 'ffmpeg',
    ffprobe: 'ffprobe',
    metadata: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--audio') args.audio = next();
    else if (arg === '--out') args.out = next();
    else if (arg === '--out-dir') args.outDir = next();
    else if (arg === '--max-seconds') args.maxSeconds = Number(next());
    else if (arg === '--target-seconds') args.targetSeconds = Number(next());
    else if (arg === '--ffmpeg') args.ffmpeg = next();
    else if (arg === '--ffprobe') args.ffprobe = next();
    else if (arg === '--no-metadata') args.metadata = false;
    else if (arg === '--help') {
      console.log(`Usage:
  node prepare_seedance_audio_asset.js --audio <audio-file>
  node prepare_seedance_audio_asset.js --audio <audio-file> --out <prepared-file>
  node prepare_seedance_audio_asset.js --audio <audio-file> --out-dir <dir>

Default rule:
  max seconds: 15
  trim target: 14.95
  trimming uses ffmpeg -c copy, so audio is not recompressed.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.audio) throw new Error('Pass --audio <audio-file>.');
  if (!Number.isFinite(args.maxSeconds) || args.maxSeconds <= 0) throw new Error('--max-seconds must be positive.');
  if (!Number.isFinite(args.targetSeconds) || args.targetSeconds <= 0) throw new Error('--target-seconds must be positive.');
  if (args.targetSeconds > args.maxSeconds) throw new Error('--target-seconds must be <= --max-seconds.');
  args.audio = path.resolve(args.audio);
  if (args.out) args.out = path.resolve(args.out);
  if (args.outDir) args.outDir = path.resolve(args.outDir);
  return args;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function durationSeconds(file, ffprobe) {
  const output = run(ffprobe, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file
  ]);
  const duration = Number(output);
  if (!Number.isFinite(duration)) throw new Error(`Could not read audio duration for ${file}`);
  return duration;
}

function defaultOutPath(input, args) {
  const parsed = path.parse(input);
  const suffix = `_trim${String(args.targetSeconds).replace('.', 'p')}s`;
  const dir = args.outDir || parsed.dir;
  return path.join(dir, `${parsed.name}${suffix}${parsed.ext}`);
}

function copyIfNeeded(input, output) {
  if (path.resolve(input) === path.resolve(output)) return;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(input, output);
}

function trimAudio(input, output, args, targetSeconds) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  run(args.ffmpeg, [
    '-y',
    '-i', input,
    '-t', String(targetSeconds),
    '-c', 'copy',
    output
  ]);
}

function trimUntilWithinLimit(input, output, args) {
  let target = args.targetSeconds;
  let outputDuration = Infinity;
  const attempts = [];

  for (let attempt = 1; attempt <= 6; attempt++) {
    trimAudio(input, output, args, target);
    outputDuration = durationSeconds(output, args.ffprobe);
    attempts.push({
      attempt,
      target_seconds: Number(target.toFixed(3)),
      output_duration_seconds: Number(outputDuration.toFixed(3))
    });
    if (outputDuration <= args.maxSeconds) {
      return { outputDuration, attempts, effectiveTargetSeconds: target };
    }

    const overage = outputDuration - args.maxSeconds;
    target = Math.max(0.1, target - overage - 0.1);
  }

  throw new Error(`Prepared audio still exceeds ${args.maxSeconds}s: ${outputDuration.toFixed(3)}s (${output})`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.audio)) throw new Error(`Audio file not found: ${args.audio}`);

  const originalDuration = durationSeconds(args.audio, args.ffprobe);
  const out = args.out || (originalDuration > args.maxSeconds ? defaultOutPath(args.audio, args) : args.audio);
  let action = 'unchanged';
  let outputDuration;
  let trimAttempts = [];
  let effectiveTargetSeconds = null;

  if (originalDuration > args.maxSeconds) {
    action = 'trimmed_copy';
    const trimResult = trimUntilWithinLimit(args.audio, out, args);
    outputDuration = trimResult.outputDuration;
    trimAttempts = trimResult.attempts;
    effectiveTargetSeconds = trimResult.effectiveTargetSeconds;
  } else if (args.out || args.outDir) {
    action = 'copied';
    copyIfNeeded(args.audio, out);
  }

  if (outputDuration == null) {
    outputDuration = durationSeconds(out, args.ffprobe);
  }

  const result = {
    ok: true,
    input: args.audio,
    out,
    action,
    original_duration_seconds: Number(originalDuration.toFixed(3)),
    output_duration_seconds: Number(outputDuration.toFixed(3)),
    max_seconds: args.maxSeconds,
    target_seconds: args.targetSeconds,
    effective_target_seconds: effectiveTargetSeconds == null ? null : Number(effectiveTargetSeconds.toFixed(3)),
    trim_attempts: trimAttempts,
    codec_copy: action === 'trimmed_copy'
  };

  if (args.metadata) {
    fs.writeFileSync(`${out}.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
