#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_PROCESS_TERMS = [
  '众小智',
  'Seedance',
  'AI视频',
  'AI 视频',
  'mp4',
  '下载链接',
  '视频预览',
  '生成完成',
  '接口',
  '不要生成九宫格',
  '不要生成分镜故事板',
  '不要生成参考图',
  '不要生成参考图片',
  '当前已保存参数'
];

const DEFAULT_RUNTIME_TERMS = [
  '16:9',
  '480p',
  '480P',
  '720p',
  '720P',
  '1080p',
  '1080P',
  'Prompt Rewrite',
  'prompt rewrite',
  'rewrite off',
  '重写关闭',
  '提示词重写',
  '15秒',
  '15 秒'
];

const DEFAULT_STRUCTURE_TERMS = [
  '全片目标',
  '主体定义',
  '声音计划',
  '文字计划',
  '镜头1',
  '必要约束'
];

function parseArgs(argv) {
  const args = { contract: '', prompt: '', assetManifest: '', outJson: '', outMd: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--contract') args.contract = next();
    else if (arg === '--prompt') args.prompt = next();
    else if (arg === '--asset-manifest') args.assetManifest = next();
    else if (arg === '--out-json') args.outJson = next();
    else if (arg === '--out-md') args.outMd = next();
    else if (arg === '--help') {
      console.log(`Usage:
  node assert_creative_prompt.js --contract story_contract.json --prompt creative_prompt.md [--asset-manifest asset_manifest.json] --out-json assertion_report.json [--out-md assertion_report.md]

Checks machine-verifiable Creative Prompt contract rules. It does not judge creative quality.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.contract) throw new Error('Pass --contract <story_contract.json>.');
  if (!args.prompt) throw new Error('Pass --prompt <creative_prompt.md>.');
  if (!args.outJson && !args.outMd) throw new Error('Pass --out-json and/or --out-md.');
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeChineseText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[，。、“”‘’；：！？,.!?;:"'（）()【】《》<>「」]/g, '')
    .toLowerCase();
}

function compact(value, n = 140) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function containsNormalized(haystack, needle) {
  const n = normalizeChineseText(needle);
  if (!n) return true;
  return normalizeChineseText(haystack).includes(n);
}

function isNegatedOccurrence(promptText, index) {
  const before = promptText.slice(Math.max(0, index - 28), index);
  if (/[不无]\s*$/.test(before)) return true;
  const boundary = Math.max(
    before.lastIndexOf('，'),
    before.lastIndexOf(','),
    before.lastIndexOf('。'),
    before.lastIndexOf('；'),
    before.lastIndexOf(';'),
    before.lastIndexOf('\n')
  );
  const clause = before.slice(boundary + 1);
  return /(不要|避免|不得|禁止|不能|不应|不准|无|不可|不新增|不增加|不添加|不另配|无需|不要出现|不能出现|不出现|不得出现)/.test(clause);
}

function hasNonNegatedTerm(promptText, term) {
  if (!term) return false;
  let start = 0;
  while (start < promptText.length) {
    const index = promptText.indexOf(term, start);
    if (index === -1) return false;
    if (!isNegatedOccurrence(promptText, index)) return true;
    start = index + term.length;
  }
  return false;
}

function finalShotText(promptText, requiredShots) {
  if (requiredShots > 0) {
    const pattern = new RegExp(`镜头\\s*${requiredShots}[：:：]?`);
    const match = pattern.exec(promptText);
    if (match) return promptText.slice(match.index);
    return '';
  }
  const matches = [...promptText.matchAll(/镜头\s*\d+[：:：]?/g)];
  if (!matches.length) return promptText.slice(Math.max(0, promptText.length - 500));
  return promptText.slice(matches[matches.length - 1].index);
}

function shotSectionText(promptText, shotNumber) {
  const markers = [...String(promptText || '').matchAll(/(?:^|\n)\s*镜头\s*(\d+)[：:：]?/g)];
  const index = markers.findIndex((match) => Number(match[1]) === Number(shotNumber));
  if (index === -1) return '';
  const start = markers[index].index;
  const end = index + 1 < markers.length ? markers[index + 1].index : promptText.length;
  return promptText.slice(start, end);
}

function countShotMarkers(promptText) {
  const matches = [...String(promptText || '').matchAll(/(?:^|\n)\s*镜头\s*\d+[：:：]?/g)];
  return matches.length;
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function extractVoiceoverScript(promptText) {
  const headingMatch = /(必读口播脚本|口播脚本|VO脚本|旁白脚本)\s*[：:]/.exec(promptText);
  if (!headingMatch) {
    return { exists: false, heading: '', index: -1, text: '' };
  }
  const start = headingMatch.index;
  const afterHeading = start + headingMatch[0].length;
  const rest = promptText.slice(afterHeading);
  const nextHeading = /\n\s*(主体定义|声音计划|文字计划|动作与道具逻辑|镜头\s*\d+|必要约束)\s*[：:]/.exec(rest);
  const end = nextHeading ? afterHeading + nextHeading.index : promptText.length;
  return {
    exists: true,
    heading: headingMatch[1],
    index: start,
    text: promptText.slice(afterHeading, end)
  };
}

function extractVoiceoverScriptLines(scriptText) {
  const rawLines = String(scriptText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const numberedLines = rawLines
    .map((line) => {
      const match = /^\s*(?:\d+[.、．)]|[-*])\s*(.+?)\s*$/.exec(line);
      return match ? match[1].trim() : '';
    })
    .filter(Boolean);
  if (numberedLines.length) return numberedLines;
  return rawLines.filter((line) => !/(必须|按顺序|不改字|不调换|逐句完整)/.test(line));
}

function extractTextPlan(promptText) {
  const headingMatch = /(?:^|\n)\s*文字计划\s*[：:]/.exec(promptText);
  if (!headingMatch) return '';
  const start = headingMatch.index + headingMatch[0].length;
  const rest = promptText.slice(start);
  const nextHeading = /\n\s*(核心动作|动作与道具逻辑|镜头\s*\d+|必要约束)\s*[：:]/.exec(rest);
  const end = nextHeading ? start + nextHeading.index : promptText.length;
  return promptText.slice(start, end);
}

function collectForbiddenTerms(contract, key, defaults) {
  const custom = Array.isArray(contract[key]) ? contract[key] : [];
  return [...new Set([...defaults, ...custom].filter(Boolean))];
}

function addIssue(issues, severity, code, message, upstreamOwner, sample = '') {
  issues.push({ severity, code, message, upstream_owner: upstreamOwner, sample });
}

function assertCreativePrompt(contract, promptText, assetManifest = null) {
  const issues = [];
  const audioControl = contract.audio_control_contract && typeof contract.audio_control_contract === 'object'
    ? contract.audio_control_contract
    : null;
  const assetDriven = contract.prompt_mode === 'asset_driven' || Boolean(audioControl && audioControl.complete_mix === true);
  const manifestAssets = assetManifest && Array.isArray(assetManifest.assets) ? assetManifest.assets : [];
  const hasProductAssetAuthority = manifestAssets.some((asset) => {
    const type = String(asset.type || '').toLowerCase();
    const slot = String(asset.slot || '').trim();
    const authority = Array.isArray(asset.authority) ? asset.authority.map((item) => String(item).toLowerCase()) : [];
    const productTypes = ['product', 'packshot', 'sku', 'package', 'product_family', 'product_image'];
    const productAuthorities = ['product', 'product_identity', 'packaging', 'package', 'sku', 'packshot'];
    const controlsProduct = productTypes.includes(type) || authority.some((item) => productAuthorities.includes(item));
    return asset.platform_eligible !== false && controlsProduct && slot && promptText.includes(slot);
  });

  const requiredCopy = [
    ...(Array.isArray(contract.required_copy) ? contract.required_copy : []),
    ...(Array.isArray(contract.required_vo) ? contract.required_vo : []),
    ...(Array.isArray(contract.voiceover_script) ? contract.voiceover_script : [])
  ];
  const requiredVoiceoverScript = uniqueNonEmpty([
    ...requiredCopy,
    ...(Array.isArray(contract.required_closing_copy) ? contract.required_closing_copy : [])
  ]);
  for (const copy of requiredCopy) {
    if (!containsNormalized(promptText, copy)) {
      addIssue(
        issues,
        'high',
        'missing_required_copy',
        `缺少必保留文案：${copy}`,
        'prompt_builder',
        copy
      );
    }
  }

  if (requiredVoiceoverScript.length > 0 && !assetDriven) {
    const voiceoverScript = extractVoiceoverScript(promptText);
    if (!voiceoverScript.exists) {
      addIssue(
        issues,
        'high',
        'missing_voiceover_script_section',
        '缺少置顶的必读口播脚本区块；广告语不能埋在声音计划或镜头描述里',
        'prompt_builder',
        '必读口播脚本'
      );
    } else {
      const soundPlanIndex = promptText.indexOf('声音计划');
      const firstShotMatch = /镜头\s*1/.exec(promptText);
      if ((soundPlanIndex >= 0 && voiceoverScript.index > soundPlanIndex) || (firstShotMatch && voiceoverScript.index > firstShotMatch.index)) {
        addIssue(
          issues,
          'high',
          'voiceover_script_buried',
          '必读口播脚本位置过低；必须放在声音计划和镜头序列之前',
          'prompt_builder',
          voiceoverScript.heading
        );
      }

      const scriptText = voiceoverScript.text;
      const normalizedScriptLines = extractVoiceoverScriptLines(scriptText).map((line) => normalizeChineseText(line));
      for (const copy of requiredVoiceoverScript) {
        if (!normalizedScriptLines.includes(normalizeChineseText(copy))) {
          addIssue(
            issues,
            'high',
            'required_copy_not_in_voiceover_script',
            `必读口播脚本未单独包含必读台词：${copy}`,
            'prompt_builder',
            copy
          );
        }
      }

      let previousIndex = -1;
      for (const copy of requiredVoiceoverScript) {
        const normalizedCopy = normalizeChineseText(copy);
        const index = normalizedScriptLines.indexOf(normalizedCopy);
        if (index >= 0 && index < previousIndex) {
          addIssue(
            issues,
            'high',
            'voiceover_script_order_error',
            `必读口播脚本顺序错误：${copy}`,
            'prompt_builder',
            copy
          );
          break;
        }
        if (index >= 0) previousIndex = index;
      }
    }
  } else if (requiredVoiceoverScript.length > 0) {
    const normalizedPrompt = normalizeChineseText(promptText);
    let previousIndex = -1;
    for (const copy of requiredVoiceoverScript) {
      const index = normalizedPrompt.indexOf(normalizeChineseText(copy), previousIndex + 1);
      if (index < 0) continue;
      if (index < previousIndex) {
        addIssue(issues, 'high', 'required_copy_order_error', `必读台词顺序错误：${copy}`, 'prompt_builder', copy);
        break;
      }
      previousIndex = index;
    }
  }

  const brand = contract.brand || '';
  if (brand && !containsNormalized(promptText, brand)) {
    addIssue(issues, 'high', 'missing_brand', `缺少品牌名：${brand}`, 'prompt_builder', brand);
  }

  const product = contract.product || '';
  if (product && !containsNormalized(promptText, product) && !hasProductAssetAuthority) {
    addIssue(issues, 'medium', 'missing_product', `缺少产品名：${product}`, 'prompt_builder', product);
  }

  for (const asset of Array.isArray(contract.required_assets) ? contract.required_assets : []) {
    const terms = Array.isArray(asset.prompt_terms)
      ? asset.prompt_terms
      : (asset.required_in_prompt === false
        ? []
        : (Array.isArray(asset.terms) && asset.terms.length ? asset.terms : [asset.name].filter(Boolean)));
    if (terms.length === 0) continue;
    const missingTerms = terms.filter((term) => !containsNormalized(promptText, term));
    if (missingTerms.length > 0) {
      addIssue(
        issues,
        'high',
        'missing_required_asset',
        `缺少不可丢失主资产：${asset.name || missingTerms.join('/')}`,
        'prompt_builder',
        missingTerms.join(', ')
      );
    }
  }

  const structureTerms = Array.isArray(contract.required_structure) && contract.required_structure.length
    ? contract.required_structure
    : (assetDriven ? [] : DEFAULT_STRUCTURE_TERMS);
  for (const term of structureTerms) {
    if (!promptText.includes(term)) {
      addIssue(issues, 'medium', 'missing_official_structure', `缺少 Prompt 结构项：${term}`, 'prompt_builder', term);
    }
  }

  for (const term of Array.isArray(contract.required_prompt_terms) ? contract.required_prompt_terms : []) {
    if (!containsNormalized(promptText, term)) {
      addIssue(
        issues,
        'medium',
        'missing_required_prompt_term',
        `缺少 Pipeline 级提示词颗粒度：${term}`,
        'prompt_builder',
        term
      );
    }
  }

  if (audioControl) {
    for (const term of Array.isArray(audioControl.required_prompt_terms) ? audioControl.required_prompt_terms : []) {
      if (!containsNormalized(promptText, term)) {
        addIssue(
          issues,
          'high',
          'missing_audio_control_term',
          `缺少完整音频控制项：${term}`,
          'audio_control_contract',
          term
        );
      }
    }
    for (const term of Array.isArray(audioControl.forbidden_prompt_terms) ? audioControl.forbidden_prompt_terms : []) {
      if (hasNonNegatedTerm(promptText, term)) {
        addIssue(
          issues,
          'high',
          'conflicting_audio_instruction',
          `完整混音已提供，但 Prompt 仍要求额外声音：${term}`,
          'audio_control_contract',
          term
        );
      }
    }
  }

  const characterBible = contract.character_bible && typeof contract.character_bible === 'object'
    ? contract.character_bible
    : null;
  if (characterBible && characterBible.control_mode !== 'asset_reference') {
    for (const term of Array.isArray(characterBible.required_prompt_terms) ? characterBible.required_prompt_terms : []) {
      if (!containsNormalized(promptText, term)) {
        addIssue(
          issues,
          'high',
          'missing_character_control_term',
          `缺少人物连续性控制项：${term}`,
          'character_bible',
          term
        );
      }
    }
    for (const role of Array.isArray(characterBible.roles) ? characterBible.roles : []) {
      const roleTerms = uniqueNonEmpty([
        role.role_id,
        ...(Array.isArray(role.required_prompt_terms) ? role.required_prompt_terms : [])
      ]);
      for (const term of roleTerms) {
        if (!containsNormalized(promptText, term)) {
          addIssue(
            issues,
            'high',
            'missing_character_role_term',
            `人物 ${role.role_id || role.role || '-'} 缺少稳定定义：${term}`,
            'character_bible',
            term
          );
        }
      }
    }
    for (const term of Array.isArray(characterBible.relationship_terms) ? characterBible.relationship_terms : []) {
      if (!containsNormalized(promptText, term)) {
        addIssue(
          issues,
          'high',
          'missing_relationship_term',
          `缺少明确人物关系：${term}`,
          'relationship_map',
          term
        );
      }
    }
  }

  for (const shotCast of contract.shot_cast_plan_in_prompt === false ? [] : (Array.isArray(contract.shot_cast_plan) ? contract.shot_cast_plan : [])) {
    const shotText = shotSectionText(promptText, shotCast.shot);
    for (const roleId of Array.isArray(shotCast.role_ids) ? shotCast.role_ids : []) {
      if (!containsNormalized(shotText, roleId)) {
        addIssue(
          issues,
          'high',
          'missing_shot_cast_role',
          `镜头${shotCast.shot}缺少指定人物：${roleId}`,
          'shot_cast_plan',
          roleId
        );
      }
    }
  }

  const textGeneration = contract.text_generation_contract && typeof contract.text_generation_contract === 'object'
    ? contract.text_generation_contract
    : null;
  if (textGeneration) {
    const textPlan = assetDriven ? promptText : extractTextPlan(promptText);
    for (const term of Array.isArray(textGeneration.required_prompt_terms) ? textGeneration.required_prompt_terms : []) {
      if (!containsNormalized(promptText, term)) {
        addIssue(
          issues,
          'high',
          'missing_text_layer_control_term',
          `缺少文字分层控制项：${term}`,
          'text_layer_split',
          term
        );
      }
    }
    for (const term of Array.isArray(textGeneration.allowed_generated_text) ? textGeneration.allowed_generated_text : []) {
      if (!containsNormalized(textPlan, term)) {
        addIssue(
          issues,
          'medium',
          'allowed_flower_text_not_declared',
          `允许生成的花字未在文字计划中明确：${term}`,
          'text_layer_split',
          term
        );
      }
    }
    for (const term of Array.isArray(textGeneration.post_overlay_text) ? textGeneration.post_overlay_text : []) {
      if (containsNormalized(textPlan, term)) {
        addIssue(
          issues,
          'high',
          'post_overlay_text_requested_in_generation',
          `后期字幕被错误放回生成阶段的文字计划：${term}`,
          'text_layer_split',
          term
        );
      }
    }
    for (const cue of Array.isArray(textGeneration.forbidden_positive_cues) ? textGeneration.forbidden_positive_cues : []) {
      if (hasNonNegatedTerm(promptText, cue)) {
        addIssue(
          issues,
          'high',
          'plain_subtitle_generation_cue',
          `生成提示词仍在正向要求纯文字字幕：${cue}`,
          'text_layer_split',
          cue
        );
      }
    }
  }

  const audienceReview = contract.audience_interpretation_review && typeof contract.audience_interpretation_review === 'object'
    ? contract.audience_interpretation_review
    : null;
  if (!audienceReview) {
    addIssue(
      issues,
      'high',
      'audience_interpretation_review_missing',
      '缺少生成前大众语义与礼俗风险审查门禁',
      'audience_interpretation_review',
      'missing review summary'
    );
  } else {
    if (audienceReview.required !== true) {
      addIssue(
        issues,
        'high',
        'audience_interpretation_review_disabled',
        '生成前大众语义与礼俗风险审查不能被设为可选',
        'audience_interpretation_review',
        String(audienceReview.required)
      );
    }
    const acceptedStatuses = new Set(['pass', 'pass_after_revision']);
    if (!acceptedStatuses.has(String(audienceReview.status || '').toLowerCase())) {
      addIssue(
        issues,
        'high',
        'audience_interpretation_review_not_passed',
        '大众语义审片尚未通过，不能进入生成',
        'audience_interpretation_review',
        audienceReview.status || 'missing status'
      );
    }
    const blockers = Array.isArray(audienceReview.unresolved_blockers) ? audienceReview.unresolved_blockers : [];
    if (blockers.length > 0) {
      addIssue(
        issues,
        'high',
        'audience_interpretation_blockers_unresolved',
        `大众语义审片仍有 ${blockers.length} 个未解决的 P0/P1 风险`,
        'audience_interpretation_review',
        blockers.join('; ')
      );
    }
  }

  const requiredShots = Number(contract.required_shots || 0);
  const shotMarkerCount = countShotMarkers(promptText);
  if (requiredShots > 0) {
    for (let i = 1; i <= requiredShots; i++) {
      const shotPattern = new RegExp(`镜头\\s*${i}`);
      if (!shotPattern.test(promptText)) {
        addIssue(issues, 'high', 'missing_shot_sequence', `缺少镜头${i}`, 'shot_script', `镜头${i}`);
      }
    }
  }

  const minShots = Number(contract.min_meaningful_shots || contract.min_shots || 0);
  if (minShots > 0 && shotMarkerCount < minShots) {
    addIssue(
      issues,
      'high',
      'insufficient_shot_count',
      `有效镜头密度过低：当前 ${shotMarkerCount} 个镜头标记，至少需要 ${minShots} 个有明确广告功能的镜头`,
      'shot_script',
      `current=${shotMarkerCount}, min=${minShots}`
    );
  }

  const maxShots = Number(contract.max_shots || 0);
  if (maxShots > 0 && shotMarkerCount > maxShots) {
    addIssue(
      issues,
      'medium',
      'excessive_shot_count',
      `镜头数量过多：当前 ${shotMarkerCount} 个，建议不超过 ${maxShots} 个`,
      'shot_script',
      `current=${shotMarkerCount}, max=${maxShots}`
    );
  }

  const closingText = finalShotText(promptText, requiredShots);
  for (const copy of Array.isArray(contract.required_closing_copy) ? contract.required_closing_copy : []) {
    if (!containsNormalized(closingText, copy)) {
      addIssue(
        issues,
        'high',
        'missing_closing_copy',
        `结尾镜头缺少品牌/广告语收口：${copy}`,
        'prompt_builder',
        copy
      );
    }
  }

  const processTerms = collectForbiddenTerms(contract, 'forbidden_process_terms', DEFAULT_PROCESS_TERMS);
  for (const term of processTerms) {
    if (promptText.includes(term)) {
      addIssue(issues, 'high', 'process_term_in_prompt', `Creative Prompt 混入流程/接口语言：${term}`, 'prompt_builder', term);
    }
  }

  const runtimeTerms = collectForbiddenTerms(contract, 'forbidden_runtime_terms', DEFAULT_RUNTIME_TERMS);
  for (const term of runtimeTerms) {
    if (promptText.includes(term)) {
      addIssue(issues, 'high', 'runtime_term_in_prompt', `Creative Prompt 混入运行参数：${term}`, 'generation_adapter', term);
    }
  }

  for (const term of Array.isArray(contract.forbidden_terms) ? contract.forbidden_terms : []) {
    if (hasNonNegatedTerm(promptText, term)) {
      addIssue(issues, 'high', 'forbidden_term_present', `出现明确禁区内容：${term}`, 'story_contract', term);
    }
  }

  if (assetManifest && Array.isArray(assetManifest.assets)) {
    for (const asset of assetManifest.assets) {
      const slot = String(asset.slot || '').trim();
      const eligible = asset.platform_eligible !== false;
      const fallbackMode = String(asset.fallback_mode || '').trim();
      if (asset.required === true && !eligible && !fallbackMode) {
        addIssue(
          issues,
          'high',
          'required_asset_not_platform_eligible',
          `必需素材不能被当前平台使用：${slot || asset.type || 'unnamed asset'}`,
          'generation_adapter',
          slot
        );
      }
      if (slot && eligible && asset.required_in_prompt !== false && !promptText.includes(slot)) {
        addIssue(
          issues,
          'high',
          'asset_slot_not_bound_in_prompt',
          `提示词未绑定可用素材槽位：${slot}`,
          'generation_assembler',
          slot
        );
      }
      if (slot && !eligible && promptText.includes(slot)) {
        addIssue(
          issues,
          'high',
          'ineligible_asset_referenced',
          `提示词引用了当前平台不可用的素材：${slot}`,
          'generation_assembler',
          slot
        );
      }
    }
  }

  const status = issues.some((issue) => issue.severity === 'high' || issue.severity === 'medium') ? 'fail' : 'pass';
  return {
    status,
    generated_at: new Date().toISOString(),
    case_id: contract.case_id || '',
    summary: {
      issue_count: issues.length,
      high: issues.filter((issue) => issue.severity === 'high').length,
      medium: issues.filter((issue) => issue.severity === 'medium').length,
      low: issues.filter((issue) => issue.severity === 'low').length
    },
    issues
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Prompt Contract Assertion');
  lines.push('');
  lines.push(`- Status: ${report.status}`);
  lines.push(`- Case: ${report.case_id || '-'}`);
  lines.push(`- Issues: ${report.summary.issue_count} (high ${report.summary.high}, medium ${report.summary.medium}, low ${report.summary.low})`);
  lines.push('');
  if (report.issues.length) {
    lines.push('## Issues');
    lines.push('');
    for (const issue of report.issues) {
      lines.push(`- \`${issue.code}\` [${issue.severity}] owner=\`${issue.upstream_owner}\`: ${issue.message}${issue.sample ? ` (${compact(issue.sample)})` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const contract = readJson(args.contract);
  const promptText = fs.readFileSync(args.prompt, 'utf8');
  const assetManifest = args.assetManifest ? readJson(args.assetManifest) : null;
  const report = assertCreativePrompt(contract, promptText, assetManifest);
  if (args.outJson) {
    fs.mkdirSync(path.dirname(path.resolve(args.outJson)), { recursive: true });
    fs.writeFileSync(args.outJson, JSON.stringify(report, null, 2), 'utf8');
  }
  if (args.outMd) {
    fs.mkdirSync(path.dirname(path.resolve(args.outMd)), { recursive: true });
    fs.writeFileSync(args.outMd, renderMarkdown(report), 'utf8');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  assertCreativePrompt,
  normalizeChineseText
};
