#!/usr/bin/env node
const assert = require('assert');
const { validateStoryboard } = require('./assert_storyboard_density.js');

const contract = {
  case_id: 'rap-case',
  brand: '测试品牌',
  execution_mode: { audio_dependency: 'audio_first', edit_rhythm_profile: 'rap_fast' },
  shot_density_policy: { target_min: 8, target_max: 12, recommended_min: 9, recommended_max: 11, exception_reason: '' }
};
const beatMap = {
  status: 'approved',
  anchors: Array.from({ length: 11 }, (_, i) => ({ id: `beat_${String(i + 1).padStart(2, '0')}`, required: true }))
};
function makeShots(count) {
  return Array.from({ length: count }, (_, i) => ({
    shot: i + 1,
    shot_intention: i === count - 1 ? '让观众记住测试品牌' : `让观众看清第${i + 1}次产品触发`,
    information_delta: i === count - 1 ? '完成测试品牌最终归因' : `新增第${i + 1}种产品使用证据`,
    coherence_check: { supports_intention: true, conflicts: [] },
    ad_function: i === count - 1 ? '测试品牌最终收口' : `功能${i + 1}`,
    audio_anchor: `重拍${i + 1}`,
    audio_beat_ids: [`beat_${String(i + 1).padStart(2, '0')}`],
    visible_action: `动作${i + 1}`,
    product_role: i === count - 1 ? '测试品牌产品完成归因' : '产品触发动作',
    primary_fidelity_spend: i === count - 1 ? 'identity_fidelity' : 'motion_boldness',
    secondary_spend: 'none',
    economized: i === count - 1 ? ['motion_boldness', 'scene_density'] : ['identity_fidelity', 'scene_density'],
    fragility_risk: 'low',
    split_or_simplify_plan: '',
    transition: i === count - 1 ? '' : '交给下一镜',
    screen_text: i === count - 1 ? '测试品牌' : ''
  }));
}

function makeAudienceReview(count) {
  return {
    stage: 'pre_generation',
    reviewer_role: 'storyboard_risk_reviewer',
    independent_from_storyboard_author: true,
    passes: {
      blind_reading: { status: 'complete', intent_was_hidden: true },
      contextual_comparison: { status: 'complete' }
    },
    review_method: [
      'freeze_frame_test',
      'no_brief_test',
      'mainstream_likely_reading_test',
      'sequence_implication_test',
      'combination_cue_test'
    ],
    coverage: {
      reviewed_shots: Array.from({ length: count }, (_, i) => i + 1),
      reviewed_adjacent_pairs: Array.from({ length: Math.max(0, count - 1) }, (_, i) => `${i + 1}-${i + 2}`),
      whole_film_reviewed: true
    },
    items: [],
    unresolved_blockers: [],
    status: 'pass'
  };
}

const valid = validateStoryboard(contract, { shots: makeShots(11) }, beatMap, makeAudienceReview(11));
assert.equal(valid.status, 'pass');

const sparse = validateStoryboard(contract, { shots: makeShots(7) }, beatMap, makeAudienceReview(7));
assert.equal(sparse.status, 'fail');
assert(sparse.issues.some(issue => issue.code === 'insufficient_shot_count'));
assert(sparse.issues.some(issue => issue.code === 'missing_audio_beat_mapping'));

const missingMap = validateStoryboard(contract, { shots: makeShots(11) }, null, makeAudienceReview(11));
assert.equal(missingMap.status, 'fail');
assert(missingMap.issues.some(issue => issue.code === 'audio_beat_map_not_approved'));

const overloadedShots = makeShots(11);
overloadedShots[3].secondary_spend = 'scene_density';
overloadedShots[3].economized = [];
overloadedShots[3].fragility_risk = 'high';
const overloaded = validateStoryboard(contract, { shots: overloadedShots }, beatMap, makeAudienceReview(11));
assert.equal(overloaded.status, 'fail');
assert(overloaded.issues.some(issue => issue.code === 'incomplete_fidelity_budget'));
assert(overloaded.issues.some(issue => issue.code === 'missing_high_risk_mitigation'));

const conflictedShots = makeShots(11);
conflictedShots[0].coherence_check.conflicts = ['产品特写与四人舞蹈同时抢注意力'];
const conflicted = validateStoryboard(contract, { shots: conflictedShots }, beatMap, makeAudienceReview(11));
assert.equal(conflicted.status, 'fail');
assert(conflicted.issues.some(issue => issue.code === 'unresolved_shot_conflict'));

const duplicateDeltaShots = makeShots(11);
duplicateDeltaShots[1].information_delta = duplicateDeltaShots[0].information_delta;
const duplicateDelta = validateStoryboard(contract, { shots: duplicateDeltaShots }, beatMap, makeAudienceReview(11));
assert.equal(duplicateDelta.status, 'fail');
assert(duplicateDelta.issues.some(issue => issue.code === 'duplicate_information_delta'));

const exceptionContract = JSON.parse(JSON.stringify(contract));
exceptionContract.shot_density_policy.exception_reason = '单镜长动作需要13镜完成空间连续性。';
const exceptionBeatMap = {
  status: 'approved',
  anchors: Array.from({ length: 13 }, (_, i) => ({ id: `beat_${String(i + 1).padStart(2, '0')}`, required: true }))
};
const exception = validateStoryboard(exceptionContract, { shots: makeShots(13) }, exceptionBeatMap, makeAudienceReview(13));
assert.equal(exception.status, 'pass_with_warnings');
assert(exception.issues.some(issue => issue.code === 'shot_count_exception'));

const missingRiskReview = validateStoryboard(contract, { shots: makeShots(11) }, beatMap, null);
assert.equal(missingRiskReview.status, 'fail');
assert(missingRiskReview.issues.some(issue => issue.code === 'risk_review_missing_audience_interpretation_review'));

console.log('test_assert_storyboard_density passed');
