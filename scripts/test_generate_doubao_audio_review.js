#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sha256, validatePromptReview } = require('./generate_doubao_audio.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-prompt-review-'));
const promptFile = path.join(root, 'audio_prompt.md');
const reviewFile = path.join(root, 'audio_prompt_review.json');
const prompt = '15秒。测试广告歌。';
fs.writeFileSync(promptFile, prompt, 'utf8');

fs.writeFileSync(reviewFile, JSON.stringify({
  mode: 'development_owner_gate',
  status: 'pending',
  prompt_file: 'audio_prompt.md',
  approved_prompt_sha256: ''
}), 'utf8');
assert.throws(() => validatePromptReview({ prompt_file: promptFile }, prompt), /not approved/);

fs.writeFileSync(reviewFile, JSON.stringify({
  mode: 'development_owner_gate',
  status: 'approved',
  prompt_file: 'audio_prompt.md',
  approved_prompt_sha256: sha256(prompt)
}), 'utf8');
assert.equal(validatePromptReview({ prompt_file: promptFile }, prompt).status, 'approved');
assert.throws(() => validatePromptReview({ prompt_file: promptFile }, `${prompt}已改`), /changed after approval/);

fs.writeFileSync(reviewFile, JSON.stringify({
  mode: 'development_owner_gate',
  status: 'waived',
  prompt_file: 'audio_prompt.md',
  approved_prompt_sha256: ''
}), 'utf8');
assert.equal(validatePromptReview({ prompt_file: promptFile }, prompt).status, 'waived');

console.log('test_generate_doubao_audio_review passed');
