#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DEFAULT_ENV_FILE = process.env.FOCUSMEDIA_AI_PROVIDER_ENV || path.join(os.homedir(), '.config', 'joe', 'secrets', 'ai-providers.env');
const DEFAULT_ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/create';
const DEFAULT_MODEL = 'seed-audio-1.0';

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    keyVar: 'VOLCENGINE_DOUBAO_AUDIO_API_KEY',
    endpoint: '',
    model: '',
    promptFile: '',
    promptText: '',
    reviewJson: '',
    out: '',
    jobsJson: '',
    concurrency: 4,
    format: 'mp3',
    sampleRate: 48000,
    pitchRate: 0,
    speechRate: 0,
    loudnessRate: 0,
    metadata: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--env-file') args.envFile = next();
    else if (arg === '--key-var') args.keyVar = next();
    else if (arg === '--endpoint') args.endpoint = next();
    else if (arg === '--model') args.model = next();
    else if (arg === '--prompt-file') args.promptFile = next();
    else if (arg === '--prompt-text') args.promptText = next();
    else if (arg === '--review-json') args.reviewJson = next();
    else if (arg === '--out') args.out = next();
    else if (arg === '--jobs-json') args.jobsJson = next();
    else if (arg === '--concurrency') args.concurrency = Number(next());
    else if (arg === '--format') args.format = next();
    else if (arg === '--sample-rate') args.sampleRate = Number(next());
    else if (arg === '--pitch-rate') args.pitchRate = Number(next());
    else if (arg === '--speech-rate') args.speechRate = Number(next());
    else if (arg === '--loudness-rate') args.loudnessRate = Number(next());
    else if (arg === '--no-metadata') args.metadata = false;
    else if (arg === '--help') {
      console.log(`Usage:
  node generate_doubao_audio.js --prompt-file <prompt.md> [--review-json <audio_prompt_review.json>] --out <audio.mp3>
  node generate_doubao_audio.js --jobs-json <jobs.json> --concurrency 4

Jobs JSON:
  [
    {"prompt_file": "/path/prompt-a.md", "out": "/path/a.mp3"},
    {"prompt_text": "生成一段...", "out": "/path/b.mp3"}
  ]

Loads --env-file, FOCUSMEDIA_AI_PROVIDER_ENV, or the local user default, then reads VOLCENGINE_DOUBAO_AUDIO_API_KEY.
Never prints the API key.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.jobsJson) {
    args.jobsJson = path.resolve(args.jobsJson);
  } else {
    if (!args.promptFile && !args.promptText) throw new Error('Pass --prompt-file, --prompt-text, or --jobs-json.');
    if (!args.out) throw new Error('Pass --out <audio-file>.');
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) args.concurrency = 1;
  return args;
}

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function readPrompt(job) {
  if (job.prompt_text) return String(job.prompt_text);
  if (job.prompt_file) return fs.readFileSync(path.resolve(job.prompt_file), 'utf8');
  throw new Error('Each job needs prompt_text or prompt_file.');
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function validatePromptReview(job, prompt) {
  const promptFile = job.prompt_file ? path.resolve(job.prompt_file) : '';
  const reviewFile = job.review_json
    ? path.resolve(job.review_json)
    : (promptFile ? path.join(path.dirname(promptFile), 'audio_prompt_review.json') : '');
  if (!reviewFile || !fs.existsSync(reviewFile)) return { status: 'not_configured', prompt_sha256: sha256(prompt) };

  const review = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
  const actualHash = sha256(prompt);
  if (review.mode !== 'development_owner_gate') {
    return { status: review.status || 'not_required', review_file: reviewFile, prompt_sha256: actualHash };
  }
  if (review.status === 'waived') {
    return { status: 'waived', review_file: reviewFile, prompt_sha256: actualHash };
  }
  if (review.status !== 'approved') {
    throw new Error(`Audio prompt is not approved: ${reviewFile}`);
  }
  if (!review.approved_prompt_sha256 || review.approved_prompt_sha256 !== actualHash) {
    throw new Error(`Audio prompt changed after approval; renew review: ${reviewFile}`);
  }
  return { status: 'approved', review_file: reviewFile, prompt_sha256: actualHash };
}

async function runWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function generateAudio(job, index, config) {
  const out = path.resolve(job.out);
  const prompt = readPrompt(job);
  const promptReview = validatePromptReview(job, prompt);
  const requestId = `focusmedia-doubao-audio-${Date.now()}-${index + 1}`;
  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.apiKey,
      'X-Api-Request-Id': requestId
    },
    body: JSON.stringify({
      model: config.model,
      text_prompt: prompt,
      audio_config: {
        format: config.format,
        sample_rate: config.sampleRate,
        pitch_rate: config.pitchRate,
        speech_rate: config.speechRate,
        loudness_rate: config.loudnessRate
      },
      watermark: {}
    })
  });

  const rawText = await res.text();
  let json;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = { message: rawText.slice(0, 500) };
  }
  const data = json.data || json.Data || json;
  if (!res.ok) {
    return {
      ok: false,
      out,
      status: res.status,
      code: json.code ?? json.Code,
      message: json.message || json.Message || json.msg || 'request failed'
    };
  }

  let bytes = null;
  if (data.audio) {
    bytes = Buffer.from(data.audio, 'base64');
  } else if (data.url) {
    const audioRes = await fetch(data.url);
    if (!audioRes.ok) throw new Error(`Audio URL fetch failed: ${audioRes.status}`);
    bytes = Buffer.from(await audioRes.arrayBuffer());
  }
  if (!bytes || !bytes.length) {
    return { ok: false, out, status: res.status, message: 'No audio payload returned.' };
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, bytes);

  const result = {
    ok: true,
    out,
    bytes: bytes.length,
    duration: data.duration,
    original_duration: data.original_duration,
    format: config.format,
    model: config.model,
    prompt_sha256: promptReview.prompt_sha256,
    prompt_review_status: promptReview.status,
    request_id: requestId
  };
  if (config.metadata) {
    fs.writeFileSync(`${out}.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = { ...parseEnvFile(args.envFile), ...process.env };
  const apiKey = env[args.keyVar];
  if (!apiKey) throw new Error(`Missing ${args.keyVar}. Add it to ${args.envFile} or export it in the shell.`);
  const endpoint = args.endpoint || env.VOLCENGINE_DOUBAO_AUDIO_ENDPOINT || DEFAULT_ENDPOINT;
  const model = args.model || env.VOLCENGINE_DOUBAO_AUDIO_MODEL || DEFAULT_MODEL;
  const jobs = args.jobsJson
    ? JSON.parse(fs.readFileSync(args.jobsJson, 'utf8'))
    : [{ prompt_file: args.promptFile ? path.resolve(args.promptFile) : '', prompt_text: args.promptText, review_json: args.reviewJson, out: args.out }];
  if (!Array.isArray(jobs) || jobs.length === 0) throw new Error('Jobs JSON must be a non-empty array.');

  const results = await runWithConcurrency(jobs, args.concurrency, (job, index) =>
    generateAudio(job, index, { ...args, endpoint, model, apiKey })
  );
  const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify(results.map(r => ({ ...r, request_id: r.request_id ? '[redacted]' : undefined })), null, 2));
  if (failed.length) process.exit(1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message || String(err));
    process.exit(1);
  });
}

module.exports = { sha256, validatePromptReview };
