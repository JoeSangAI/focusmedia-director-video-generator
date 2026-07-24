#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    root: process.cwd(), caseId: '', brief: '', brand: '', product: '',
    durationSeconds: 15, aspectRatio: '16:9', resolution: '480p', storyboardLayout: 'auto'
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--root') args.root = next();
    else if (arg === '--case-id') args.caseId = next();
    else if (arg === '--brief') args.brief = next();
    else if (arg === '--brand') args.brand = next();
    else if (arg === '--product') args.product = next();
    else if (arg === '--duration-seconds') args.durationSeconds = Number(next());
    else if (arg === '--aspect-ratio') args.aspectRatio = next();
    else if (arg === '--resolution') args.resolution = next();
    else if (arg === '--storyboard-layout') args.storyboardLayout = next();
    else if (arg === '--help') {
      console.log(`Usage:
  node init_creative_case.js --root <project-dir> --case-id <id> --brief <text> [--brand <brand>] [--product <product>] [--duration-seconds 15] [--aspect-ratio 16:9] [--resolution 480p] [--storyboard-layout auto|3x3|text]

Creates .focusmedia-creative/cases/<case-id>/ with the standard V0.2 artifact files.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.brief) throw new Error('Pass --brief <text>.');
  if (!Number.isFinite(args.durationSeconds) || args.durationSeconds <= 0) throw new Error('--duration-seconds must be positive.');
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

  writeJson(path.join(caseDir, 'message_contract.json'), {
    case_id: args.caseId,
    brand: args.brand,
    product: args.product,
    status: 'pending',
    locked_copy: [],
    voiceover_script: [],
    required_closing_copy: [],
    product_facts: [],
    required_assets: [],
    forbidden_content: [],
    client_boundaries: []
  });

  writeJson(path.join(caseDir, 'director_contract.json'), {
    case_id: args.caseId,
    status: 'pending_user_confirmation',
    memory_target: '',
    future_recall_situation: '',
    main_trigger: '',
    primary_carrier: '',
    mechanism_description: '',
    known_operation: null,
    outside_library_reason: '',
    product_causal_role: '',
    visual_verb: '',
    creative_tension: '',
    asset_leverage: [],
    category_specificity: [],
    duration_economy: '',
    claim_truth_boundaries: [],
    repeat_pattern: [],
    performance_logic: {
      trigger: '',
      objective: '',
      action_reaction_chain: [],
      handoff: ''
    },
    sound_role: '',
    audio_dependency: 'auto',
    edit_rhythm_profile: 'standard',
    shot_density_policy: {
      target_min: 0,
      target_max: 0,
      recommended_min: 0,
      recommended_max: 0,
      source: '',
      exception_reason: ''
    },
    brand_attribution: '',
    approved_treatment: '',
    rejected_routes: [],
    execution_freedom: [],
    pressure_test_risks: []
  });

  writeIfMissing(path.join(caseDir, 'story.md'), `# ${args.durationSeconds} 秒故事稿\n\n待生成。\n`);
  writeJson(path.join(caseDir, 'story_contract.json'), {
    case_id: args.caseId,
    brand: args.brand,
    product: args.product,
    required_copy: [],
    voiceover_script: [],
    required_closing_copy: [],
    required_assets: [],
    execution_mode: {
      audio_dependency: 'auto',
      edit_rhythm_profile: 'standard'
    },
    shot_density_policy: {
      target_min: 0,
      target_max: 0,
      recommended_min: 0,
      recommended_max: 0,
      source: '',
      exception_reason: ''
    },
    required_shots: 0,
    min_meaningful_shots: 0,
    max_shots: 0,
    character_bible: null,
    shot_cast_plan: [],
    text_generation_contract: {
      mode: 'pending_case_decision',
      allowed_generated_text: [],
      post_overlay_text: [],
      required_prompt_terms: [],
      forbidden_positive_cues: []
    },
    audience_interpretation_review: {
      required: true,
      status: 'pending',
      unresolved_blockers: [],
      review_context: []
    },
    segments: []
  });
  writeJson(path.join(caseDir, 'shot_script.json'), {
    case_id: args.caseId,
    schema_version: '0.3',
    fidelity_dimensions: ['identity_fidelity', 'motion_boldness', 'scene_density'],
    shots: []
  });
  writeJson(path.join(caseDir, 'storyboard_assertion_report.json'), {
    case_id: args.caseId,
    status: 'pending',
    issues: []
  });
  writeJson(path.join(caseDir, 'director_detail_plans.json'), {
    case_id: args.caseId,
    sound_plan: {},
    action_prop_plan: [],
    ending_contract: {},
    character_bible: null,
    relationship_map: [],
    shot_cast_plan: []
  });
  writeJson(path.join(caseDir, 'storyboard_manifest.json'), {
    case_id: args.caseId,
    aspect_ratio: args.aspectRatio,
    layout: args.storyboardLayout,
    asset_status: 'pending',
    platform_eligibility: 'pending',
    panels: []
  });
  writeJson(path.join(caseDir, 'storyboard_asset_bindings.json'), {
    case_id: args.caseId,
    controls: [],
    references: [],
    contains_people_or_faces: false,
    platform_eligibility: {},
    fallback_text_storyboard: []
  });
  writeIfMissing(path.join(caseDir, 'audio_prompt.md'), '# Audio Prompt\n\n待导演方向确认后生成。\n');
  writeJson(path.join(caseDir, 'audio_prompt_review.json'), {
    mode: 'development_owner_gate',
    status: 'pending',
    prompt_file: 'audio_prompt.md',
    approved_prompt_sha256: '',
    approved_by: '',
    approved_at: ''
  });
  writeJson(path.join(caseDir, 'audio_jobs.json'), []);
  writeJson(path.join(caseDir, 'audio_beat_map.json'), {
    status: 'pending_audio_selection',
    selected_audio: '',
    duration_seconds: 0,
    anchors: []
  });
  writeJson(path.join(caseDir, 'asset_manifest.json'), {
    case_id: args.caseId,
    platform: '',
    assets: []
  });
  writeIfMissing(path.join(caseDir, 'creative_prompt.md'), '# Creative Prompt\n\n待生成。\n');
  writeJson(path.join(caseDir, 'text_overlay_plan.json'), {
    generation_mode: 'pending_case_decision',
    generated_flower_text: [],
    post_overlay_text: [],
    safe_area_plan: [],
    status: 'pending'
  });
  writeJson(path.join(caseDir, 'audience_interpretation_review.json'), {
    case_id: args.caseId,
    stage: 'pre_generation',
    reviewer_role: 'storyboard_risk_reviewer',
    independent_from_storyboard_author: false,
    passes: {
      blind_reading: { status: 'pending', intent_was_hidden: true },
      contextual_comparison: { status: 'pending' }
    },
    review_context: [],
    review_method: [
      'freeze_frame_test',
      'no_brief_test',
      'mainstream_likely_reading_test',
      'sequence_implication_test',
      'combination_cue_test'
    ],
    coverage: {
      reviewed_shots: [],
      reviewed_adjacent_pairs: [],
      whole_film_reviewed: false
    },
    items: [],
    regulatory_candidates: [],
    unresolved_blockers: [],
    status: 'pending'
  });
  writeJson(path.join(caseDir, 'audience_interpretation_assertion_report.json'), {
    case_id: args.caseId,
    stage: 'pre_generation',
    status: 'pending',
    issues: []
  });
  writeJson(path.join(caseDir, 'audience_interpretation_postreview.json'), {
    case_id: args.caseId,
    sample_id: '',
    stage: 'post_generation',
    reviewer_role: 'storyboard_risk_reviewer',
    independent_from_storyboard_author: false,
    passes: {
      blind_reading: { status: 'pending', intent_was_hidden: true },
      contextual_comparison: { status: 'pending' }
    },
    review_context: [],
    review_method: [
      'normal_speed_test',
      'freeze_frame_test',
      'mainstream_likely_reading_test',
      'sequence_implication_test',
      'combination_cue_test'
    ],
    coverage: {
      whole_film_reviewed: false,
      normal_speed_reviewed: false,
      representative_freeze_frames_reviewed: false
    },
    items: [],
    regulatory_candidates: [],
    unresolved_blockers: [],
    status: 'pending'
  });
  writeJson(path.join(caseDir, 'audience_interpretation_postreview_assertion_report.json'), {
    case_id: args.caseId,
    sample_id: '',
    stage: 'post_generation',
    status: 'pending',
    issues: []
  });
  writeJson(path.join(caseDir, 'runtime_config.json'), {
    platform: '',
    model: '',
    generation_phase: 'exploration',
    duration_seconds: args.durationSeconds,
    aspect_ratio: args.aspectRatio,
    resolution: args.resolution,
    resolution_policy: {
      exploration: '480p',
      candidate: '720p',
      final: '720p_or_1080p_when_explicitly_required'
    },
    prompt_rewrite: false,
    prompt_text_must_not_include_runtime_config: true
  });
  writeJson(path.join(caseDir, 'take_review.json'), {
    case_id: args.caseId,
    attempt_budget: 3,
    current_attempt: 0,
    verdict: '',
    evidence: [],
    audience_interpretation_postreview: {
      sample_id: '',
      status: 'pending',
      unresolved_blockers: []
    },
    locked_audio_assertion: {
      required: false,
      sample_id: '',
      status: 'not_applicable',
      report: ''
    },
    repeated_failure_evidence: {
      failure: '',
      identical_sample_ids: []
    },
    next_generation_change: {
      variable: 'none',
      instruction: ''
    },
    status: 'pending'
  });

  console.log(caseDir);
}

if (require.main === module) {
  main();
}
