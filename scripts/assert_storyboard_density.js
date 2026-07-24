#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateAudienceInterpretationReview } = require('./assert_audience_interpretation_review.js');

const FIDELITY_DIMENSIONS = ['identity_fidelity', 'motion_boldness', 'scene_density'];
const FRAGILITY_LEVELS = new Set(['low', 'medium', 'high']);

function parseArgs(argv) {
  const args = { contract: '', shotScript: '', beatMap: '', audienceReview: '', out: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--contract') args.contract = next();
    else if (arg === '--shot-script') args.shotScript = next();
    else if (arg === '--beat-map') args.beatMap = next();
    else if (arg === '--audience-review') args.audienceReview = next();
    else if (arg === '--out') args.out = next();
    else if (arg === '--help') {
      console.log('Usage: node assert_storyboard_density.js --contract <story_contract.json> --shot-script <shot_script.json> --audience-review <audience_interpretation_review.json> [--beat-map <audio_beat_map.json>] [--out <report.json>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.contract || !args.shotScript) throw new Error('Pass --contract and --shot-script.');
  return args;
}

function normalize(value) {
  return String(value || '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
}

function addIssue(issues, severity, code, message, details = '') {
  issues.push({ severity, code, message, details });
}

function validateStoryboard(contract, shotScript, beatMap = null, audienceReview = null) {
  const issues = [];
  const shots = Array.isArray(shotScript.shots) ? shotScript.shots : [];
  const policy = contract.shot_density_policy || {};
  const execution = contract.execution_mode || {};
  const min = Number(policy.target_min || contract.min_meaningful_shots || 0);
  const max = Number(policy.target_max || contract.max_shots || 0);
  const recommendedMin = Number(policy.recommended_min || 0);
  const recommendedMax = Number(policy.recommended_max || 0);
  const exceptionReason = String(policy.exception_reason || '').trim();

  if (min > 0 && shots.length < min && !exceptionReason) {
    addIssue(issues, 'high', 'insufficient_shot_count', `有效镜头 ${shots.length} 个，低于允许下限 ${min} 个。`, `profile=${execution.edit_rhythm_profile || 'unspecified'}`);
  }
  if (max > 0 && shots.length > max && !exceptionReason) {
    addIssue(issues, 'high', 'excessive_shot_count', `有效镜头 ${shots.length} 个，高于允许上限 ${max} 个。`, `profile=${execution.edit_rhythm_profile || 'unspecified'}`);
  }
  if (exceptionReason && ((min > 0 && shots.length < min) || (max > 0 && shots.length > max))) {
    addIssue(issues, 'medium', 'shot_count_exception', '镜头数超出常规范围，但已记录导演例外理由。', exceptionReason);
  }
  if (recommendedMin > 0 && recommendedMax > 0 && (shots.length < recommendedMin || shots.length > recommendedMax)) {
    addIssue(issues, 'low', 'outside_recommended_shot_range', `镜头数 ${shots.length} 不在建议范围 ${recommendedMin}-${recommendedMax} 内。`);
  }

  const requiredFields = ['shot_intention', 'information_delta', 'ad_function', 'audio_anchor', 'visible_action', 'product_role'];
  const seenInformationDeltas = new Map();
  shots.forEach((shot, index) => {
    const expected = index + 1;
    if (Number(shot.shot) !== expected) addIssue(issues, 'high', 'non_sequential_shot_number', `第 ${expected} 个镜头的 shot 编号不是 ${expected}。`);
    for (const field of requiredFields) {
      if (!String(shot[field] || '').trim()) addIssue(issues, 'high', 'missing_meaningful_shot_field', `镜头${expected}缺少 ${field}。`, field);
    }
    const informationDelta = normalize(shot.information_delta);
    if (informationDelta) {
      if (seenInformationDeltas.has(informationDelta)) {
        addIssue(
          issues,
          'high',
          'duplicate_information_delta',
          `镜头${expected}与镜头${seenInformationDeltas.get(informationDelta)}声明了相同的信息增量。`,
          shot.information_delta
        );
      } else {
        seenInformationDeltas.set(informationDelta, expected);
      }
    }
    const coherence = shot.coherence_check || {};
    if (coherence.supports_intention !== true) {
      addIssue(issues, 'high', 'shot_intention_not_supported', `镜头${expected}没有确认所有执行元素共同服务单镜意图。`);
    }
    if (!Array.isArray(coherence.conflicts)) {
      addIssue(issues, 'high', 'invalid_coherence_conflicts', `镜头${expected}的 coherence_check.conflicts 必须是数组。`);
    } else if (coherence.conflicts.length) {
      addIssue(issues, 'high', 'unresolved_shot_conflict', `镜头${expected}仍有未解决的意图冲突。`, coherence.conflicts.join('；'));
    }

    const primary = String(shot.primary_fidelity_spend || '').trim();
    const secondary = String(shot.secondary_spend || '').trim();
    const economized = Array.isArray(shot.economized) ? shot.economized : [];
    if (!FIDELITY_DIMENSIONS.includes(primary)) {
      addIssue(issues, 'high', 'invalid_primary_fidelity_spend', `镜头${expected}缺少有效的 primary_fidelity_spend。`, primary);
    }
    if (secondary !== 'none' && !FIDELITY_DIMENSIONS.includes(secondary)) {
      addIssue(issues, 'high', 'invalid_secondary_spend', `镜头${expected}的 secondary_spend 无效。`, secondary);
    }
    if (primary && secondary === primary) {
      addIssue(issues, 'high', 'duplicated_fidelity_spend', `镜头${expected}的主次资源不能是同一维度。`, primary);
    }
    if (!Array.isArray(shot.economized)) {
      addIssue(issues, 'high', 'invalid_economized_dimensions', `镜头${expected}的 economized 必须是数组。`);
    } else if (FIDELITY_DIMENSIONS.includes(primary) && (secondary === 'none' || FIDELITY_DIMENSIONS.includes(secondary))) {
      const selected = new Set([primary, ...(secondary === 'none' ? [] : [secondary])]);
      const expectedEconomized = FIDELITY_DIMENSIONS.filter(item => !selected.has(item)).sort();
      const actualEconomized = [...new Set(economized)].sort();
      if (economized.length !== actualEconomized.length || JSON.stringify(actualEconomized) !== JSON.stringify(expectedEconomized)) {
        addIssue(issues, 'high', 'incomplete_fidelity_budget', `镜头${expected}的资源预算没有完整覆盖三个维度。`, `expected economized=${expectedEconomized.join(',')}; actual=${actualEconomized.join(',')}`);
      }
    }

    const fragility = String(shot.fragility_risk || '').trim();
    if (!FRAGILITY_LEVELS.has(fragility)) {
      addIssue(issues, 'high', 'invalid_fragility_risk', `镜头${expected}缺少有效的 fragility_risk。`, fragility);
    }
    if (fragility === 'high' && !String(shot.split_or_simplify_plan || '').trim()) {
      addIssue(issues, 'high', 'missing_high_risk_mitigation', `镜头${expected}风险为 high，但没有拆镜或简化方案。`);
    }
    if (index < shots.length - 1 && !String(shot.transition || '').trim()) {
      addIssue(issues, 'medium', 'missing_shot_handoff', `镜头${expected}缺少到下一镜的交接。`);
    }
  });

  if (execution.audio_dependency === 'audio_first') {
    if (!beatMap || beatMap.status !== 'approved') {
      addIssue(issues, 'high', 'audio_beat_map_not_approved', 'audio_first 分镜缺少已批准的 audio_beat_map.json。');
    } else {
      const mapped = new Set(shots.flatMap(shot => Array.isArray(shot.audio_beat_ids) ? shot.audio_beat_ids : []));
      const requiredAnchors = (Array.isArray(beatMap.anchors) ? beatMap.anchors : []).filter(anchor => anchor.required !== false);
      for (const anchor of requiredAnchors) {
        if (!anchor.id || !mapped.has(anchor.id)) {
          addIssue(issues, 'high', 'missing_audio_beat_mapping', `必要音频重拍未映射到任何镜头：${anchor.id || '(missing id)'}`);
        }
      }
    }
  }

  if (shots.length) {
    const finalShot = shots[shots.length - 1];
    const finalText = normalize([finalShot.ad_function, finalShot.audio_anchor, finalShot.visible_action, finalShot.product_role, finalShot.screen_text].join(' '));
    const brand = normalize(contract.brand);
    if (brand && !finalText.includes(brand)) {
      addIssue(issues, 'high', 'missing_final_brand_attribution', `最后一镜没有明确回到品牌：${contract.brand}`);
    }
  }

  const riskReviewReport = validateAudienceInterpretationReview(audienceReview, shotScript, 'pre_generation');
  for (const issue of riskReviewReport.issues) {
    issues.push({
      ...issue,
      code: `risk_review_${issue.code}`
    });
  }

  const highCount = issues.filter(issue => issue.severity === 'high').length;
  return {
    case_id: contract.case_id || shotScript.case_id || '',
    status: highCount ? 'fail' : (issues.length ? 'pass_with_warnings' : 'pass'),
    shot_count: shots.length,
    policy: { min, max, recommended_min: recommendedMin, recommended_max: recommendedMax, exception_reason: exceptionReason },
    audio_dependency: execution.audio_dependency || 'unspecified',
    audience_interpretation_review: riskReviewReport.status,
    issues
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const contract = JSON.parse(fs.readFileSync(path.resolve(args.contract), 'utf8'));
  const shotScript = JSON.parse(fs.readFileSync(path.resolve(args.shotScript), 'utf8'));
  const beatMap = args.beatMap ? JSON.parse(fs.readFileSync(path.resolve(args.beatMap), 'utf8')) : null;
  const audienceReview = args.audienceReview ? JSON.parse(fs.readFileSync(path.resolve(args.audienceReview), 'utf8')) : null;
  const report = validateStoryboard(contract, shotScript, beatMap, audienceReview);
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

module.exports = { validateStoryboard, FIDELITY_DIMENSIONS };
