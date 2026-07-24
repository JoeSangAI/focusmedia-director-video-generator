#!/usr/bin/env node
const assert = require('assert');
const { validateAudienceInterpretationReview } = require('./assert_audience_interpretation_review.js');

const shotScript = {
  case_id: 'red-peony-ritual-regression',
  shots: [
    { shot: 1, visible_action: '一家人围坐桌边' },
    { shot: 2, visible_action: '单独一碗白米饭居中，多人同时敲碗' },
    { shot: 3, visible_action: '所有人静止看向中央的饭' }
  ]
};

function completeReview() {
  return {
    case_id: 'red-peony-ritual-regression',
    stage: 'pre_generation',
    reviewer_role: 'storyboard_risk_reviewer',
    independent_from_storyboard_author: true,
    passes: {
      blind_reading: { status: 'complete', intent_was_hidden: true },
      contextual_comparison: { status: 'complete' }
    },
    review_context: ['mainstream Chinese audience', 'family dining'],
    review_method: [
      'freeze_frame_test',
      'no_brief_test',
      'mainstream_likely_reading_test',
      'sequence_implication_test',
      'combination_cue_test'
    ],
    coverage: {
      reviewed_shots: [1, 2, 3],
      reviewed_adjacent_pairs: ['1-2', '2-3'],
      whole_film_reviewed: true
    },
    items: [],
    regulatory_candidates: [],
    unresolved_blockers: [],
    status: 'pass'
  };
}

assert.equal(validateAudienceInterpretationReview(completeReview(), shotScript, 'pre_generation').status, 'pass');

const missing = validateAudienceInterpretationReview(null, shotScript, 'pre_generation');
assert.equal(missing.status, 'fail');
assert(missing.issues.some(issue => issue.code === 'missing_audience_interpretation_review'));

const incompleteCoverage = completeReview();
incompleteCoverage.coverage.reviewed_shots = [1, 2];
incompleteCoverage.coverage.reviewed_adjacent_pairs = ['1-2'];
const incompleteResult = validateAudienceInterpretationReview(incompleteCoverage, shotScript, 'pre_generation');
assert.equal(incompleteResult.status, 'fail');
assert(incompleteResult.issues.some(issue => issue.code === 'shot_not_reviewed'));
assert(incompleteResult.issues.some(issue => issue.code === 'adjacent_pair_not_reviewed'));

const selfCertified = completeReview();
selfCertified.independent_from_storyboard_author = false;
const selfCertifiedResult = validateAudienceInterpretationReview(selfCertified, shotScript, 'pre_generation');
assert.equal(selfCertifiedResult.status, 'fail');
assert(selfCertifiedResult.issues.some(issue => issue.code === 'review_not_independent'));

const ritualRisk = completeReview();
ritualRisk.items = [{
  shot_scope: [1, 2, 3],
  intended_reading: '一家人期待开饭，突出米饭中心地位',
  likely_reading: '中央孤立的一碗饭配合对称围合、集体敲碗和庄重静止，可能像供奉或祭祀',
  risk: '家庭用餐被误读为供奉、祭祀或悼念场景',
  risk_category: 'ritual_taboo',
  cue_combination: ['单碗白米饭孤立居中', '多人对称围合', '集体敲碗', '人物突然庄重静止'],
  severity: 'p1',
  upstream_owner: 'shot_script',
  repair: '改成自然的盛饭、递饭和夹菜行为，打破对称围合，避免孤立单碗与集体敲击同时出现',
  status: 'open'
}];
ritualRisk.unresolved_blockers = ['shots 1-3 ritual or offering association'];
ritualRisk.status = 'needs_revision';
const ritualRiskResult = validateAudienceInterpretationReview(ritualRisk, shotScript, 'pre_generation');
assert.equal(ritualRiskResult.status, 'fail');
assert(ritualRiskResult.issues.some(issue => issue.code === 'open_high_risk_item'));
assert(ritualRiskResult.issues.some(issue => issue.code === 'review_blockers_unresolved'));

ritualRisk.items[0].status = 'resolved';
ritualRisk.unresolved_blockers = [];
ritualRisk.status = 'pass_after_revision';
const resolvedResult = validateAudienceInterpretationReview(ritualRisk, shotScript, 'pre_generation');
assert.equal(resolvedResult.status, 'pass');

const postReview = {
  case_id: 'red-peony-post',
  sample_id: 'sample_01',
  stage: 'post_generation',
  reviewer_role: 'storyboard_risk_reviewer',
  independent_from_storyboard_author: true,
  passes: {
    blind_reading: { status: 'complete', intent_was_hidden: true },
    contextual_comparison: { status: 'complete' }
  },
  review_method: [
    'normal_speed_test',
    'freeze_frame_test',
    'mainstream_likely_reading_test',
    'sequence_implication_test',
    'combination_cue_test'
  ],
  coverage: {
    whole_film_reviewed: true,
    normal_speed_reviewed: true,
    representative_freeze_frames_reviewed: true
  },
  items: [],
  unresolved_blockers: [],
  status: 'pass'
};
assert.equal(validateAudienceInterpretationReview(postReview, null, 'post_generation').status, 'pass');

console.log('test_assert_audience_interpretation_review passed');
