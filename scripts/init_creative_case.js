#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { root: process.cwd(), caseId: '', brief: '', brand: '', product: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--root') args.root = next();
    else if (arg === '--case-id') args.caseId = next();
    else if (arg === '--brief') args.brief = next();
    else if (arg === '--brand') args.brand = next();
    else if (arg === '--product') args.product = next();
    else if (arg === '--help') {
      console.log(`Usage:
  node init_creative_case.js --root <project-dir> --case-id <id> --brief <text> [--brand <brand>] [--product <product>]

Creates .focusmedia-creative/cases/<case-id>/ with the standard V0.1 artifact files.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.brief) throw new Error('Pass --brief <text>.');
  if (!args.caseId) args.caseId = slugify(`${args.brand || 'case'}-${Date.now()}`);
  args.caseId = slugify(args.caseId);
  args.root = path.resolve(args.root);
  return args;
}

function slugify(value) {
  return String(value || 'case')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'case';
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseDir = path.join(args.root, '.focusmedia-creative');
  const caseDir = path.join(baseDir, 'cases', args.caseId);
  fs.mkdirSync(caseDir, { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'learning'), { recursive: true });

  writeJson(path.join(caseDir, 'brief.json'), {
    case_id: args.caseId,
    status: 'draft',
    created_at: new Date().toISOString(),
    raw_brief: args.brief,
    brand: args.brand,
    product: args.product,
    hard_constraints: {
      required_copy: [],
      forbidden: [],
      must_show: []
    },
    assumptions: [],
    open_questions: []
  });

  writeIfMissing(path.join(caseDir, 'story.md'), '# 15 秒故事稿\n\n待生成。\n');
  writeJson(path.join(caseDir, 'story_contract.json'), {
    case_id: args.caseId,
    brand: args.brand,
    product: args.product,
    required_copy: [],
    voiceover_script: [],
    required_closing_copy: [],
    required_assets: [],
    required_shots: 0,
    segments: []
  });
  writeJson(path.join(caseDir, 'shot_script.json'), {
    case_id: args.caseId,
    shots: []
  });
  writeJson(path.join(caseDir, 'storyboard_manifest.json'), {
    case_id: args.caseId,
    aspect_ratio: '16:9',
    layout: '3x3',
    asset_status: 'text_only',
    panels: []
  });
  writeIfMissing(path.join(caseDir, 'creative_prompt.md'), '# Creative Prompt\n\n待生成。\n');
  writeJson(path.join(caseDir, 'runtime_config.json'), {
    platform: '',
    model: '',
    duration_seconds: 15,
    aspect_ratio: '16:9',
    resolution: '720p',
    prompt_rewrite: false,
    prompt_text_must_not_include_runtime_config: true
  });

  console.log(caseDir);
}

if (require.main === module) {
  main();
}
