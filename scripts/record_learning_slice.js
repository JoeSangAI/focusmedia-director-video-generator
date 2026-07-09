#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ARTIFACTS = [
  ['brief', 'brief.json', false],
  ['story', 'story.md', false],
  ['story_contract', 'story_contract.json', true],
  ['shot_script', 'shot_script.json', true],
  ['storyboard_manifest', 'storyboard_manifest.json', false],
  ['creative_prompt', 'creative_prompt.md', true],
  ['assertion_report', 'assertion_report.json', true],
  ['generation_result', 'generation_result.json', true],
  ['asr_vo_check', 'asr_vo_check.json', true],
  ['review', 'review.json', true]
];

const VALID_SCOPES = new Set(['case_candidate', 'category_candidate', 'global_candidate']);
const VALID_PROMPT_POLICIES = new Set([
  'compress_before_prompt_rules',
  'do_not_auto_append_specific_negatives',
  'prompt_rule_candidate'
]);

function parseArgs(argv) {
  const args = {
    caseDir: '',
    feedback: '',
    route: '',
    change: '',
    lesson: '',
    principle: '',
    variant: '',
    scope: 'case_candidate',
    promptPolicy: 'compress_before_prompt_rules'
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--case-dir') args.caseDir = next();
    else if (arg === '--feedback') args.feedback = next();
    else if (arg === '--route') args.route = next();
    else if (arg === '--change') args.change = next();
    else if (arg === '--lesson') args.lesson = next();
    else if (arg === '--principle') args.principle = next();
    else if (arg === '--variant') args.variant = next();
    else if (arg === '--scope') args.scope = next();
    else if (arg === '--prompt-policy') args.promptPolicy = next();
    else if (arg === '--help') {
      console.log(`Usage:
  node record_learning_slice.js --case-dir <case-dir> --feedback <text> --route <route> --change <text> [--variant v2|v3] [--lesson <candidate>] [--principle <compressed>] [--scope <case_candidate|category_candidate|global_candidate>] [--prompt-policy <policy>]

Records a user-feedback learning slice and appends lesson candidates to .focusmedia-creative/learning.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.caseDir) throw new Error('Pass --case-dir <dir>.');
  if (!args.feedback) throw new Error('Pass --feedback <text>.');
  if (!args.route) throw new Error('Pass --route <route>.');
  if (!VALID_SCOPES.has(args.scope)) {
    throw new Error(`Invalid --scope: ${args.scope}. Use one of: ${Array.from(VALID_SCOPES).join(', ')}`);
  }
  if (!VALID_PROMPT_POLICIES.has(args.promptPolicy)) {
    throw new Error(`Invalid --prompt-policy: ${args.promptPolicy}. Use one of: ${Array.from(VALID_PROMPT_POLICIES).join(', ')}`);
  }
  args.caseDir = path.resolve(args.caseDir);
  return args;
}

function readMaybe(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function versionedFileName(file, variant) {
  if (!variant) return file;
  const cleanVariant = String(variant).replace(/^_+/, '');
  const parsed = path.parse(file);
  return `${parsed.name}_${cleanVariant}${parsed.ext}`;
}

function readArtifact(caseDir, file, versionable, variant) {
  if (versionable && variant) {
    const versionedFile = path.join(caseDir, versionedFileName(file, variant));
    if (fs.existsSync(versionedFile)) return readMaybe(versionedFile);
  }
  return readMaybe(path.join(caseDir, file));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function findBaseDir(caseDir) {
  let current = path.resolve(caseDir);
  while (current !== path.dirname(current)) {
    if (path.basename(current) === '.focusmedia-creative') return current;
    current = path.dirname(current);
  }
  const parent = path.dirname(path.dirname(caseDir));
  return path.basename(parent) === '.focusmedia-creative' ? parent : path.join(path.dirname(caseDir), '..');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.caseDir)) throw new Error(`Case dir does not exist: ${args.caseDir}`);
  const caseId = path.basename(args.caseDir);
  const artifacts = {};
  for (const [key, file, versionable] of ARTIFACTS) {
    artifacts[key] = readArtifact(args.caseDir, file, versionable, args.variant);
  }

  const learningSlice = {
    case_id: caseId,
    created_at: new Date().toISOString(),
    artifact_variant: args.variant || '',
    feedback: args.feedback,
    route: args.route,
    change: args.change,
    compressed_principle: args.principle,
    scope: args.scope,
    prompt_policy: args.promptPolicy,
    artifacts
  };
  writeJson(path.join(args.caseDir, 'learning_slice.json'), learningSlice);

  const lessonCandidate = {
    case_id: caseId,
    created_at: learningSlice.created_at,
    source: 'user_feedback_context_slice',
    artifact_variant: args.variant || '',
    route: args.route,
    feedback: args.feedback,
    change: args.change,
    lesson: args.lesson || '',
    compressed_principle: args.principle,
    scope: args.scope,
    prompt_policy: args.promptPolicy,
    status: 'candidate'
  };
  writeJson(path.join(args.caseDir, 'lesson_candidate.json'), lessonCandidate);

  const baseDir = findBaseDir(args.caseDir);
  const learningDir = path.join(baseDir, 'learning');
  fs.mkdirSync(learningDir, { recursive: true });
  fs.appendFileSync(path.join(learningDir, 'lesson_candidates.jsonl'), `${JSON.stringify(lessonCandidate)}\n`, 'utf8');
  console.log(path.join(args.caseDir, 'learning_slice.json'));
}

if (require.main === module) {
  main();
}
