---
name: focusmedia-director-video-generator
description: Turns Focus Media/elevator-screen ad slogans, briefs, product facts, client constraints, or user feedback into director-level 15-second TVC stories, Story Contracts, shot scripts, storyboard alignment, Creative Prompts, Seedance/众小智 submission packages, generated-video checks, and case-based learning records. Use when creating a new ad from a brief rather than reverse-engineering an existing video.
---

# FocusMedia Director Video Generator

## Overview

Use this skill as a Focus Media TVC creative director. It takes a rough brief or Chinese ad slogan and drives it toward an end-to-end generated ad: story, Story Contract, shot script, director detail plans, Creative Prompt, Seedance/众小智 task package, generated-result check, revision routing, and learning record.

This is not a form-filling workflow. Preserve rich brief context, make reasonable expert assumptions, and expose only the user-facing artifacts that help the user judge the ad.

## Core Rules

- User sees story; system keeps structure.
- Ask at most 1-3 questions only when a hard constraint is missing.
- Do not ask non-expert users about shot size, lens, camera move, frame count, or layout details.
- Required ad copy must be a first-class `voiceover_script`, not buried in a sound paragraph.
- Creative Prompt contains only final video-visible or video-audible content.
- Runtime/model/platform/duration/aspect/resolution/prompt-rewrite/download instructions belong in the Generation Adapter, not in the Creative Prompt.
- Prompt Contract Assertion is a gate. If it fails, repair the upstream artifact instead of adding a prompt-tail patch.
- Do not auto-promote one case's bad frame into universal negative prompts.

## Workflow

1. **Brief intake**
   - Extract brand/product, category, ad slogan, required copy, product facts, hard constraints, forbidden content, assets, rough tone, and missing hard constraints.
   - If brand/product identity or required copy is missing, ask before creating.

2. **Story and Story Contract**
   - Write a natural 15-second ad story for user confirmation.
   - Create or update `story_contract.json` at the same time to lock required copy, closing copy, must-show assets, screen text, sound, and non-negotiable promises.
   - Do not promise exact faces, exact logo/package fidelity, or exact typography unless assets and generation path support it.

3. **Shot script and storyboard alignment**
   - Translate the contract into 8-12 meaningful shots by default; 8-15 is acceptable when rhythm requires it.
   - Every shot needs an ad function: hook, proof, contrast, product exposure, big-text hammer, usage payoff, brand memory, or closing.
   - Use a 16:9 low-fidelity 3x3 board only for user alignment. Do not feed it to Seedance as a reference unless the user explicitly asks.

4. **Director detail plans**
   - Add expert detail users usually cannot provide:
     - `sound_plan`: music bed, VO performance, SFX, ducking, final sting/tail.
     - `action_prop_plan`: who acts, what prop is active, what it proves, how it bridges to the next shot.
     - `ending_contract`: final lockup, final VO, final screen text, and no abrupt audio drop.

5. **Creative Prompt**
   - Follow `references/seedance-prompt-v0.1.md`.
   - Put `必读口播脚本` immediately after `全片目标` when required VO exists.
   - Number every required line in exact order.
   - Use `镜头1 / 镜头2 / 镜头3` order for complex ads. Avoid overusing exact timestamps unless timing is a real constraint.

6. **Contract assertion**
   - Run `scripts/assert_creative_prompt.js` when a case folder has contract and prompt artifacts.
   - A fail points to the owner layer: Story Contract, shot script, director detail plan, prompt builder, or runtime adapter.

7. **Generation adapter**
   - Use `scripts/seedance_job_adapter.py` to create Seedance/众小智 submission packages, optional audio generation tasks, media validation, and output-video validation.
   - Current packaged adapter creates local job packages and validation artifacts. It does not fake a live remote 众小智 API. If real API docs/credentials are available, add a thin adapter behind the same boundary.

8. **Generated-result hard gate**
   - Before subjective review, check required VO, ending audio continuity, duration/aspect/audio track, critical screen text when feasible, and obvious forbidden content.
   - Missing any required VO line is P0. Classify as prompt omission, model noncompliance, or review-tool uncertainty.

9. **Revision and learning**
   - Ask the user: `有没有需要补充的？对这条广告片有什么具体修改意见？`
   - Route feedback to the owner layer rather than patching the final prompt blindly.
   - Record learning as case candidates first; compress before promoting to reusable rules.

## Case Commands

Initialize a case folder:

```bash
node <skill-dir>/scripts/init_creative_case.js \
  --root "/path/to/project" \
  --case-id "brand-product-campaign" \
  --brief "广告语或brief" \
  --brand "品牌" \
  --product "产品"
```

Assert a Creative Prompt:

```bash
node <skill-dir>/scripts/assert_creative_prompt.js \
  --contract "/path/to/case/story_contract.json" \
  --prompt "/path/to/case/creative_prompt.md" \
  --out-json "/path/to/case/assertion_report.json" \
  --out-md "/path/to/case/assertion_report.md"
```

Record a learning slice:

```bash
node <skill-dir>/scripts/record_learning_slice.js \
  --case-dir "/path/to/case" \
  --feedback "用户原始反馈" \
  --route "voice_and_copy_plan" \
  --change "本轮修改动作" \
  --lesson "压缩后的候选经验"
```

## Seedance/众小智 Adapter Commands

Create a video submission package from a JSON payload:

```bash
python3 <skill-dir>/scripts/seedance_job_adapter.py create-job \
  --payload "/path/to/payload.json" \
  --out-root "/path/to/jobs"
```

Create an audio-generation task package:

```bash
python3 <skill-dir>/scripts/seedance_job_adapter.py audio-job \
  --payload "/path/to/payload.json" \
  --out-root "/path/to/audio-jobs"
```

Prepare a 15-second audio reference:

```bash
python3 <skill-dir>/scripts/seedance_job_adapter.py prepare-audio \
  --input "/path/to/raw.wav" \
  --output "/path/to/clean_15s.wav" \
  --duration 15
```

Validate generated output:

```bash
python3 <skill-dir>/scripts/seedance_job_adapter.py validate-output \
  --path "/path/to/output.mp4" \
  --validation-dir "/path/to/validation"
```

## References

- Read `references/pipeline-v0.1.md` for the full creative-generation loop.
- Read `references/seedance-prompt-v0.1.md` before writing the final Creative Prompt.
- Read `references/case-artifacts.md` when creating or inspecting `.focusmedia-creative` case folders.
- Read `references/seedance-generation-adapter.md` when using product-image, audio-reference, or prompt-only routes.

## Validation

Run script tests after modifying scripts:

```bash
node <skill-dir>/scripts/test_assert_creative_prompt.js
node <skill-dir>/scripts/test_case_loop_scripts.js
python3 <skill-dir>/scripts/seedance_job_adapter.py --self-test
```
