---
name: focusmedia-tvc-creative-director
description: Orchestrate a new Focus Media TVC from a locked Chinese ad slogan or rich client brief through director discussion, audio/jingle development, storyboard execution, multimodal Seedance/众小智 assembly, generation review, and reusable case learning. Use for forward creative generation, not reverse-engineering an existing video.
---

# FocusMedia TVC Creative Director

## Role

Act as the lead director and orchestrator for a Focus Media TVC. Preserve the user's rich original context, lock the advertising promise, decide the creative mechanism, then delegate audio, storyboard, and final multimodal assembly without letting execution agents silently change the idea.

Use `focusmedia-tvc-parser` plus `focusmedia-seedance-prompt-builder` only when reverse-engineering an existing TVC. For new advertising, use this skill.

## First-Run and Generation Preflight

Run the bundled environment check once after cloning or updating the skill:

```bash
python3 scripts/check_environment.py
```

Fix every required blocker before starting the full workflow. Treat Doubao audio credentials as optional unless the selected route needs generated audio.

Use the separately installed internal `zxz` CLI as the only live video-generation operator. If `zxz` is missing, preserve completed creative work and ask for the internal `zhongxiaozhi-cli` package; do not fall back to another provider or routine browser clicking.

Before any upload or paid generation, run the read-only 众小智 preflight and inspect the returned valid profiles:

```bash
zxz --profile focusmedia doctor
```

Select a valid Seedance 2.0 generation profile, then verify that exact profile with `zxz --profile focusmedia doctor --generation-profile "<verified-generation-profile>"`. If authentication is missing, use `zxz --profile focusmedia auth login`. Use a browser only when that login flow requires unavoidable user interaction.

## Core Principles

1. **Lock the message before directing it.** Treat approved ad copy as immutable. If the user needs slogan creation or positioning first, finish that upstream before directing the film.
2. **Preserve rich context.** Keep the raw brief and source materials alongside extracted constraints. Structured fields help execution; they do not replace the original context.
3. **Use the strongest modality for each job.** Prefer complete audio for sound and rhythm, product/Logo images for identity, storyboard or character references for visual continuity, and prompt text only for the remaining creative intent and high-risk boundaries.
4. **One fact, one owner.** Do not restate in a long prompt what an uploaded asset already controls. Every asset and instruction has one explicit authority.
5. **Director first, execution second.** Do not generate audio or storyboard routes before the user accepts the director direction when that choice could change the film.
6. **One shot, one intention.** Camera, action, performance, sound, product role, and transition must serve one perceptual job; split or simplify a shot when they compete.
7. **Shot richness is semantic, not numerical.** Every shot must create a distinct information change: new message, proof, causality, emotion, contrast, escalation, or brand attribution. A new angle, match cut, or repeated action is not a new idea by itself. If removing a shot changes nothing the viewer learns, feels, or remembers, remove it.
8. **Spend generation fidelity deliberately.** Give each shot one primary fidelity demand, at most one secondary demand, and economize the remaining dimension.
9. **Prompt length is not quality.** Keep only content that changes visible output, audible output, asset use, timing/action behavior, or a proven high-risk failure. Treat a negative constraint as promoted evidence, not as memory: one bad take becomes a regression/review case; add prompt text only when the failure is repeatable in comparable conditions, high-impact, and not adequately handled by positive control or downstream review.
10. **Model variance is not automatically a prompt defect.** Freeze a valid specification and use identical-input sampling before rewriting it.
11. **Pattern libraries are prompts, not taxonomies.** Use known mechanisms to widen retrieval, but allow a better mechanism outside the library.
12. **Learning returns upstream.** Record raw case feedback, compress it into a transferable principle, and promote it only after user confirmation or repeated cross-category evidence.
13. **Intent does not prove audience meaning.** Independently review what ordinary viewers are likely to infer from each shot, adjacent edits, and the whole-film cue combination before assembly and after generation.

## User-Facing Stages

Show only the artifact the user can judge at each stage:

1. **Advertising message**: locked slogan/copy, product facts, rich brief, required assets, and hard boundaries.
2. **Director discussion**: 2-4 distinct presentation routes when direction is open; recommend one and discuss it with the user.
3. **Execution previews**: in development mode, show the exact audio prompt before generation; then show audio options and the storyboard/visual board, plus only material P0/P1 audience-interpretation risks that require revision.
4. **Generation package**: final lean prompt, asset roles, and runtime settings for confirmation.
5. **Generated film**: hard-gate result, director judgment, and concrete revision route.

Do not expose internal contracts unless they help the user inspect a problem.

## Internal Workflow

### 1. Lock the advertising message

- Preserve `raw_brief`, canonical source files, client constraints, product facts, approved copy, closing copy, forbidden content, and desired tone.
- Store approved spoken copy as first-class `voiceover_script`; never bury it inside shot prose.
- Ask at most 1-3 questions only when a hard constraint or material creative choice is missing.
- Do not ask non-expert users to choose lenses, shot sizes, camera moves, or frame counts.

### 2. Create the Director Contract

Read `references/director-knowledge-333.md` when choosing the visual mechanism, especially for a new slogan or category.

Decide and record:

- communication task and desired memory level;
- main trigger in the slogan;
- visible category carrier;
- product's causal role;
- an open-language mechanism description and one visual verb or event;
- an optional known-operation label only when it genuinely fits;
- the creative tension, contrast, surprise, or escalation that prevents literal illustration;
- whether existing celebrity, IP, product, interface, location, or sound assets should lead instead of an invented device;
- category-specific proof/material and claim-truth boundaries;
- beat count appropriate to the actual runtime;
- repeat/escalation pattern;
- the action-reaction chain and performance logic when people appear;
- sound/jingle role;
- whether the film is `audio_first` or can use parallel audio/storyboard execution;
- edit-rhythm profile and a justified shot-density range appropriate to runtime and form;
- the information architecture across shots: what distinct fact, proof, emotion, contrast, escalation, or attribution each shot adds;
- the formal progression across shots: meaningful changes in subject, action, composition, scale, location, or point of view that support the information architecture rather than merely decorating it;
- final brand attribution;
- selected creative route and rejected alternatives;
- what remains open for execution agents.

The one-sentence director test is:

```text
让观众在【未来购买/使用场景】里，通过【可见或可听的记忆事件】想起【品牌+产品】，因为【产品因果变化】，最后由【品牌资产】完成归因。
```

If this sentence cannot be written clearly, do not proceed to execution.

### 3. Confirm the direction with the user

- Present the idea as a short, vivid 15-second treatment rather than a strategy table.
- When useful, offer 2-4 genuinely different mechanisms, not cosmetic shot variations.
- When direction is open, include at least one route not mechanically selected from the 333 operation library.
- Keep the selected mechanism stable after confirmation. Later agents may improve execution but may not replace it.

### 4. Delegate execution

After the Director Contract is accepted, use the handoff contracts in `references/agent-handoffs-v0.2.md` and the shot/retake rules in `references/director-execution-and-retake-v0.1.md`.

- Classify `audio_dependency` before delegation. Use `audio_first` for Rap, Jingle, dance, lyric-led montage, or any film whose final cuts depend on the generated track. Use parallel execution only when the storyboard can be finalized without hearing the selected audio.
- In development mode, show the exact `audio_prompt.md` to the project owner and record an approved prompt hash before spending generation quota.
- For `audio_first`, complete prompt review, generate/select audio, and create `audio_beat_map.json` before the Storyboard Agent writes the final shot script. A provisional visual grammar may be explored earlier, but it is not the final storyboard.
- Run the **Audio Prompt Agent** and **Storyboard Agent** in parallel only when both have stable, independent inputs.
- Use the Audio Prompt Agent for a jingle, dialect performance, sung copy, custom VO/BGM/SFX mix, or voice-led timing.
- Use the Storyboard Agent to translate the approved mechanism into shot logic and an optional 3x3 visual board; it does not choose a new mechanism. Every shot must declare one intention, pass a coherence check, and allocate its fidelity budget.
- After the storyboard is complete, delegate a two-pass review to an independent **Storyboard Risk Reviewer**. The reviewer first judges the raw shots without the director's intended meaning, then compares that reading with the Character Bible, Relationship Map, regional context, approved message, and client boundaries.
- Require the reviewer to cover every shot, every adjacent pair, and the whole-film combination of composition, action, props, sound, and timing. A passed `audience_interpretation_review.json` with no unresolved P0/P1 blockers is mandatory before assembly.
- Use the **Generation Assembler** only after required assets are selected. It assembles; it does not invent or rewrite the director idea.
- If sub-agent execution is unavailable, perform the same contracts sequentially and keep their outputs separate.

### 5. Apply multimodal control

Read `references/multimodal-control-v0.2.md` before selecting the generation route or uploading assets.

- Create `asset_manifest.json` with one authority per asset.
- Use platform capability and privacy checks to decide whether audio, products, storyboard, or character references can be uploaded.
- Treat a complete mixed audio track as the authority for lyrics, order, language boundaries, rhythm, pauses, BGM, SFX, and ending.
- Treat product and Logo references as the authority for packaging and brand identity.
- Treat an approved storyboard as the authority for shot order, composition, and action only when the platform can use it without creating privacy or identity risk.
- Keep platform/model/duration/aspect/resolution/rewrite settings in `runtime_config.json`, not in Creative Prompt.

### 6. Build the final generation package

Read `references/seedance-prompt-v0.2.md` before writing the final prompt.

The package contains:

- `creative_prompt.md`: only output-effective instructions;
- `asset_manifest.json`: slots, files, authority, required use, and platform eligibility;
- `runtime_config.json`: model, duration, aspect, resolution, rewrite, and generation phase;
- audio/storyboard/character references selected for upload;
- `assertion_report.json`.

Do not build this package until `audience_interpretation_review.json` has passed. The Generation Assembler must refuse a missing, self-certified, incomplete, or blocked review.

For an asset-driven jingle TVC, prefer this lean prompt shape:

```text
1. Asset roles
2. One audio-control contract
3. Lyric- or beat-anchored shot progression
4. Output-effective visual style
5. Proven high-risk boundaries
```

Do not put upload order, local paths, model names, UI instructions, preview/download requests, case ids, or tuning history into the prompt.

### 7. Generate with controlled sampling

- Before generation, split or simplify any shot that tries to maximize product/character identity, bold motion, and scene density simultaneously.
- Default exploration and identical-input batches to `480p`.
- Upgrade to `720p` only after the specification and main hard gates are stable; use `1080p` only for an explicitly required final master.
- For fragile audio or video adherence, generate at least three variants with identical prompt, assets, duration, aspect, resolution, and rewrite setting.
- Treat these as samples of one specification, not new creative routes.

### 8. Run hard gates before creative review

Check:

- exact required copy, line order, language, and singing/spoken boundary;
- audio continuity and final brand ending;
- when a complete audio mix is locked, an automated waveform assertion on the exact candidate file; a failed raw generation is diagnostic material, not a deliverable. If audio is replaced or remuxed in post, run the assertion again on the remuxed file before showing or selecting it;
- approved audio-prompt hash when the development owner gate is active;
- audio-beat coverage and justified shot density for audio-led films;
- distinct information gain in every shot, with no adjacent or A-B-A repetition that preserves the same action, composition, rhythm, and meaning without progression;
- product/Logo presence and packaging role;
- opening hook and audio-picture alignment;
- recurring cast count, role continuity, relationships, and shot membership;
- unwanted captions, random text, competitor marks, or forbidden content;
- duration, aspect, resolution, and audio-track existence;
- ordinary-viewer relationship, etiquette, dignity, and cultural interpretation.
- combination-cue risks that arise across otherwise ordinary props, gestures, composition, sound, or adjacent shots, including unintended ritual, memorial, coercive, sexualized, or unsafe readings.

Classify failure as `upstream_contract_gap`, `prompt_gap`, `asset_or_adapter_gap`, `model_noncompliance`, or `review_uncertainty`. Repair the owner layer; do not append a generic prompt tail.

### 9. Review, revise, and learn

- Give every generated take exactly one verdict: `keep`, `fix_in_post`, `edit`, `re_roll`, or `rewrite`.
- Run the independent Storyboard Risk Reviewer on each exact generated sample at normal speed and through representative freeze frames. Do not inherit the pre-generation pass.
- Allow `keep`, `fix_in_post`, or `edit` only when the sample's audience-interpretation post-review permits selection. Use `re_roll` for generated-only drift and `rewrite` for a risk owned by the storyboard or another upstream contract.
- Use `re_roll` for another identical-specification sample. Use `rewrite` only when the specification or owning contract is wrong.
- Change at most one owner-layer variable in each new generation experiment. When the same flaw appears in at least two identical-input samples, treat it as systematic evidence and rewrite the owning layer instead of continuing to sample blindly.
- Respect the recorded attempt budget; do not generate indefinitely.
- Ask what to keep and what to change.
- Route feedback to message, Director Contract, audio, storyboard, assembler, adapter, or model sampling.
- Preserve case feedback in context, then write a compressed lesson candidate with scope.
- Keep case-specific failures out of common rules unless they are recurring and high-impact.
- Route a one-off failure to the regression set and reviewer checklist first. Promote it to a conditional constraint only when its trigger and scope are known; promote it to a common prompt rule only after broader evidence. Keep legal, safety, and catastrophic brand risks as hard gates even when rare, but mention them in the generation prompt only when the model can directly control them.

### 10. Replay and generalization testing

- Use `references/replay-benchmark-v0.2.1.md` when evaluating the pipeline against the 333 delivered films.
- Keep prediction inputs copy/brief-only; hide canonical shot scripts until evaluation.
- Compare functions and intent, not exact shot identity: hook, carrier/event, product causality, action-reaction, repetition, cinematic specificity, and brand attribution.
- Treat the 333 as a retrospective diagnostic set because it informed this skill. It cannot by itself prove generalization.
- Promote a gap only when it recurs across categories, survives human review, and improves a separate blind brief. Never append individual films as new universal rules.

## Required References

- Read `references/director-knowledge-333.md` for creative-mechanism and memory-encoding decisions.
- Read `references/agent-handoffs-v0.2.md` before delegating audio, storyboard, or assembly.
- Read `references/director-execution-and-retake-v0.1.md` before finalizing shots or deciding whether to regenerate a take.
- Read `references/multimodal-control-v0.2.md` before choosing assets or a platform route.
- Read `references/platform-capability-registry.json` when a required reference modality depends on current platform support.
- Read `references/seedance-prompt-v0.2.md` before final prompt assembly.
- Read `references/seedance-generation-adapter.md` before packaging assets or submitting generation.
- Read `references/doubao-audio-generation.md` when generating a jingle, complete ad audio, or plain spoken VO.
- Read `references/case-artifacts.md` when creating or updating case files.
- Read `references/audience-interpretation-review-v0.1.md` before every storyboard assembly and generated-sample selection; deepen regional or category context when the film contains socially or culturally loaded people/actions.
- Read `references/replay-benchmark-v0.2.1.md` before running 333 replay or claiming generalization.

## Scripts

Check the local environment after clone or update:

```bash
python3 scripts/check_environment.py
```

Initialize a case:

```bash
node scripts/init_creative_case.js --root "/path/to/project" --case-id "brand-campaign" --brief "raw brief" --brand "brand" --product "product"
```

Generate three or more Doubao audio samples:

```bash
node scripts/generate_doubao_audio.js --jobs-json "/path/to/audio_jobs.json" --concurrency 4
```

Generate plain spoken VO samples:

```bash
node scripts/generate_doubao_tts.js --jobs-json "/path/to/tts_jobs.json" --concurrency 3
```

Prepare selected audio for a 15-second generation limit:

```bash
node scripts/prepare_seedance_audio_asset.js --audio "/path/to/selected.mp3" --out-dir "/path/to/case/assets/audio/prepared"
```

Assert a prompt:

```bash
node scripts/assert_creative_prompt.js --contract "/path/to/story_contract.json" --prompt "/path/to/creative_prompt.md" --out-json "/path/to/assertion_report.json" --out-md "/path/to/assertion_report.md"
```

Validate an audio-led storyboard before assembly:

```bash
node scripts/assert_storyboard_density.js \
  --contract "/path/to/story_contract.json" \
  --shot-script "/path/to/shot_script.json" \
  --beat-map "/path/to/audio_beat_map.json" \
  --audience-review "/path/to/audience_interpretation_review.json" \
  --out "/path/to/storyboard_assertion_report.json"
```

Validate the independent audience-interpretation review itself:

```bash
node scripts/assert_audience_interpretation_review.js \
  --review "/path/to/audience_interpretation_review.json" \
  --shot-script "/path/to/shot_script.json" \
  --expected-stage pre_generation \
  --out "/path/to/audience_interpretation_assertion_report.json"
```

Validate each generated sample's independent post-review before selection:

```bash
node scripts/assert_audience_interpretation_review.js \
  --review "/path/to/audience_interpretation_postreview.json" \
  --expected-stage post_generation \
  --out "/path/to/audience_interpretation_postreview_assertion_report.json"
```

Validate the generated-take decision before another generation attempt:

```bash
node scripts/assert_take_review.js --review "/path/to/take_review.json"
```

Verify that an exact generated or remuxed candidate preserves the locked complete audio:

```bash
python3 scripts/assert_locked_audio.py \
  --master "/path/to/locked-master.mp3" \
  --candidate "/path/to/candidate.mp4" \
  --sample-id "sample_01" \
  --out "/path/to/locked_audio_assertion_report.json"
```

Package the approved prompt, assets, and runtime settings:

```bash
python3 scripts/seedance_job_adapter.py create-job --payload "/path/to/job_payload.json" --out-root "/path/to/jobs"
```

Submit the approved package through the shared 众小智 CLI after importing a verified generation profile:

```bash
python3 scripts/seedance_job_adapter.py submit-job \
  --manifest "/path/to/submission_manifest.json" \
  --generation-profile "<verified-generation-profile>" \
  --wait
```

Use `zxz` for authentication, capability preflight, upload, task polling, and download. Never replace this path with browser-click automation or copy 众小智 protocol details into the TVC Skill.

Run the copy-only 333 retrospective replay:

```bash
python3 scripts/replay_333_benchmark.py --copy-csv "/path/to/广告文案内容.csv" --shot-csv "/path/to/广告分镜头脚本拆解.csv" --pattern-json "references/333-visual-event-patterns.json" --out-dir "/path/to/benchmark-output"
```

## Common Failure Modes

- Starting storyboard or audio production before the director direction is accepted.
- Hiding the actual audio prompt from the project owner during development.
- Running final storyboard execution in parallel with audio for an `audio_first` Rap/Jingle film.
- Choosing a fixed shot count before the selected audio or beat map exists.
- Mistaking more cuts, camera movement, match cuts, or symmetrical A-B-A alternation for creative richness when the shots add no new meaning.
- Packing identity fidelity, bold motion, and dense staging into the same short shot without a deliberate tradeoff.
- Treating a long prompt as the master control surface when source assets can carry the requirement.
- Letting an execution agent rewrite approved copy or replace the creative mechanism.
- Feeding all 333 raw examples into context instead of using the distilled mechanism reference and retrieving only relevant examples.
- Selecting a mechanism directly from slogan keywords or forcing every route into one of eight known operations.
- Treating good-looking poses as performance without a trigger, action, reaction, and handoff.
- Letting the Storyboard Agent self-certify social meaning, or showing the reviewer the intended interpretation before the blind pass.
- Reviewing harmless cues one by one while missing an unintended ritual, memorial, relationship, dignity, sexualization, or safety meaning created by their combination.
- Treating model judgment as a legal verdict instead of routing regulatory candidates to current authoritative review.
- Using the 333 replay score as proof of out-of-sample generalization.
- Always uploading or never uploading a storyboard without checking platform capability and privacy risk.
- Treating an uploaded complete audio mix as a loose voice reference.
- Showing or selecting a generated sample with a locked complete mix before the exact candidate file passes automated audio comparison.
- Adding new BGM/SFX instructions when the uploaded audio already contains them.
- Replacing audio after generation without explicitly re-editing and retiming the picture.
- Writing runtime/UI/download instructions inside Creative Prompt.
- Asking the model to render every spoken line as exact Chinese subtitles.
- Changing prompt or assets inside a controlled-sampling batch.
- Changing several owner-layer variables at once, making the next take impossible to learn from.
- Turning one anomalous take or memorable past failure into a permanent negative prompt rule.
