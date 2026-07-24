#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const VERDICTS = new Set(['keep', 'fix_in_post', 'edit', 're_roll', 'rewrite']);
const REWRITE_VARIABLES = new Set(['director_contract', 'audio', 'storyboard', 'creative_prompt', 'asset', 'runtime']);
const SELECTABLE_POSTREVIEW_STATUSES = new Set(['pass', 'pass_after_revision']);
const COMPLETED_POSTREVIEW_STATUSES = new Set(['pass', 'pass_after_revision', 'needs_revision', 'fail']);

function parseArgs(argv) {
  let review = '';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--review') review = argv[++i];
    else if (arg === '--help') {
      console.log('Usage: node assert_take_review.js --review <take_review.json>');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!review) throw new Error('Pass --review <take_review.json>.');
  return path.resolve(review);
}

function addIssue(issues, code, message) {
  issues.push({ severity: 'high', code, message });
}

function validateTakeReview(review) {
  const issues = [];
  const verdict = String(review.verdict || '').trim();
  const attemptBudget = Number(review.attempt_budget || 0);
  const currentAttempt = Number(review.current_attempt || 0);
  const evidence = Array.isArray(review.evidence) ? review.evidence.filter(item => String(item).trim()) : [];
  const repeated = review.repeated_failure_evidence || {};
  const repeatedSamples = Array.isArray(repeated.identical_sample_ids)
    ? [...new Set(repeated.identical_sample_ids.filter(item => String(item).trim()))]
    : [];
  const nextChange = review.next_generation_change || {};
  const variable = String(nextChange.variable || 'none').trim();
  const instruction = String(nextChange.instruction || '').trim();
  const audiencePostreview = review.audience_interpretation_postreview || null;
  const lockedAudio = review.locked_audio_assertion || null;

  if (!VERDICTS.has(verdict)) addIssue(issues, 'invalid_take_verdict', 'verdict 必须是 keep、fix_in_post、edit、re_roll 或 rewrite。');
  if (!Number.isInteger(attemptBudget) || attemptBudget < 1) addIssue(issues, 'invalid_attempt_budget', 'attempt_budget 必须是正整数。');
  if (!Number.isInteger(currentAttempt) || currentAttempt < 1) addIssue(issues, 'invalid_current_attempt', 'current_attempt 必须从 1 开始。');
  if (attemptBudget > 0 && currentAttempt > attemptBudget) addIssue(issues, 'attempt_budget_exceeded', 'current_attempt 已超过 attempt_budget。');
  if (attemptBudget > 0 && currentAttempt >= attemptBudget && (verdict === 're_roll' || verdict === 'rewrite')) {
    addIssue(issues, 'attempt_budget_exhausted', '当前已用完生成次数，不能继续 re_roll 或 rewrite；请报告限制或由项目负责人重新批准预算。');
  }
  if (!evidence.length) addIssue(issues, 'missing_take_evidence', '必须记录至少一条可观察证据。');

  if (!audiencePostreview || typeof audiencePostreview !== 'object') {
    addIssue(issues, 'missing_audience_postreview', '每个生成样片都必须完成独立大众语义复审后才能下结论。');
  } else {
    const postStatus = String(audiencePostreview.status || '').toLowerCase();
    const postBlockers = Array.isArray(audiencePostreview.unresolved_blockers)
      ? audiencePostreview.unresolved_blockers.filter(item => String(item).trim())
      : [];
    if (!String(audiencePostreview.sample_id || '').trim()) {
      addIssue(issues, 'missing_audience_postreview_sample', '成片后大众语义复审必须绑定具体 sample_id。');
    }
    if (!COMPLETED_POSTREVIEW_STATUSES.has(postStatus)) {
      addIssue(issues, 'audience_postreview_not_completed', '成片后大众语义复审尚未完成。');
    }
    if (['keep', 'fix_in_post', 'edit'].includes(verdict)) {
      if (!SELECTABLE_POSTREVIEW_STATUSES.has(postStatus) || postBlockers.length) {
        addIssue(issues, 'unsafe_sample_marked_selectable', '存在未通过的大众语义或礼俗风险时，样片不能被判为 keep、fix_in_post 或 edit。');
      }
    }
  }

  if (!lockedAudio || typeof lockedAudio !== 'object') {
    addIssue(issues, 'missing_locked_audio_assertion', '每个生成样片都必须明确记录锁定音轨比对结果，或标记为不适用。');
  } else {
    const audioRequired = lockedAudio.required === true;
    const audioStatus = String(lockedAudio.status || '').toLowerCase();
    const audioSampleId = String(lockedAudio.sample_id || '').trim();
    const postSampleId = audiencePostreview && typeof audiencePostreview === 'object'
      ? String(audiencePostreview.sample_id || '').trim()
      : '';
    if (audioRequired) {
      if (!audioSampleId) addIssue(issues, 'missing_locked_audio_sample', '锁定音轨比对必须绑定具体 sample_id。');
      if (!String(lockedAudio.report || '').trim()) addIssue(issues, 'missing_locked_audio_report', '锁定音轨比对必须指向自动生成的报告。');
      if (postSampleId && audioSampleId && postSampleId !== audioSampleId) {
        addIssue(issues, 'locked_audio_sample_mismatch', '锁定音轨比对与大众语义复审必须绑定同一个样片。');
      }
      if (['keep', 'fix_in_post', 'edit'].includes(verdict) && audioStatus !== 'pass') {
        addIssue(issues, 'audio_mismatch_sample_marked_selectable', '锁定完整音轨未通过自动比对时，样片不能被判为 keep、fix_in_post 或 edit。');
      }
    } else if (audioStatus !== 'not_applicable') {
      addIssue(issues, 'invalid_locked_audio_not_applicable_status', '没有锁定完整音轨时，locked_audio_assertion.status 必须是 not_applicable。');
    }
  }

  if (verdict === 're_roll') {
    if (variable !== 'sampling_seed') addIssue(issues, 'reroll_changed_specification', 're_roll 只能把 next_generation_change.variable 设为 sampling_seed。');
  } else if (verdict === 'rewrite') {
    if (!REWRITE_VARIABLES.has(variable)) addIssue(issues, 'rewrite_missing_single_owner', 'rewrite 必须选择一个且仅一个 owner-layer variable。');
    if (!instruction) addIssue(issues, 'rewrite_missing_instruction', 'rewrite 必须写明这一项变量如何修改。');
  } else if (variable !== 'none') {
    addIssue(issues, 'non_generation_verdict_has_change', 'keep、fix_in_post、edit 不应授权新的生成变量。');
  }

  if (repeatedSamples.length >= 2 && verdict !== 'rewrite') {
    addIssue(issues, 'systematic_failure_requires_rewrite', '同一问题出现在至少两个相同输入样本中，必须改判 rewrite。');
  }
  if (String(repeated.failure || '').trim() && repeatedSamples.length < 2) {
    addIssue(issues, 'insufficient_systematic_evidence', '系统性失败需要至少两个相同输入 sample id。');
  }

  return {
    case_id: review.case_id || '',
    status: issues.length ? 'fail' : 'pass',
    verdict,
    attempt_budget: attemptBudget,
    current_attempt: currentAttempt,
    issues
  };
}

function main() {
  const file = parseArgs(process.argv.slice(2));
  const review = JSON.parse(fs.readFileSync(file, 'utf8'));
  const report = validateTakeReview(review);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'fail') process.exit(1);
}

if (require.main === module) main();

module.exports = { validateTakeReview };
