# Storyboard Execution

Use this reference after the Director Contract is approved. Execute the storyboard role inside the primary TVC workflow; do not require a separate storyboard skill.

## Contents

- Inputs and execution boundary
- Shot-script construction
- Visual-board generation
- Asset binding and handoff
- Quality gate and outputs

## Inputs and Boundary

Use the available subset of:

- locked advertising copy and product facts;
- approved treatment and `director_contract.json`;
- selected audio or approved `audio_beat_map.json`;
- `audio_dependency`, `edit_rhythm_profile`, and shot-density policy;
- product, Logo, KV, character, and scene references;
- character bible, relationships, and shot-cast requirements;
- current platform/reference-image constraints;
- requested output: text storyboard, 3x3 prompt, or generated board.

Preserve the advertising message, creative mechanism, product causality, audio structure, and brand closing. Do not select a new mechanism or write the final video-generation prompt.

For `audio_first`, do not finalize the shot script from a verbal music description. Require the selected audio or an approved beat map. Early visual exploration may remain provisional.

## Build the Shot Script

For every shot, record:

- `shot_intention`: the ordinary viewer's one perceptual job;
- `information_delta`: the new message, proof, causality, emotion, contrast, escalation, or attribution;
- ad function and audio line/beat/pause anchor;
- visible action and active prop;
- trigger, performer objective, observable reaction, and handoff when people appear;
- product/brand role;
- composition and one main camera behavior;
- cast ids, transition/causal bridge, screen-text layer, asset reference, and risk;
- one primary fidelity spend, at most one secondary spend, and the economized dimension.

Use the selected audio's structure when available. Do not force equal-duration shots.

Reject a shot when it repeats substantially the same subject, action, composition, scale, rhythm, and meaning without adding escalation, contrast, causality, proof, emotion, or brand attribution. Run this redundancy test on every adjacent pair and every A-B-A recurrence.

For an approximately 15-second `rap_fast` or `jingle_fast` film, target 9-11 meaningful shots and normally stay within 8-12. Record an explicit runtime/mechanism reason for an exception and preserve enough time for a legible brand close.

Map every required beat to at least one shot through `audio_beat_ids`. A new angle, camera move, decorative insert, match cut, or repeated action is not a meaningful new shot unless it changes what the viewer learns, feels, or remembers.

Give recurring people stable role ids, relationships, visual anchors, wardrobe, and shot membership. Do not use smiling, holding, pointing, or looking at camera as sufficient performance direction; give each person a reason to act and an observable recipient or result.

## Build the Visual Board

Use a 3x3 board to align the whole film, pressure-test the memory event, or provide a generation reference when the selected platform supports it.

- Keep every panel 16:9 inside one 3x3 sheet.
- Preserve one visual system, cast, wardrobe, location logic, and carrier/event.
- Cover hook, brand/product entry, proof/action, repetition, payoff, and closing.
- Avoid nine unrelated attractive frames.
- Do not rely on generated Chinese slogans or paragraphs inside the board.
- Treat official product and Logo files as identity references, not collage layers.
- Bind product and Logo as separate references when supported and describe the closing composition in text.
- Never cut out or paste a supplied product image or Logo onto an AI-generated background, panel, or ending frame.

When the host exposes image generation and the user requests a visual board, render the approved board-generation prompt as one 3x3 bitmap. Inspect the exact output for panel count, continuity, product/brand misuse, generated text, unintended claims, and social/cultural risk before handoff.

When image generation is unavailable or the platform rejects people/faces, return the complete text storyboard, `storyboard_manifest.json`, `storyboard_asset_bindings.json`, and board-generation prompt. State that the bitmap remains pending; do not fabricate a generated-board claim.

## Record Asset Binding

Write `storyboard_asset_bindings.json` with:

- what the board controls: shot order, composition, action, atmosphere, or identity;
- product/Logo/character references used;
- whether people or faces appear;
- current platform eligibility and privacy risk;
- fallback text translation when upload is unsupported.

Do not universally mark a board uploadable or non-uploadable. Let the Generation Assembler and current platform capability record decide.

## Independent Review and Quality Gate

Hand the completed shot script and board to the independent `storyboard_risk_reviewer`. Do not self-certify audience meaning.

Require:

- blind mainstream reading before revealing intended interpretation;
- coverage of every shot, adjacent pair, and the whole-film cue combination;
- repair and re-review of every P0/P1 item;
- a passed audience-interpretation review before Generation Assembly;
- storyboard-density validation for audio-led films.

Before handoff, verify:

- the selected mechanism stays visible and product-causal;
- audio and actions share one progression;
- every shot has a distinct information delta;
- every required audio beat is mapped;
- recurring people remain consistent and socially legible;
- combined props, gestures, framing, sound, and edits do not create an unintended ritual, memorial, humiliating, sexualized, or unsafe reading;
- the final packshot and brand attribution are complete;
- the board introduces no unapproved claim, copy, character, product, or synthetic pasted asset.

## Outputs

Return only the requested finished artifacts:

1. `shot_script.json` or a concise human-readable shot list;
2. `storyboard_manifest.json`;
3. 3x3 board-generation prompt and rendered board when requested and available;
4. `storyboard_asset_bindings.json`;
5. `storyboard_assertion_report.json` after the independent review passes.
