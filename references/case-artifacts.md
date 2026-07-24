# Case Artifacts

Use this reference when creating or inspecting `.focusmedia-creative` case folders.

## Contents

- Folder shape and ownership
- Minimum contract fields
- Independent storyboard and sample risk-review artifacts
- Director detail plans
- Runtime and generated-result gates
- Learning slice

## Folder Shape

```text
.focusmedia-creative/
  cases/
    case-id/
      brief.json
      message_contract.json
      director_contract.json
      story.md
      story_contract.json
      audio_prompt.md
      audio_prompt_review.json
      audio_jobs.json
      audio_beat_map.json
      shot_script.json
      storyboard_assertion_report.json
      director_detail_plans.json
      text_overlay_plan.json
      storyboard_manifest.json
      storyboard_asset_bindings.json
      asset_manifest.json
      creative_prompt.md
      runtime_config.json
      assets/audio/prepared/*.mp3
      assets/audio/prepared/*.json
      assertion_report.json
      generation_result.json
      locked_audio_assertion_report.json
      asr_vo_check.json
      character_continuity_check.json
      audience_interpretation_review.json
      audience_interpretation_assertion_report.json
      audience_interpretation_postreview.json
      audience_interpretation_postreview_assertion_report.json
      review.json
      take_review.json
      learning_slice.json
      lesson_candidate.json
  learning/
    lesson_candidates.jsonl
    recurring_bad_cases.jsonl
    digest.md
```

## V0.2 Ownership

- `brief.json` preserves `raw_brief`, canonical sources, client context, assumptions, and open questions.
- `message_contract.json` locks approved copy, product facts, closing copy, legal/client boundaries, and must-use assets.
- `director_contract.json` locks the selected carrier/event, product causality, repeat pattern, sound role, brand attribution, and pressure-test risks.
- Audio and storyboard agents write separate artifacts and cannot change message or director contracts.
- `audio_prompt_review.json` locks the exact development-mode prompt by content hash before quota is spent.
- `audio_beat_map.json` is the timing authority for `audio_first` storyboard execution after a human selects the track.
- `storyboard_assertion_report.json` validates beat coverage, meaningful-shot fields, case-specific shot density, and the passed independent risk review before assembly.
- `audience_interpretation_review.json` is owned by an independent Storyboard Risk Reviewer and blocks assembly until blind reading, contextual comparison, full shot/pair/whole-film coverage, and all P0/P1 repairs pass.
- `asset_manifest.json` assigns one authority and platform-eligibility decision to each upload asset.
- `creative_prompt.md` contains only residual output-effective text after asset authority is assigned.
- `runtime_config.json` owns model/platform/duration/aspect/resolution/rewrite and never leaks into Creative Prompt.
- `locked_audio_assertion_report.json` automatically compares the exact candidate file with the locked complete audio master.
- `take_review.json` records the five-way verdict, audio gate, evidence, attempt budget, and the single variable allowed to change before another generation.

Minimum `director_contract.json`:

```json
{
  "memory_target": "L3 | L4 | L5",
  "future_recall_situation": "...",
  "main_trigger": "...",
  "primary_carrier": "...",
  "mechanism_description": "open-language description of the selected mechanism",
  "known_operation": "optional library label or null",
  "outside_library_reason": "required when the mechanism is not represented by the current library",
  "product_causal_role": "...",
  "visual_verb": "...",
  "creative_tension": "...",
  "asset_leverage": ["..."],
  "category_specificity": ["..."],
  "duration_economy": "...",
  "claim_truth_boundaries": ["..."],
  "repeat_pattern": ["...", "...", "..."],
  "performance_logic": {
    "trigger": "...",
    "objective": "...",
    "action_reaction_chain": ["..."],
    "handoff": "..."
  },
  "sound_role": "...",
  "brand_attribution": "...",
  "approved_treatment": "...",
  "execution_freedom": ["..."],
  "pressure_test_risks": ["..."]
}
```

Minimum `asset_manifest.json`:

```json
{
  "platform": "...",
  "assets": [
    {
      "slot": "@Audio 1",
      "type": "complete_audio",
      "path": "assets/audio/prepared/master.mp3",
      "authority": ["lyrics", "rhythm", "pauses", "bgm", "sfx", "ending"],
      "prompt_role": "唯一成片声轨；画面按歌词、重拍和停顿推进",
      "required": true,
      "platform_eligible": true,
      "validated": true
    }
  ]
}
```

## Minimum Contract Fields

```json
{
  "case_id": "brand-campaign",
  "brand": "<locked brand>",
  "product": "<locked product>",
  "required_copy": ["<approved advertising copy>"],
  "voiceover_script": ["<exact spoken line 1>", "<exact spoken line 2>"],
  "required_closing_copy": ["<required closing>"],
  "required_assets": [
    {
      "name": "product_packshot",
      "prompt_terms": ["已上传主产品包装", "最终品牌收口"],
      "internal_terms": ["selected_product_reference"],
      "path": "assets/images/product.png",
      "usage": "package identity and final lockup"
    }
  ],
  "execution_mode": {
    "audio_dependency": "auto | audio_first | parallel_ok",
    "edit_rhythm_profile": "standard | rap_fast | jingle_fast | story_slow"
  },
  "shot_density_policy": {
    "target_min": 0,
    "target_max": 0,
    "recommended_min": 0,
    "recommended_max": 0,
    "source": "selected_audio_beat_map | runtime_and_mechanism | explicit_client_rule",
    "exception_reason": ""
  },
  "required_shots": 0,
  "min_meaningful_shots": 0,
  "max_shots": 0,
  "audio_control_contract": {
    "mode": "uploaded_complete_mix_drives_joint_generation",
    "source_of_truth": ["lyrics", "line_order", "language_boundaries", "rhythm", "pauses", "bgm", "sfx", "ending"],
    "line_modes": [],
    "complete_mix": true,
    "allow_additional_audio": false,
    "post_replace_audio": false,
    "required_prompt_terms": ["唯一完整声轨", "按音频重拍和停顿切换"]
  },
  "controlled_sampling": {
    "mode": "same_input_parallel",
    "variants": 3,
    "keep_identical": ["creative_prompt", "prepared_audio", "image_assets", "runtime_config"],
    "hard_gate_order": ["lyrics", "language_boundaries", "spoken_ending", "audio_continuity", "visual_quality"]
  },
  "character_bible": null,
  "shot_cast_plan": [],
  "text_generation_contract": {
    "mode": "pending_case_decision",
    "allowed_generated_text": [],
    "post_overlay_text": [],
    "required_prompt_terms": [],
    "forbidden_positive_cues": []
  },
  "audience_interpretation_review": {
    "required": true,
    "status": "pending",
    "unresolved_blockers": [],
    "review_context": []
  },
  "action_prop_plan": [],
  "ending_contract": {
    "visual_lockup": "product or brand-owned closing asset",
    "voiceover": "<required closing copy>",
    "audio": "selected ending behavior",
    "no_abrupt_audio_drop": true
  },
  "required_prompt_terms": [],
  "forbidden_terms": []
}
```

`voiceover_script` is the first-class truth source for required spoken copy. Without a complete-audio authority, place it once in a top-level numbered `必读口播脚本`. With an uploaded complete mix, keep the exact line order once in the audio/lyric anchors and do not duplicate the same copy across several prompt sections.

`required_closing_copy` is separate because brand names often appear earlier but still disappear from the final closing shot.

Set `required_shots`, `min_meaningful_shots`, and `max_shots` only when the selected audio, mechanism, or delivery format creates a real requirement. Do not use a universal shot quota as a quality proxy.

For an approximately 15-second `rap_fast` or `jingle_fast` film, use 9-11 meaningful shots as the evidence-backed target and 8-12 as the normal allowed range. This is a form-specific prior from the current Focus Media corpus, not a rule for short 5-7 second films or deliberately sustained emotional films. Record an exception reason outside the normal range.

`audio_prompt_review.json` minimum:

```json
{
  "mode": "development_owner_gate",
  "status": "pending | approved | waived",
  "prompt_file": "audio_prompt.md",
  "approved_prompt_sha256": "",
  "approved_by": "",
  "approved_at": ""
}
```

`audio_beat_map.json` minimum:

```json
{
  "status": "pending_audio_selection | approved",
  "selected_audio": "",
  "duration_seconds": 0,
  "anchors": [
    {"id": "beat_01", "time": "0.00-1.00", "audio": "...", "visual_function": "...", "required": true}
  ]
}
```

`shot_script.json` minimum per shot:

```json
{
  "shot": 1,
  "shot_intention": "ordinary-viewer perceptual job",
  "information_delta": "the distinct new message, proof, causality, emotion, contrast, escalation, or attribution added by this shot",
  "coherence_check": {
    "supports_intention": true,
    "conflicts": []
  },
  "ad_function": "...",
  "audio_anchor": "...",
  "visible_action": "...",
  "product_role": "...",
  "primary_fidelity_spend": "identity_fidelity | motion_boldness | scene_density",
  "secondary_spend": "none | identity_fidelity | motion_boldness | scene_density",
  "economized": ["unselected fidelity dimensions"],
  "fragility_risk": "low | medium | high",
  "split_or_simplify_plan": "required when fragility_risk is high"
}
```

The fidelity dimensions form a complete budget: `primary_fidelity_spend`, optional `secondary_spend`, and `economized` must cover the three dimensions exactly once.

`required_assets` separates prompt-facing control terms from process-facing asset metadata:

- `prompt_terms` are the only asset terms that Prompt Assertion requires in the final Creative Prompt. They must describe what the generated video should show or follow, such as `产品瓶`, `最后产品全家福`, `已上传广告歌音频`, or `完整成片音频`.
- `internal_terms`, `path`, local filenames, upload order, version labels, and chosen-option labels are for runtime handoff, learning, and traceability. They must not be copied into Creative Prompt.
- `terms` is still accepted as a legacy fallback, but new cases should prefer `prompt_terms`.
- Set `required_in_prompt: false` only for an asset that is required by the adapter or archive but should not be directly referenced in the prompt.

`forbidden_terms` describes output禁区, not words that can never appear in the prompt. The assertion script allows these terms inside clear negative constraints such as “不要二维码” or “不要竞品包装或竞品标识”, and fails when they are written as positive visual content.

## Director Detail Plans

`director_detail_plans.json` or matching fields inside `story_contract.json` should capture expert-level granularity before Prompt Builder:

```json
{
  "sound_plan": {
    "music_bed": "continuous music bed, style, energy curve",
    "voiceover": "accent, pacing, emphasis, breath",
    "sfx_by_shot": [
      { "shot": 3, "sfx": "oil whoosh" },
      { "shot": 6, "sfx": "stamp hit" }
    ],
    "ending_audio": "music lift, brand sting, tail through final frame"
  },
  "action_prop_plan": [
    {
      "shot": 4,
      "actor": "seller",
      "action": "pours shelled peanuts into press trough",
      "active_prop": "shelled red-skinned peanuts",
      "prop_function": "ingredient proof",
      "bridge": "raw material leads into craft proof"
    }
  ],
  "ending_contract": {
    "visual_lockup": "product bottle + brand text",
    "voiceover": "final brand name",
    "screen_text": "brand text",
    "audio": "sting or sustain",
    "no_abrupt_audio_drop": true
  }
}
```

These fields are not user-facing form fields. The creative director agent fills them from story, category knowledge, case references, and expert-pattern learning.

Use `required_prompt_terms` sparingly as a compact gate when these plans must appear in the final Creative Prompt. It should check capability presence, not stuff case-specific negative prompts into the final prompt.

Do not put source labels like `版本一B`, `方案二`, file names, model/UI names, or local paths into `required_prompt_terms`. If a selected audio or image needs to drive generation, express the output-facing behavior instead: `已上传广告歌音频`, `按完整成片音频卡点`, `产品包装只在最后产品全家福出现`.

`audio_asset_preparation` is runtime traceability for the uploaded audio asset. It belongs in case metadata or runtime config, not in the final Creative Prompt. The final prompt should contain only output-facing control such as following the uploaded complete ad-song audio for lyrics, rhythm, mouth movement, action beats, and ending.

`audio_control_contract` distinguishes a complete mixed soundtrack from a loose reference. Its `required_prompt_terms` are output-facing controls checked by Prompt Assertion. Keep `post_replace_audio`, sampling counts, filenames, and runtime mechanics outside the Creative Prompt.

`controlled_sampling` records a batch of identical-input generations. Each output should keep its own sample id and hard-gate result. Change no prompt, audio, image, or runtime variable inside one batch.

`character_bible` is the prompt-facing source of truth for recurring people. `cast_count`, role ids, direct relationships, visible identity anchors, unique wardrobe anchors, and stable positions must be decided before the shot script. `future_character_assets` is an interface only; populate and upload it when the video generation path reliably supports per-character references.

`shot_cast_plan` binds exact role ids to shots. Prompt Assertion should fail when a required role id is missing from its shot or a Character Bible term is absent from `主体定义`.

`audience_interpretation_review` is a mandatory generation gate. Prompt Assertion must fail when the summary is missing, disabled, not `pass | pass_after_revision`, or has unresolved blockers. The detailed review lives in `audience_interpretation_review.json`; the Story Contract stores only its gate result.

The detailed pre-generation review must be written by `storyboard_risk_reviewer`, independently from the Storyboard Agent:

```json
{
  "case_id": "brand-campaign",
  "stage": "pre_generation",
  "reviewer_role": "storyboard_risk_reviewer",
  "independent_from_storyboard_author": true,
  "passes": {
    "blind_reading": {"status": "complete", "intent_was_hidden": true},
    "contextual_comparison": {"status": "complete"}
  },
  "review_method": [
    "freeze_frame_test",
    "no_brief_test",
    "mainstream_likely_reading_test",
    "sequence_implication_test",
    "combination_cue_test"
  ],
  "coverage": {
    "reviewed_shots": [1, 2],
    "reviewed_adjacent_pairs": ["1-2"],
    "whole_film_reviewed": true
  },
  "items": [],
  "regulatory_candidates": [],
  "unresolved_blockers": [],
  "status": "pass"
}
```

Every P0/P1 item must identify `shot_scope`, `likely_reading`, `risk_category`, `cue_combination`, `upstream_owner`, `repair`, and resolution `status`. Review cue combinations across shots; do not clear a film because each individual cue is ordinary.

`text_generation_contract` separates visual lettering from deterministic copy. `allowed_generated_text` is the complete whitelist for text the video model may render. `post_overlay_text` remains in `text_overlay_plan.json` and must not be requested in the generation prompt's text or shot instructions. `required_prompt_terms` and `forbidden_positive_cues` are enforced by Prompt Assertion.

`runtime_config.json` carries a phase-derived resolution policy:

```json
{
  "generation_phase": "exploration",
  "resolution": "480p",
  "resolution_policy": {
    "exploration": "480p",
    "candidate": "720p",
    "final": "720p_or_1080p_when_explicitly_required"
  }
}
```

Resolution never belongs in the Creative Prompt. Controlled-sampling batches stay at `480p` until the specification is stable.

## Generated-result Hard Gate

After generation, keep a hard-gate artifact when audio or text is checked:

```json
{
  "asr_engine": "local whisper small",
  "required_voiceover": ["好的花生油，就认古法香。"],
  "asr_text": "...",
  "missing_voiceover": ["好的花生油，就认古法香。"],
  "classification": {
    "prompt_omission": false,
    "model_noncompliance": true,
    "pipeline_gap": "Missing generated-video ASR VO completeness gate."
  },
  "severity": "p0"
}
```

Prompt Assertion checks whether the prompt is complete before generation. `asr_vo_check.json` checks whether the generated video actually read the required copy. Missing any required VO line is P0. When `ending_contract.no_abrupt_audio_drop` is true, generated-result review should also check whether the final brand frame loses music or sonic support.

When `audio_control_contract.complete_mix` is true, run `assert_locked_audio.py` against the exact raw candidate. A mismatch is a hard failure: do not show or select the raw candidate as a deliverable. If the valid repair is a deterministic audio remux, run the same assertion again on the remuxed file; only the passing remux may proceed to selection.

For recurring people, write `character_continuity_check.json`:

```json
{
  "expected_cast_count": 5,
  "observed_identity_critical_people": 6,
  "duplicate_roles": ["grandfather-like role appears twice"],
  "role_swaps": ["人物A appears paired as 人物C spouse in framed photograph"],
  "shot_membership_errors": ["shot 2 contains an unassigned second elderly man"],
  "continuity_pass": false,
  "severity": "p0"
}
```

Check live-action shots and in-world photos/portraits. A framed family photograph is part of the relationship story and must obey the same Character Bible.

After generation, write one sample-bound `audience_interpretation_postreview.json` from normal-speed playback and representative frames. Do not inherit the pre-generation pass automatically. Record `sample_id`, independent reviewer identity, completed blind/contextual passes, and `coverage.normal_speed_reviewed`, `coverage.representative_freeze_frames_reviewed`, and `coverage.whole_film_reviewed`. The generated sample fails when a mainstream viewer could plausibly infer a wrong intimate/family relationship, disrespectful behavior, humiliating treatment, memorial/funeral implication, unsafe imitation, or another high-impact social meaning that contradicts the intended ad.

Write `take_review.json` before spending quota on another attempt:

```json
{
  "case_id": "brand-campaign",
  "attempt_budget": 3,
  "current_attempt": 1,
  "verdict": "keep | fix_in_post | edit | re_roll | rewrite",
  "evidence": ["observable result"],
  "audience_interpretation_postreview": {
    "sample_id": "sample_01",
    "status": "pass | pass_after_revision | needs_revision | fail",
    "unresolved_blockers": []
  },
  "locked_audio_assertion": {
    "required": true,
    "sample_id": "sample_01",
    "status": "pass | fail",
    "report": "locked_audio_assertion_report.json"
  },
  "repeated_failure_evidence": {
    "failure": "",
    "identical_sample_ids": []
  },
  "next_generation_change": {
    "variable": "none | sampling_seed | director_contract | audio | storyboard | creative_prompt | asset | runtime",
    "instruction": ""
  },
  "status": "pending | decided | attempt_budget_exhausted"
}
```

Every take verdict requires a completed, sample-bound audience-interpretation post-review and an explicit locked-audio assertion or `not_applicable`. When locked audio is required, `keep`, `fix_in_post`, and `edit` require a passing audio report for the exact candidate file. `keep`, `fix_in_post`, and `edit` also require audience status `pass | pass_after_revision` with no unresolved blocker. `re_roll` requires `sampling_seed`; `rewrite` requires exactly one owner-layer variable. `keep`, `fix_in_post`, and `edit` do not authorize another generation. When the same failure is recorded across at least two identical-input samples, the verdict must be `rewrite`.

## Learning Slice

Learning must combine feedback with context:

```text
brief
+ story
+ Story Contract
+ shot script
+ Creative Prompt
+ generation result
+ take review
+ user feedback
+ change route
+ changed result
```

Record lesson candidates, not permanent rules. Upgrade only after project-owner confirmation or repeated cross-category evidence.

`lesson_candidate.json` should separate raw case feedback from reusable learning:

```json
{
  "lesson": "Raw or near-raw candidate lesson.",
  "compressed_principle": "Transferable principle after removing case-only details.",
  "scope": "case_candidate | category_candidate | global_candidate",
  "prompt_policy": "compress_before_prompt_rules | do_not_auto_append_specific_negatives | prompt_rule_candidate"
}
```
