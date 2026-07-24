# Agent Handoffs V0.2

Use these contracts after the user accepts the Director Contract. The lead director remains the owner of message, mechanism, and final judgment.

## Contents

- Shared boundaries
- Audio Prompt Agent
- Storyboard Agent
- Storyboard Risk Reviewer
- Generation Assembler
- Lead Director Review

## Shared Rule

Execution agents may clarify execution details but may not:

- rewrite locked copy;
- replace the selected creative mechanism;
- introduce a new product claim;
- change required product/Logo/character assets;
- hide uncertainty by adding long negative prompts.

The Storyboard Risk Reviewer must be independent from the Storyboard Agent. The reviewer identifies risks and repair routes but does not silently rewrite the storyboard or certify the creator's own intent.

Classify `audio_dependency` before delegation. Use `audio_first` when final cuts depend on generated Rap/Jingle/dance audio. Run Audio Prompt and Storyboard tasks in parallel only when both agents have stable, independent inputs.

## Audio Prompt Agent

### Input

- locked `voiceover_script` and closing copy;
- Director Contract and desired audio role;
- language/dialect and sung/spoken boundaries;
- exact duration setting, normally written as `15秒`;
- proven case-specific risks;
- selected provider/model path.
- prompt-review mode and project-owner gate status.

### Job

- Write a compact, chronological prompt for one complete advertising audio track.
- In development mode, expose the exact prompt and record its approved SHA-256 before generation; a changed hash invalidates approval.
- Put duration first, then overall musical character, performance/language sequence, only material rhythm corrections, and exact copy.
- Generate at least three identical-input samples per batch when quality is probabilistic.
- Preserve one acceptable prompt and use sampling/selection before rewriting it.

### Output

- `audio_prompt.md`;
- `audio_jobs.json` with at least three identical prompt jobs;
- generated audio files and sidecar metadata;
- human selection record: selected/rejected and why;
- `audio_prompt_review.json` and `audio_beat_map.json` after selection;
- prepared upload audio and actual-duration metadata.

### Boundaries

- Do not add BPM, bar counts, note-by-note timing, or stacked micro-rules unless a controlled test proved benefit.
- Do not use guide vocals merely to control melody/rhythm when current tests show the reference is ignored or dominates.
- Do not split vocals, BGM, or closing VO into components for later mixing. Generate the complete track through one prompt; treat unreachable precision as the current model ceiling.
- Do not infer success from the prompt. Human listening decides.

## Storyboard Agent

### Input

- approved Director Contract;
- locked copy and selected audio structure when available;
- for `audio_first`, selected audio plus approved `audio_beat_map.json` is required before final storyboard execution;
- edit-rhythm profile and case-specific shot-density policy;
- product/Logo/KV references;
- character and relationship contract when people recur;
- platform/reference-image constraints;
- output format requested by the user.

### Job

- Translate the selected mechanism into shot functions, actions, compositions, product roles, and brand closing.
- Give every shot one `shot_intention`; verify that camera, action, performance, sound anchor, product role, and transition serve it without conflict.
- Allocate one primary fidelity spend, at most one secondary spend, and economize the remaining dimension. Split or simplify high-risk shots before generation.
- Map every required beat to at least one shot using `audio_beat_ids`.
- For an approximately 15-second `rap_fast` or `jingle_fast` film, target 9-11 meaningful shots and normally stay within 8-12 unless a runtime/mechanism exception is recorded.
- Give every recurring person a trigger, momentary objective, action, reaction, and handoff; do not direct generic smiles or poses.
- Preserve the carrier/event across multiple panels; do not create nine unrelated attractive frames.
- Use audio lines, beats, or pauses as shot anchors when selected audio exists.
- Create a 3x3 visual board only when useful for user alignment or generation reference.

### Output

- `shot_script.json`;
- `storyboard_manifest.json`;
- board-generation prompt;
- generated 3x3 board when requested/available;
- `storyboard_asset_bindings.json` describing what the board controls and whether it is eligible for upload.

### Boundaries

- Do not select a new creative mechanism.
- Do not write the final video-generation prompt.
- Do not promise exact face/package/text fidelity without assets and platform support.
- Do not decide universally that a board must or must not be uploaded; record platform eligibility for the assembler.

## Storyboard Risk Reviewer

### Input

Run two passes with different packets:

1. Blind packet: `shot_script.json`, storyboard panels when available, market/region, and intended audience. Hide the approved treatment, intended interpretation, and proposed repair.
2. Context packet: Character Bible, Relationship Map, approved message, product role, client boundaries, and materially relevant regional/category context.

For post-generation review, replace the storyboard-only evidence with the exact sample, normal-speed playback, and representative freeze frames.

### Job

- Describe the likely mainstream reading before comparing it with intent.
- Review every shot, every adjacent pair, and the whole-film combination of composition, gesture, prop, sound, and timing.
- Check relationships, etiquette, dignity, ritual/taboo connotations, vulnerable groups, sexualization, edit-created meaning, and unsafe imitation.
- Treat regulatory questions as candidates for authoritative review, not as model-issued legal verdicts.
- List the exact cue combination that creates each risk.
- Assign `P0`, `P1`, `P2`, or `Pass`, identify the owning layer, and propose a concrete repair that preserves the approved advertising idea.
- Re-review every changed P0/P1 item before passing the storyboard.

### Output

- `audience_interpretation_review.json` for pre-generation review;
- `audience_interpretation_postreview.json` for each generated sample;
- complete shot, adjacent-pair, and whole-film coverage;
- unresolved blockers and final `pass | pass_after_revision | needs_revision` status.

### Boundaries

- Do not choose a new creative mechanism or beautify the storyboard.
- Do not accept the director's explanation as evidence of what viewers will perceive.
- Do not flag remote hypothetical readings as mainstream risk.
- Do not clear a film merely because each cue is harmless in isolation.
- Do not declare legal noncompliance without current authoritative evidence and qualified review.
- Do not hand off P0/P1 blockers to the Generation Assembler.

## Generation Assembler

### Input

- approved Director Contract;
- locked copy;
- selected audio and audio-control contract;
- approved shot script/board and storyboard manifest;
- passed `audience_interpretation_review.json` with no unresolved P0/P1 blockers;
- product/Logo/character assets;
- platform capability record;
- runtime requirements.

### Job

- Build `asset_manifest.json`, `creative_prompt.md`, and `runtime_config.json`.
- Refuse assembly when the independent storyboard risk review is missing, incomplete, or blocked.
- Give every asset one explicit authority and remove duplicated prompt instructions.
- Translate only unavailable modalities into concise text.
- Preserve lyric/beat anchors without forcing equal-duration time boxes.
- Run prompt assertion before generation.

### Output

- lean final Creative Prompt;
- asset manifest and upload eligibility;
- runtime config;
- assertion report;
- concise generation handoff.

### Boundaries

- Do not invent scenes, claims, copy, characters, or a new mechanism.
- Do not put platform operation requests, file paths, upload order, preview/download language, or tuning history into Creative Prompt.
- Do not repeat storyboard and audio mappings in separate sections when they can be merged.

## Lead Director Review

Before spending generation quota, the lead director checks:

- audio and storyboard execute the same mechanism;
- development-mode audio prompt hash is approved and unchanged;
- audio-first storyboards cover every required beat and pass shot-density validation;
- every shot has one coherent intention and a valid fidelity-budget tradeoff;
- product and brand remain causal, not decorative;
- the independent Storyboard Risk Reviewer has covered every shot, adjacent pair, and the whole-film gestalt;
- the pre-generation audience-interpretation review has passed with no unresolved P0/P1 blocker;
- the ending completes brand attribution;
- the prompt contains no duplicated control or process language;
- assets and runtime match the intended platform path;
- the project owner has seen the final prompt during the development phase.

After generation, the Storyboard Risk Reviewer reviews each exact sample again. Only a sample whose post-review allows selection may receive `keep`, `fix_in_post`, or `edit`. The lead director then writes `take_review.json`, assigns one of `keep | fix_in_post | edit | re_roll | rewrite`, and changes at most one owner-layer variable before the next attempt. A flaw repeated in at least two identical-input samples is systematic evidence for `rewrite`.
