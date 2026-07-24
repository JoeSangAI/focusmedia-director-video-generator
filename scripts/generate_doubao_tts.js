#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ENV_FILE =
  process.env.FOCUSMEDIA_AI_PROVIDER_ENV ||
  path.join(os.homedir(), '.config', 'joe', 'secrets', 'ai-providers.env');
const DEFAULT_ENDPOINT =
  'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    keyVar: 'VOLCENGINE_DOUBAO_AUDIO_API_KEY',
    endpoint: DEFAULT_ENDPOINT,
    resourceId: 'seed-tts-2.0',
    jobsJson: '',
    concurrency: 3,
    metadata: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--env-file') args.envFile = next();
    else if (arg === '--key-var') args.keyVar = next();
    else if (arg === '--endpoint') args.endpoint = next();
    else if (arg === '--resource-id') args.resourceId = next();
    else if (arg === '--jobs-json') args.jobsJson = path.resolve(next());
    else if (arg === '--concurrency') args.concurrency = Number(next());
    else if (arg === '--no-metadata') args.metadata = false;
    else if (arg === '--help') {
      console.log(
        'Usage: node generate_doubao_tts.js --jobs-json <jobs.json> [--concurrency 3]'
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.jobsJson) throw new Error('Pass --jobs-json <jobs.json>.');
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    args.concurrency = 1;
  }
  return args;
}

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
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
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

async function generate(job, index, config) {
  const out = path.resolve(job.out);
  const requestId = crypto.randomUUID();
  const additions = {
    context_texts: Array.isArray(job.context_texts)
      ? job.context_texts.filter(Boolean)
      : [],
    aigc_watermark: false
  };
  const body = {
    req_params: {
      text: String(job.text),
      speaker: String(job.speaker),
      audio_params: {
        format: job.format || 'mp3',
        sample_rate: Number(job.sample_rate || 48000),
        speech_rate: Number(job.speech_rate || 0),
        enable_timestamp: true
      },
      additions: JSON.stringify(additions)
    }
  };

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      'X-Api-Key': config.apiKey,
      'X-Api-Resource-Id': config.resourceId,
      'X-Api-Request-Id': requestId
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 1000);
    return { ok: false, out, status: response.status, message };
  }

  const decoder = new TextDecoder();
  let pending = '';
  const audioChunks = [];
  const sentences = [];
  let terminalMessage = '';
  for await (const chunk of response.body) {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.code !== 0) {
        terminalMessage = event.message || `TTS code ${event.code}`;
        continue;
      }
      if (event.data) audioChunks.push(Buffer.from(event.data, 'base64'));
      if (event.sentence) sentences.push(event.sentence);
    }
  }
  if (pending.trim()) {
    const event = JSON.parse(pending);
    if (event.code === 0 && event.data) {
      audioChunks.push(Buffer.from(event.data, 'base64'));
    } else if (event.code !== 0) {
      terminalMessage = event.message || `TTS code ${event.code}`;
    }
    if (event.sentence) sentences.push(event.sentence);
  }

  const audio = Buffer.concat(audioChunks);
  if (!audio.length) {
    return {
      ok: false,
      out,
      status: response.status,
      message: terminalMessage || 'No audio payload returned.'
    };
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, audio);
  const result = {
    ok: true,
    out,
    bytes: audio.length,
    model: config.resourceId,
    speaker: job.speaker,
    speech_rate: Number(job.speech_rate || 0),
    context_texts: additions.context_texts,
    text_sha256: sha256(job.text),
    request_id: requestId,
    sentence_count: sentences.length
  };
  if (config.metadata) {
    fs.writeFileSync(`${out}.json`, `${JSON.stringify(result, null, 2)}\n`);
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = { ...parseEnvFile(args.envFile), ...process.env };
  const apiKey = env[args.keyVar];
  if (!apiKey) {
    throw new Error(`Missing ${args.keyVar} in ${args.envFile}.`);
  }
  const jobs = JSON.parse(fs.readFileSync(args.jobsJson, 'utf8'));
  if (!Array.isArray(jobs) || !jobs.length) {
    throw new Error('Jobs JSON must be a non-empty array.');
  }
  const results = await runWithConcurrency(
    jobs,
    args.concurrency,
    (job, index) => generate(job, index, { ...args, apiKey })
  );
  const safeResults = results.map(result => ({
    ...result,
    request_id: result.request_id ? '[redacted]' : undefined
  }));
  console.log(JSON.stringify(safeResults, null, 2));
  if (results.some(result => !result.ok)) process.exit(1);
}

main().catch(error => {
  console.error(error.message || String(error));
  process.exit(1);
});
