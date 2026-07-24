#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ACCEPTED_STATUSES = new Set(['pass', 'pass_after_revision']);
const REQUIRED_PREGEN_METHODS = [
  'freeze_frame_test',
  'no_brief_test',
  'mainstream_likely_reading_test',
  'sequence_implication_test',
  'combination_cue_test'
];
const REQUIRED_POSTGEN_METHODS = [
  'normal_speed_test',
  'freeze_frame_test',
  'mainstream_likely_reading_test',
  'sequence_implication_test',
  'combination_cue_test'
];
const HIGH_RISK_SEVERITIES = new Set(['p0', 'p1']);

function parseArgs(argv) {
  const args = { review: '', shotScript: '', expectedStage: '', out: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--review') args.review = next();
    else if (arg === '--shot-script') args.shotScript = next();
    else if (arg === '--expected-stage') args.expectedStage = next();
    else if (arg === '--out') args.out = next();
    else if (arg === '--help') {
      console.log('Usage: node assert_audience_interpretation_review.js --review <review.json> [--shot-script <shot_script.json>] [--expected-stage pre_generation|post_generation] [--out <report.json>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.review) throw new Error('Pass --review <review.json>.');
  return args;
}

function addIssue(issues, severity, code, message, details = '') {
  issues.push({ severity, code, message, details });
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.some(item => String(item).trim());
}

function adjacentPairs(shotNumbers) {
  const pairs = [];
  for (let i = 0; i < shotNumbers.length - 1; i++) pairs.push(`${shotNumbers[i]}-${shotNumbers[i + 1]}`);
  return pairs;
}

function validateAudienceInterpretationReview(review, shotScript = null, expectedStage = '') {
  const issues = [];
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    addIssue(issues, 'high', 'missing_audience_interpretation_review', '缺少独立的大众语义与礼俗风险审查产物。');
    return { status: 'fail', stage: expectedStage || '', issues };
  }

  const stage = String(review.stage || '').trim();
  if (!['pre_generation', 'post_generation'].includes(stage)) {
    addIssue(issues, 'high', 'invalid_review_stage', 'stage 必须是 pre_generation 或 post_generation。', stage);
  }
  if (expectedStage && stage !== expectedStage) {
    addIssue(issues, 'high', 'unexpected_review_stage', `期望 ${expectedStage}，实际为 ${stage || 'missing'}。`);
  }
  if (review.reviewer_role !== 'storyboard_risk_reviewer') {
    addIssue(issues, 'high', 'wrong_reviewer_role', '审查必须由 storyboard_risk_reviewer 角色独立完成。', review.reviewer_role || 'missing');
  }
  if (review.independent_from_storyboard_author !== true) {
    addIssue(issues, 'high', 'review_not_independent', '审查人不能与分镜执行者为同一角色。');
  }

  const passes = review.passes || {};
  const blind = passes.blind_reading || {};
  const contextual = passes.contextual_comparison || {};
  if (blind.status !== 'complete' || blind.intent_was_hidden !== true) {
    addIssue(issues, 'high', 'blind_reading_not_complete', '必须先在不看导演解释的情况下完成普通观众解读。');
  }
  if (contextual.status !== 'complete') {
    addIssue(issues, 'high', 'contextual_comparison_not_complete', '必须将盲读结果与人物关系、地域和客户边界进行二次对照。');
  }

  const methods = new Set(Array.isArray(review.review_method) ? review.review_method : []);
  const requiredMethods = stage === 'post_generation' ? REQUIRED_POSTGEN_METHODS : REQUIRED_PREGEN_METHODS;
  for (const method of requiredMethods) {
    if (!methods.has(method)) addIssue(issues, 'high', 'missing_review_method', `缺少审查方法：${method}。`, method);
  }

  const coverage = review.coverage || {};
  if (coverage.whole_film_reviewed !== true) {
    addIssue(issues, 'high', 'whole_film_not_reviewed', '必须检查整条片的组合语义，不能只看单个镜头。');
  }

  if (stage === 'pre_generation') {
    const shots = shotScript && Array.isArray(shotScript.shots) ? shotScript.shots : [];
    if (!shots.length) {
      addIssue(issues, 'high', 'missing_reviewed_shot_script', '生成前审查必须绑定非空的 shot_script.json。');
    } else {
      const expectedShots = shots.map((shot, index) => Number(shot.shot) || index + 1);
      const actualShots = new Set(Array.isArray(coverage.reviewed_shots) ? coverage.reviewed_shots.map(Number) : []);
      for (const shot of expectedShots) {
        if (!actualShots.has(shot)) addIssue(issues, 'high', 'shot_not_reviewed', `镜头 ${shot} 未经过风险审查。`, String(shot));
      }
      const actualPairs = new Set(Array.isArray(coverage.reviewed_adjacent_pairs) ? coverage.reviewed_adjacent_pairs.map(String) : []);
      for (const pair of adjacentPairs(expectedShots)) {
        if (!actualPairs.has(pair)) addIssue(issues, 'high', 'adjacent_pair_not_reviewed', `相邻镜头 ${pair} 未检查剪辑组合语义。`, pair);
      }
    }
  } else if (stage === 'post_generation') {
    if (!String(review.sample_id || '').trim()) addIssue(issues, 'high', 'missing_reviewed_sample_id', '成片后审查必须绑定具体 sample_id。');
    if (coverage.normal_speed_reviewed !== true) addIssue(issues, 'high', 'normal_speed_not_reviewed', '成片必须以正常速度完整审看。');
    if (coverage.representative_freeze_frames_reviewed !== true) addIssue(issues, 'high', 'freeze_frames_not_reviewed', '成片必须检查代表性定帧画面。');
  }

  const items = Array.isArray(review.items) ? review.items : [];
  items.forEach((item, index) => {
    const severity = String(item.severity || '').toLowerCase();
    if (!['p0', 'p1', 'p2', 'pass'].includes(severity)) {
      addIssue(issues, 'high', 'invalid_risk_severity', `风险项 ${index + 1} 缺少有效的 severity。`);
    }
    if (!nonEmptyArray(item.shot_scope)) addIssue(issues, 'high', 'missing_risk_shot_scope', `风险项 ${index + 1} 没有标明涉及的镜头或全片范围。`);
    if (!String(item.likely_reading || '').trim()) addIssue(issues, 'high', 'missing_likely_reading', `风险项 ${index + 1} 没有写普通观众最可能的解读。`);
    if (!String(item.risk_category || '').trim()) addIssue(issues, 'high', 'missing_risk_category', `风险项 ${index + 1} 没有 risk_category。`);
    if (!nonEmptyArray(item.cue_combination)) addIssue(issues, 'high', 'missing_cue_combination', `风险项 ${index + 1} 没有记录产生联想的画面、动作或剪辑信号。`);
    if (!String(item.upstream_owner || '').trim()) addIssue(issues, 'high', 'missing_risk_owner', `风险项 ${index + 1} 没有返回责任层。`);
    if (!String(item.repair || '').trim()) addIssue(issues, 'high', 'missing_risk_repair', `风险项 ${index + 1} 没有可执行修改建议。`);
    if (HIGH_RISK_SEVERITIES.has(severity) && String(item.status || '') !== 'resolved') {
      addIssue(issues, 'high', 'open_high_risk_item', `风险项 ${index + 1} 为 ${severity.toUpperCase()} 且尚未解决。`, item.likely_reading || '');
    }
  });

  const blockers = Array.isArray(review.unresolved_blockers) ? review.unresolved_blockers.filter(item => String(item).trim()) : [];
  if (blockers.length) {
    addIssue(issues, 'high', 'review_blockers_unresolved', `仍有 ${blockers.length} 个 P0/P1 阻断项未解决。`, blockers.join('；'));
  }
  if (!ACCEPTED_STATUSES.has(String(review.status || '').toLowerCase())) {
    addIssue(issues, 'high', 'audience_interpretation_review_not_passed', '大众语义与礼俗风险审查未通过。', review.status || 'missing');
  }

  const highCount = issues.filter(issue => issue.severity === 'high').length;
  return {
    case_id: review.case_id || (shotScript && shotScript.case_id) || '',
    stage,
    status: highCount ? 'fail' : (issues.length ? 'pass_with_warnings' : 'pass'),
    issues
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const review = JSON.parse(fs.readFileSync(path.resolve(args.review), 'utf8'));
  const shotScript = args.shotScript ? JSON.parse(fs.readFileSync(path.resolve(args.shotScript), 'utf8')) : null;
  const report = validateAudienceInterpretationReview(review, shotScript, args.expectedStage);
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) {
    const out = path.resolve(args.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text, 'utf8');
  }
  console.log(text.trim());
  if (report.status === 'fail') process.exit(1);
}

if (require.main === module) main();

module.exports = {
  validateAudienceInterpretationReview,
  REQUIRED_PREGEN_METHODS,
  REQUIRED_POSTGEN_METHODS
};
