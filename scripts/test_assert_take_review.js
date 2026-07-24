#!/usr/bin/env node
const assert = require('assert');
const { validateTakeReview } = require('./assert_take_review.js');

function baseReview() {
  return {
    case_id: 'test-case',
    attempt_budget: 3,
    current_attempt: 1,
    verdict: 'keep',
    evidence: ['品牌、产品与动作均通过硬门槛。'],
    audience_interpretation_postreview: {
      sample_id: 'sample_01',
      status: 'pass',
      unresolved_blockers: []
    },
    locked_audio_assertion: {
      required: false,
      sample_id: '',
      status: 'not_applicable',
      report: ''
    },
    repeated_failure_evidence: { failure: '', identical_sample_ids: [] },
    next_generation_change: { variable: 'none', instruction: '' },
    status: 'decided'
  };
}

assert.equal(validateTakeReview(baseReview()).status, 'pass');

const reroll = baseReview();
reroll.verdict = 're_roll';
reroll.next_generation_change.variable = 'sampling_seed';
assert.equal(validateTakeReview(reroll).status, 'pass');

const rewrite = baseReview();
rewrite.verdict = 'rewrite';
rewrite.evidence = ['两个相同输入样本都丢失交接动作。'];
rewrite.repeated_failure_evidence = { failure: '交接动作消失', identical_sample_ids: ['sample_01', 'sample_02'] };
rewrite.next_generation_change = { variable: 'storyboard', instruction: '把一个高密度镜头拆成两个连续镜头。' };
rewrite.audience_interpretation_postreview = {
  sample_id: 'sample_01',
  status: 'needs_revision',
  unresolved_blockers: ['产品交接动作造成不尊重观感']
};
assert.equal(validateTakeReview(rewrite).status, 'pass');

const unsafeKeep = baseReview();
unsafeKeep.audience_interpretation_postreview.status = 'needs_revision';
unsafeKeep.audience_interpretation_postreview.unresolved_blockers = ['可能被解读为祭祀场景'];
const unsafeKeepResult = validateTakeReview(unsafeKeep);
assert.equal(unsafeKeepResult.status, 'fail');
assert(unsafeKeepResult.issues.some(issue => issue.code === 'unsafe_sample_marked_selectable'));

const missingPostreview = baseReview();
delete missingPostreview.audience_interpretation_postreview;
const missingPostreviewResult = validateTakeReview(missingPostreview);
assert.equal(missingPostreviewResult.status, 'fail');
assert(missingPostreviewResult.issues.some(issue => issue.code === 'missing_audience_postreview'));

const missingAudioAssertion = baseReview();
delete missingAudioAssertion.locked_audio_assertion;
const missingAudioAssertionResult = validateTakeReview(missingAudioAssertion);
assert.equal(missingAudioAssertionResult.status, 'fail');
assert(missingAudioAssertionResult.issues.some(issue => issue.code === 'missing_locked_audio_assertion'));

const mismatchedAudioKeep = baseReview();
mismatchedAudioKeep.locked_audio_assertion = {
  required: true,
  sample_id: 'sample_01',
  status: 'fail',
  report: 'locked_audio_assertion_report.json'
};
const mismatchedAudioKeepResult = validateTakeReview(mismatchedAudioKeep);
assert.equal(mismatchedAudioKeepResult.status, 'fail');
assert(mismatchedAudioKeepResult.issues.some(issue => issue.code === 'audio_mismatch_sample_marked_selectable'));

const blindReroll = baseReview();
blindReroll.verdict = 're_roll';
blindReroll.repeated_failure_evidence = { failure: '产品变形', identical_sample_ids: ['sample_01', 'sample_02'] };
blindReroll.next_generation_change.variable = 'sampling_seed';
const blindResult = validateTakeReview(blindReroll);
assert.equal(blindResult.status, 'fail');
assert(blindResult.issues.some(issue => issue.code === 'systematic_failure_requires_rewrite'));

const multiChange = baseReview();
multiChange.verdict = 'rewrite';
multiChange.next_generation_change = { variable: 'storyboard+creative_prompt', instruction: '同时修改两处。' };
const multiResult = validateTakeReview(multiChange);
assert.equal(multiResult.status, 'fail');
assert(multiResult.issues.some(issue => issue.code === 'rewrite_missing_single_owner'));

const exhausted = baseReview();
exhausted.current_attempt = 3;
exhausted.verdict = 're_roll';
exhausted.next_generation_change.variable = 'sampling_seed';
const exhaustedResult = validateTakeReview(exhausted);
assert.equal(exhaustedResult.status, 'fail');
assert(exhaustedResult.issues.some(issue => issue.code === 'attempt_budget_exhausted'));

console.log('test_assert_take_review passed');
