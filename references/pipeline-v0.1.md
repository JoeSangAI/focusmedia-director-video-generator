# Pipeline V0.1

Use this reference when implementing or reviewing the full creative-generation loop.

## User Stages

1. **Brief**: collect rough ad slogan, product/brand identity, hard constraints, forbidden content, rough tone.
2. **Story**: show a natural 15-second ad story. The user judges direction by feeling, not by strategy tables.
3. **Storyboard**: show shot-level direction and a 16:9 low-fidelity 3x3 board. The user judges visual direction and product/brand exposure intent.
4. **Prompt**: during V0.1, show Joe the final Creative Prompt before generation.
5. **Generated result**: ask what to keep, what to change, and route feedback to the correct upstream layer.

## Internal Flow

```text
Brief Intake
→ Necessary Questions & Assumptions
→ Brand Task Diagnosis
→ Creative Mechanism Selection
→ 15-second Story + Story Contract
→ Shot Script
→ 16:9 Storyboard
→ Director Detail Plans
→ Video Prompt Builder
→ Prompt Contract Assertion
→ Generation Adapter
→ Generated-result Hard Gate
→ Review & Revision
→ Case-based Learning
```

## Story Contract Fields

Each story segment should map to:

- time range for internal planning only
- ad function
- must-show visual elements
- product/brand exposure intent
- required screen text
- required voice/sound
- style and emotion
- non-droppable primary assets
- free-to-improvise atmosphere
- details not promised to the user

The final Creative Prompt should normally use shot order, not precise timecodes.

## Shot Density

For a normal 15-second Focus Media TVC, use 8-12 meaningful shots by default; 8-15 is acceptable when the rhythm and information design require it. Fewer than 8 shots is a P0 strategy risk unless the user explicitly wants a slow, static film.

This is not a count-for-count rule. Each shot must carry a distinct ad function: hook, brand entry, product proof, contrast, big-text hammer, usage payoff, product memory, or brand closing. Merge or delete shots that do not add information, rhythm, or memory.

## Character Boundary

Character control belongs first in the positive subject definition. Define the role, age range, body proportion, clothing, temperament, and action scale in plain visible terms.

If a character drifts, clean up trigger words in the subject and action plan before adding any negative constraint. Do not turn one case's character drift into a universal negative prompt.

## Director Detail Plans

This layer captures the expert granularity that users usually cannot provide. It sits after the shot script and before Prompt Builder.

### `sound_plan`

Define the full audio system, not only VO:

- continuous music bed and style
- VO performance, accent, pacing, breath, and emphasis
- shot-level SFX such as whoosh, oil drip, stamp hit, drum hit, sparkle, crowd/space tone
- music ducking under VO
- final sting, sustain, or tail through the final brand frame

### `voiceover_script`

Required ad copy is a first-class contract, not a subdetail of `sound_plan`.

- Put the complete required VO script in its own prompt block: `必读口播脚本：`.
- Place it immediately after `全片目标` and before `主体定义`, `声音计划`, `文字计划`, and `镜头1`.
- Number each required line in exact order.
- Keep every required line independent. Do not merge two lines, reverse line order, rewrite phrases, or hide a brand line inside another sentence.
- `sound_plan` may describe performance, accent, rhythm, and music, but should refer back to the `必读口播脚本` instead of carrying the full copy in a long paragraph.
- Shot descriptions may mention which line is spoken, but they must not become the only source of required VO.

### `action_prop_plan`

Define motivated action and prop logic:

- who acts
- what action they perform
- which prop is active
- what the prop proves or triggers
- how this action/prop bridges into the next shot

Objects should not merely appear in the frame. Expert TVCs make props carry proof, transition, memory, or brand closing.

### `ending_contract`

Define the final landing as a combined visual and audio event:

- final product/brand lockup
- final required VO
- final screen text
- music/sting/sustain behavior
- no abrupt audio drop before or during the final brand frame

## Prompt Granularity Gate

When a case requires expert-grade output, Story Contract may include `required_prompt_terms`. Prompt Assertion should fail if these terms are missing from the final Creative Prompt. Use this for compact capability gates such as `音乐床`, `音效`, `道具逻辑`, `最后一帧`, or `尾音延续`, not for bloated case-specific negatives.

When `required_copy` or `required_closing_copy` exists, Prompt Assertion should also fail if the final Creative Prompt lacks a top-level `必读口播脚本` block, if the block appears after `声音计划` or `镜头1`, or if any required line is absent or reordered inside that block.

## Feedback Routing

- Strategy direction issue → brand task / creative mechanism
- Story promise issue → Story Contract
- Visual expression issue → shot script / storyboard
- Voice or text issue → voice plan / text plan
- Required ad copy priority issue → `voiceover_script` / Prompt Builder
- Music/SFX/action-prop/ending issue → Director Detail Plans
- Prompt completeness or process-language issue → Prompt Builder
- Platform config issue → Generation Adapter
- Generated-video artifact issue despite clear prompt → model limitation / review note

Never patch all feedback at the end of the prompt. Return to the artifact that owns the issue.

## Generated-result Hard Gate

Prompt Contract Assertion only proves that the input prompt contains the required copy. It does not prove the generated video actually read or displayed it.

Before subjective review, run hard checks on the generated result:

- ASR voiceover check against `required_copy` and `required_closing_copy`
- ending-audio continuity check when `ending_contract` requires music/sting/tail
- screen-text/OCR check for critical large text when feasible
- duration/aspect/audio existence checks
- obvious forbidden-content scan

Missing any required voiceover line is P0. Classify it as:

- prompt omission: the line was absent from Story Contract, shot script, or Creative Prompt
- model noncompliance: the prompt contained the line but the generated video skipped, altered, or swallowed it
- review-tool uncertainty: ASR is unsure and needs human confirmation

Do not treat a passed prompt assertion as delivery acceptance.

## Learning Compression

Keep raw feedback with the case context, but do not promote it directly into prompt rules.

- First compress the feedback into a transferable principle.
- Mark scope as `case_candidate`, `category_candidate`, or `global_candidate`.
- Keep case-specific negatives case-scoped unless they recur or Joe confirms they are general.
- Prefer upstream contracts over longer negative prompts when a failure can be prevented at the source.
