# Case Artifacts

Use this reference when creating or inspecting `.focusmedia-creative` case folders.

## Folder Shape

```text
.focusmedia-creative/
  cases/
    case-id/
      brief.json
      story.md
      story_contract.json
      shot_script.json
      director_detail_plans.json
      storyboard_manifest.json
      creative_prompt.md
      runtime_config.json
      assertion_report.json
      generation_result.json
      asr_vo_check.json
      review.json
      learning_slice.json
      lesson_candidate.json
  learning/
    lesson_candidates.jsonl
    recurring_bad_cases.jsonl
    digest.md
```

## Minimum Contract Fields

```json
{
  "case_id": "hujihua-gufaxiang",
  "brand": "胡姬花",
  "product": "古法小榨花生油",
  "required_copy": ["不是所有的香，都叫古法香。"],
  "voiceover_script": [
    "不是所有的香，都叫古法香。",
    "胡姬花，只做花生油。",
    "胡姬花。"
  ],
  "required_closing_copy": ["胡姬花。"],
  "required_assets": [
    { "name": "卖油郎", "terms": ["卖油郎"] }
  ],
  "required_shots": 8,
  "min_meaningful_shots": 8,
  "max_shots": 15,
  "sound_plan": {
    "music_bed": "continuous warm old-brand ad music bed",
    "sfx": ["oil whoosh", "stamp hit"],
    "ending": "music sting and tail through final brand frame"
  },
  "action_prop_plan": [
    {
      "shot": 1,
      "action": "seller presents shelled peanuts",
      "active_prop": "shelled red-skinned peanuts",
      "prop_function": "ingredient proof",
      "bridge": "leads into wood-press craft"
    }
  ],
  "ending_contract": {
    "visual_lockup": "product bottle + brand text",
    "voiceover": "胡姬花。",
    "audio": "short lift, brand sting, tail through final frame",
    "no_abrupt_audio_drop": true
  },
  "required_prompt_terms": ["音乐床", "音效", "道具", "最后一帧"],
  "forbidden_terms": ["二维码", "竞品"]
}
```

`voiceover_script` is the first-class truth source for required spoken copy. When it exists, the final Creative Prompt must include a top-level `必读口播脚本` block immediately after `全片目标`, with every line numbered in exact order.

`required_closing_copy` is separate because brand names often appear earlier but still disappear from the final closing shot.

For normal 15-second Focus Media TVCs, `min_meaningful_shots` should normally be at least 8. This checks rhythm density, but it does not replace the shot script's responsibility to give every shot a clear ad function.

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

## Learning Slice

Learning must combine feedback with context:

```text
brief
+ story
+ Story Contract
+ shot script
+ Creative Prompt
+ generation result
+ user feedback
+ change route
+ changed result
```

Record lesson candidates, not permanent rules. Upgrade only after Joe confirms or the pattern recurs.

`lesson_candidate.json` should separate raw case feedback from reusable learning:

```json
{
  "lesson": "Raw or near-raw candidate lesson.",
  "compressed_principle": "Transferable principle after removing case-only details.",
  "scope": "case_candidate | category_candidate | global_candidate",
  "prompt_policy": "compress_before_prompt_rules | do_not_auto_append_specific_negatives | prompt_rule_candidate"
}
```
