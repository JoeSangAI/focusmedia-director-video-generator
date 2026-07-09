#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const INIT = path.join(__dirname, 'init_creative_case.js');
const LEARN = path.join(__dirname, 'record_learning_slice.js');

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${path.basename(script)} exited ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'creative-case-loop-'));

run(INIT, [
  '--root', root,
  '--case-id', 'hujihua-gufaxiang',
  '--brief', '不是所有的香，都叫古法香。胡姬花古法小榨花生油。',
  '--brand', '胡姬花',
  '--product', '古法小榨花生油'
]);

const caseDir = path.join(root, '.focusmedia-creative', 'cases', 'hujihua-gufaxiang');
assert(fs.existsSync(path.join(caseDir, 'brief.json')));
assert(fs.existsSync(path.join(caseDir, 'story.md')));
assert(fs.existsSync(path.join(caseDir, 'story_contract.json')));
assert(fs.existsSync(path.join(caseDir, 'shot_script.json')));
assert(fs.existsSync(path.join(caseDir, 'creative_prompt.md')));
assert(fs.existsSync(path.join(caseDir, 'runtime_config.json')));

const brief = readJson(path.join(caseDir, 'brief.json'));
assert.equal(brief.brand, '胡姬花');
assert.equal(brief.product, '古法小榨花生油');
assert.equal(brief.status, 'draft');

run(LEARN, [
  '--case-dir', caseDir,
  '--feedback', '最后胡姬花漏掉了，配音没有上一版有戏剧性。',
  '--route', 'voice_and_copy_plan',
  '--change', '补最后品牌收口，并恢复北方京腔广告感。',
  '--lesson', '清理过程语言时不能压掉声音风格和品牌收口承诺。',
  '--principle', '把个案错误压缩为上层合约规则，不把案例特定的负向词直接追加到通用提示词。',
  '--scope', 'case_candidate',
  '--prompt-policy', 'do_not_auto_append_specific_negatives'
]);

const learningSlice = readJson(path.join(caseDir, 'learning_slice.json'));
assert.equal(learningSlice.feedback, '最后胡姬花漏掉了，配音没有上一版有戏剧性。');
assert.equal(learningSlice.route, 'voice_and_copy_plan');
assert(learningSlice.artifacts.brief);
assert(learningSlice.artifacts.creative_prompt);

const lessonCandidate = readJson(path.join(caseDir, 'lesson_candidate.json'));
assert.equal(lessonCandidate.lesson, '清理过程语言时不能压掉声音风格和品牌收口承诺。');
assert.equal(lessonCandidate.compressed_principle, '把个案错误压缩为上层合约规则，不把案例特定的负向词直接追加到通用提示词。');
assert.equal(lessonCandidate.scope, 'case_candidate');
assert.equal(lessonCandidate.prompt_policy, 'do_not_auto_append_specific_negatives');
assert.equal(lessonCandidate.status, 'candidate');

const digestPath = path.join(root, '.focusmedia-creative', 'learning', 'lesson_candidates.jsonl');
assert(fs.existsSync(digestPath));
assert(fs.readFileSync(digestPath, 'utf8').includes('清理过程语言'));

fs.writeFileSync(path.join(caseDir, 'creative_prompt_v2.md'), '版本二提示词：胡姬花。', 'utf8');
writeJson(path.join(caseDir, 'story_contract_v2.json'), {
  case_id: 'hujihua-gufaxiang-v2',
  brand: '胡姬花'
});
writeJson(path.join(caseDir, 'generation_result_v2.json'), {
  case_id: 'hujihua-gufaxiang-v2',
  status: 'generated'
});
writeJson(path.join(caseDir, 'asr_vo_check_v2.json'), {
  case_id: 'hujihua-gufaxiang-v2',
  missing_voiceover: ['好的花生油，就认古法香。']
});

run(LEARN, [
  '--case-dir', caseDir,
  '--variant', 'v2',
  '--feedback', 'V2 版本反馈。',
  '--route', 'prompt_builder',
  '--change', '记录版本化反馈。',
  '--lesson', 'Learning 需要绑定具体版本产物。'
]);

const versionedSlice = readJson(path.join(caseDir, 'learning_slice.json'));
assert.equal(versionedSlice.artifact_variant, 'v2');
assert.equal(versionedSlice.artifacts.creative_prompt, '版本二提示词：胡姬花。');
assert.equal(versionedSlice.artifacts.story_contract.case_id, 'hujihua-gufaxiang-v2');
assert.equal(versionedSlice.artifacts.generation_result.case_id, 'hujihua-gufaxiang-v2');
assert.deepEqual(versionedSlice.artifacts.asr_vo_check.missing_voiceover, ['好的花生油，就认古法香。']);

console.log('test_case_loop_scripts passed');
