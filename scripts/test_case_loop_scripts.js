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
assert(fs.existsSync(path.join(caseDir, 'message_contract.json')));
assert(fs.existsSync(path.join(caseDir, 'director_contract.json')));
assert(fs.existsSync(path.join(caseDir, 'story.md')));
assert(fs.existsSync(path.join(caseDir, 'story_contract.json')));
assert(fs.existsSync(path.join(caseDir, 'shot_script.json')));
assert(fs.existsSync(path.join(caseDir, 'director_detail_plans.json')));
assert(fs.existsSync(path.join(caseDir, 'audience_interpretation_review.json')));
assert(fs.existsSync(path.join(caseDir, 'audience_interpretation_assertion_report.json')));
assert(fs.existsSync(path.join(caseDir, 'audience_interpretation_postreview.json')));
assert(fs.existsSync(path.join(caseDir, 'audience_interpretation_postreview_assertion_report.json')));
assert(fs.existsSync(path.join(caseDir, 'text_overlay_plan.json')));
assert(fs.existsSync(path.join(caseDir, 'creative_prompt.md')));
assert(fs.existsSync(path.join(caseDir, 'audio_prompt.md')));
assert(fs.existsSync(path.join(caseDir, 'audio_prompt_review.json')));
assert(fs.existsSync(path.join(caseDir, 'audio_jobs.json')));
assert(fs.existsSync(path.join(caseDir, 'audio_beat_map.json')));
assert(fs.existsSync(path.join(caseDir, 'storyboard_assertion_report.json')));
assert(fs.existsSync(path.join(caseDir, 'storyboard_asset_bindings.json')));
assert(fs.existsSync(path.join(caseDir, 'asset_manifest.json')));
assert(fs.existsSync(path.join(caseDir, 'runtime_config.json')));
assert(fs.existsSync(path.join(caseDir, 'take_review.json')));

const brief = readJson(path.join(caseDir, 'brief.json'));
assert.equal(brief.brand, '胡姬花');
assert.equal(brief.product, '古法小榨花生油');
assert.equal(brief.status, 'draft');
const initialContract = readJson(path.join(caseDir, 'story_contract.json'));
assert.equal(initialContract.audience_interpretation_review.required, true);
assert.equal(initialContract.audience_interpretation_review.status, 'pending');
const initialAudienceReview = readJson(path.join(caseDir, 'audience_interpretation_review.json'));
assert.equal(initialAudienceReview.status, 'pending');
assert.equal(initialAudienceReview.reviewer_role, 'storyboard_risk_reviewer');
assert.equal(initialAudienceReview.independent_from_storyboard_author, false);
assert(initialAudienceReview.review_method.includes('combination_cue_test'));
const initialAudienceAssertion = readJson(path.join(caseDir, 'audience_interpretation_assertion_report.json'));
assert.equal(initialAudienceAssertion.status, 'pending');
const initialAudiencePostreview = readJson(path.join(caseDir, 'audience_interpretation_postreview.json'));
assert.equal(initialAudiencePostreview.status, 'pending');
assert.equal(initialAudiencePostreview.stage, 'post_generation');
const initialAudiencePostreviewAssertion = readJson(path.join(caseDir, 'audience_interpretation_postreview_assertion_report.json'));
assert.equal(initialAudiencePostreviewAssertion.status, 'pending');
const initialTextPlan = readJson(path.join(caseDir, 'text_overlay_plan.json'));
assert.equal(initialTextPlan.generation_mode, 'pending_case_decision');
const initialRuntime = readJson(path.join(caseDir, 'runtime_config.json'));
assert.equal(initialRuntime.generation_phase, 'exploration');
assert.equal(initialRuntime.resolution, '480p');
const initialDirectorContract = readJson(path.join(caseDir, 'director_contract.json'));
assert.equal(initialDirectorContract.status, 'pending_user_confirmation');
assert.equal(initialDirectorContract.known_operation, null);
assert.equal(initialDirectorContract.mechanism_description, '');
assert.equal(initialDirectorContract.audio_dependency, 'auto');
assert.equal(initialDirectorContract.edit_rhythm_profile, 'standard');
const initialPromptReview = readJson(path.join(caseDir, 'audio_prompt_review.json'));
assert.equal(initialPromptReview.status, 'pending');
assert.equal(initialPromptReview.mode, 'development_owner_gate');
const initialBeatMap = readJson(path.join(caseDir, 'audio_beat_map.json'));
assert.equal(initialBeatMap.status, 'pending_audio_selection');
assert.deepEqual(initialBeatMap.anchors, []);
const initialAssetManifest = readJson(path.join(caseDir, 'asset_manifest.json'));
assert.deepEqual(initialAssetManifest.assets, []);
const initialShotScript = readJson(path.join(caseDir, 'shot_script.json'));
assert.equal(initialShotScript.schema_version, '0.3');
assert.deepEqual(initialShotScript.fidelity_dimensions, ['identity_fidelity', 'motion_boldness', 'scene_density']);
const initialTakeReview = readJson(path.join(caseDir, 'take_review.json'));
assert.equal(initialTakeReview.attempt_budget, 3);
assert.equal(initialTakeReview.status, 'pending');
assert.equal(initialTakeReview.audience_interpretation_postreview.status, 'pending');

run(INIT, [
  '--root', root,
  '--case-id', 'short-service-case',
  '--brief', 'A short service campaign.',
  '--duration-seconds', '7',
  '--aspect-ratio', '9:16',
  '--resolution', '720p',
  '--storyboard-layout', 'text'
]);
const shortCaseDir = path.join(root, '.focusmedia-creative', 'cases', 'short-service-case');
const shortRuntime = readJson(path.join(shortCaseDir, 'runtime_config.json'));
const shortBoard = readJson(path.join(shortCaseDir, 'storyboard_manifest.json'));
assert.equal(shortRuntime.duration_seconds, 7);
assert.equal(shortRuntime.aspect_ratio, '9:16');
assert.equal(shortRuntime.resolution, '720p');
assert.equal(shortBoard.layout, 'text');

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
assert(learningSlice.artifacts.take_review);

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
