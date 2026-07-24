#!/usr/bin/env node
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, 'generate_doubao_tts.js');
const result = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });

assert.strictEqual(result.status, 0, result.stderr);
assert(result.stdout.includes('generate_doubao_tts.js --jobs-json'));

console.log('test_generate_doubao_tts_cli passed');
