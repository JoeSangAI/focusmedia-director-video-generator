# Seedance / AI Video Prompt Assembly V0.2

Use this reference only after the Director Contract, selected execution assets, and platform route are known.

## Contents

- Assembly filter and asset-driven shape
- Audio, product, storyboard, and character authority
- Shot progression, text, and positive control
- Prompt assertion

## Objective

Write the smallest complete prompt that tells the video model what still needs textual control. Asset preparation, upload mechanics, model settings, and output retrieval live outside the prompt.

## Assembly Filter

Include a detail only when it changes:

- visible content or composition;
- audible content not already fixed by complete audio;
- action, timing, cut, or transition behavior;
- character/scene/product boundaries;
- how an uploaded asset affects the final film;
- a proven high-impact failure not solved by positive definition.

Exclude:

- platform/model/API/UI names;
- duration/aspect/resolution/rewrite when already set in runtime;
- upload order, local paths, filenames, version names, case ids;
- requests for preview, download, or MP4 links;
- tuning history, evaluation notes, rejected attempts;
- “do not generate a storyboard/grid” process wording;
- facts already carried clearly by an uploaded asset.

## Asset-Driven Jingle Shape

```text
@Audio role and authority.
@Image / storyboard / character roles and authority.

Shot progression anchored to lyric sections, beats, and natural pauses.

Concise visual treatment.

Only proven high-risk boundaries.
```

### Complete audio

- State once that the uploaded complete audio is the final soundtrack or highest-priority joint-generation driver.
- Bind picture cuts, actions, product appearance, emotion, and ending to lyrics, strong beats, and natural pauses.
- Do not add a second music bed, SFX plan, or voice-style paragraph when the complete mix already contains them.
- Prefer action/cut rhythm over forcing every person to lip-sync sung lines.
- Use a no-mouth product/brand lockup for a fragile final spoken line when possible.

### Product and Logo assets

- State what the images control: package appearance, SKU identity, Logo, hero placement, or final product family.
- Do not describe file paths or upload order.
- Do not ask the model to redraw critical package text as a separate subtitle.

### Storyboard and character assets

- State only what the reference controls: shot sequence, composition, action, atmosphere, or role identity.
- Do not restate every visible detail if the platform can follow the reference reliably.
- When the reference cannot be uploaded, translate its approved shot logic into concise text.

## Shot Progression

- Use ordered shots or lyric/beat anchors rather than equal-duration boxes for a musical 15-second film.
- Put visual action and its audio anchor in the same row/paragraph.
- Give each shot one main action and normally one main camera behavior.
- Every shot needs an ad job: hook, product entry, proof, repetition, sensory payoff, relationship action, choice memory, or brand closing.
- Do not add a fixed 8-12 shot quota to the prompt. Shot density belongs to director planning and should follow the selected audio.

## Text

- Keep exact generated flower text sparse and image-integrated.
- Route plain subtitles, full sung captions, claims, prices, legal copy, and final slogan text to deterministic overlay when accuracy matters.
- Ask for clean safe areas rather than generated exact text.
- For a packshot supplied as an asset, package and Logo text are asset fidelity, not subtitle generation.

## Positive Control First

Write the intended result directly:

- “人物按下产品按钮，清洁路径从接触点向外显形” instead of listing unrelated failure effects.
- “主产品正面成为稳定画面中心，使用结果在同一构图中可见” instead of generic “product must be clear.”
- “人物先看到问题，再使用产品，另一人物用明确反应承接结果” instead of asking everyone to look happy.

Keep a compact negative only when the wrong behavior recurred and positive wording did not solve it, such as audio rewriting, extra captions, random text, or a specific incorrect serving action.

## Negative-Constraint Promotion Gate

Treat a failure as evidence, not automatically as a rule:

1. A single failure enters the regression set and reviewer checklist.
2. A repeated failure with a known trigger becomes a conditional rule for that scope.
3. Only a repeatable, high-impact failure that survives positive control and cannot be reliably caught downstream enters the generation prompt.
4. Legal, safety, or catastrophic brand risks remain hard gates even when rare; put them in the prompt only when the model can directly control the risk.

Before adding a negative sentence, ask whether the failure is likely without it, whether positive wording is sufficient, whether review/post can catch it, and whether the current case matches the evidence scope. Avoid naming unlikely unwanted imagery because doing so can prime it.

## Prompt Assertion

Fail the package when:

- locked copy is missing, changed, merged, or reordered;
- asset roles are absent or contradictory;
- required brand/product closing is missing;
- prompt includes runtime/process language;
- the same control is repeated in multiple sections;
- uploaded complete audio is contradicted by new sound instructions;
- the board is referenced despite being platform-ineligible;
- a proven P0/P1 audience-interpretation issue remains unresolved.

Passing assertion proves only that the input package is coherent. It does not prove model compliance; validate the generated film separately.
