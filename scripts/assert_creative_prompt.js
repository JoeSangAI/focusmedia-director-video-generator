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
  '九宫格',
  '参考图',
  '参考图片',
  '当前已保存参数'
];

const DEFAULT_RUNTIME_TERMS = [
  '16:9',
  '720p',
  '720P',
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
  const args = { contract: '', prompt: '', outJson: '', outMd: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--contract') args.contract = next();
    else if (arg === '--prompt') args.prompt = next();
    else if (arg === '--out-json') args.outJson = next();
    else if (arg === '--out-md') args.outMd = next();
    else if (arg === '--help') {
      console.log(`Usage:
  node assert_creative_prompt.js --contract story_contract.json --prompt creative_prompt.md --out-json assertion_report.json [--out-md assertion_report.md]

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
  const boundary = Math.max(
    before.lastIndexOf('，'),
    before.lastIndexOf(','),
    before.lastIndexOf('。'),
    before.lastIndexOf('；'),
    before.lastIndexOf(';'),
    before.lastIndexOf('\n')
  );
  const clause = before.slice(boundary + 1);
  return /(不要|避免|不得|禁止|不能|不应|不准|无|不可|不要出现|不能出现|不出现|不得出现)/.test(clause);
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

function countShotMarkers(promptText) {
  const matches = [...String(promptText || '').matchAll(/镜头\s*\d+[：:：]?/g)];
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

function collectForbiddenTerms(contract, key, defaults) {
  const custom = Array.isArray(contract[key]) ? contract[key] : [];
  return [...new Set([...defaults, ...custom].filter(Boolean))];
}

function addIssue(issues, severity, code, message, upstreamOwner, sample = '') {
  issues.push({ severity, code, message, upstream_owner: upstreamOwner, sample });
}

function assertCreativePrompt(contract, promptText) {
  const issues = [];

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

  if (requiredVoiceoverScript.length > 0) {
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
  }

  const brand = contract.brand || '';
  if (brand && !containsNormalized(promptText, brand)) {
    addIssue(issues, 'high', 'missing_brand', `缺少品牌名：${brand}`, 'prompt_builder', brand);
  }

  const product = contract.product || '';
  if (product && !containsNormalized(promptText, product)) {
    addIssue(issues, 'medium', 'missing_product', `缺少产品名：${product}`, 'prompt_builder', product);
  }

  for (const asset of Array.isArray(contract.required_assets) ? contract.required_assets : []) {
    const terms = Array.isArray(asset.terms) && asset.terms.length ? asset.terms : [asset.name].filter(Boolean);
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
    : DEFAULT_STRUCTURE_TERMS;
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
  const report = assertCreativePrompt(contract, promptText);
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
