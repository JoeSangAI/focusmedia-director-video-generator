# Storyboard Risk Reviewer and Audience Interpretation Gate

Use this reference after the storyboard is complete and before generation assembly, then run it again on every generated sample before selection.

## Role and Independence

Act as the independent `storyboard_risk_reviewer`. Review what an ordinary viewer is likely to infer, not what the director intended.

Do not let the Storyboard Agent certify its own work. When sub-agent execution is available, send the review to a fresh reviewer with the raw artifact rather than the director's diagnosis. If independent execution is unavailable, perform the same two-pass protocol sequentially and record that limitation.

Do not rewrite the creative route. Identify the risky shot, cue combination, likely reading, severity, owning layer, and a concrete repair route.

## Mandatory Stages

### Pre-generation storyboard review

Review every shot description, storyboard panel, recurring character, in-world photo or portrait, gesture, prop, adjacent-shot pair, and the whole-film gestalt. The review must pass before the Generation Assembler starts.

### Post-generation sample review

Review each generated sample at normal speed and through representative freeze frames. Do not inherit the pre-generation result. Models can add people, alter apparent ages, change gestures, create loaded background symbols, or turn a safe sequence into a risky one.

Only samples whose post-review allows selection may receive `keep`, `fix_in_post`, or `edit`. Route generated-only drift to `re_roll`; route repeated or specification-owned risk to `rewrite`.

## Two-Pass Protocol

### Pass 1: intent-blind reading

Hide the director treatment, desired meaning, and repair theory. Provide only:

- shot script or visual board;
- market, region, and intended audience when materially relevant;
- visible character labels only when needed to describe the frame.

For each review unit, answer: "Without the brief, what would a mainstream viewer think is happening?"

### Pass 2: contextual comparison

Then compare the blind reading with:

- Character Bible and Relationship Map;
- approved message and product role;
- regional or category context;
- client boundaries and intended reading.

Pass only when intended and likely readings align or every P0/P1 item has been repaired and re-reviewed.

## Review Units

Review all three levels:

1. **Single shot**: freeze-frame relationship, gesture, prop, dignity, and cultural meaning.
2. **Adjacent sequence**: meaning created by cause, reaction, juxtaposition, match cut, or omission.
3. **Whole-film combination**: an association created by several individually normal cues appearing together.

Never clear a film merely because each prop or action is harmless in isolation.

## Review Lenses

1. **Relationship inference**: spouses, parent and child, elder and junior, colleague and authority, stranger and intimate partner.
2. **Etiquette and dignity**: serving, eating, touching, pointing, kneeling, handling elders or children, humiliation, coercion, and body language.
3. **Cultural and ritual connotation**: offerings, memorials, funerals, illness, poverty, worship, taboo numbers/colors/objects, empty seats, isolated bowls, portraits, flowers, clocks, and loaded music.
4. **Vulnerable-group portrayal**: elders, children, disabled people, workers, patients, and regional groups used as jokes, props, stereotypes, or sexualized subjects.
5. **Edit-created meaning**: unintended death, romance, endorsement, deception, blame, causality, or product claim created across shots.
6. **Imitation and physical safety**: a prominent action that could invite unsafe, indecent, or socially harmful imitation.
7. **Sexualization and bodily boundaries**: age ambiguity, unwanted intimacy, voyeuristic framing, exposure, or suggestive behavior that conflicts with the ad context.
8. **Regulatory candidate**: a possible legal, claim, medical, food, financial, or sector-rule issue that needs authoritative review.

## Combination-Cue Test

List the cues that work together before naming the risk. Include composition, gesture, prop, sound, timing, and adjacent-shot signals.

Use the Red Peony dining regression as a required synthetic test:

```text
Symmetric group enclosure
+ one isolated bowl of white rice centered like an object of attention
+ collective bowl tapping
+ solemn stillness or staring
→ plausible offering, worship, memorial, or ritual reading rather than ordinary family dining
```

The invariant is not "never show a centered bowl" or "never tap a bowl." The reviewer must flag the combined reading when several signals create a mainstream ritual association. Repair the gestalt through motivated serving/eating actions, natural asymmetry, ordinary table context, redistributed props, or another shot design that preserves the advertising idea without the loaded reading.

## Tests

- **Freeze-frame test**: describe the likely relationship and social meaning in one frame.
- **No-brief test**: remove explanatory intent and judge only visible/audible evidence.
- **Mainstream test**: use the most common plausible reading, not a remote hypothetical.
- **Sequence test**: review what two or more shots imply together.
- **Combination-cue test**: identify associations created by multiple weak signals.
- **Local-culture test**: add regional context only when it materially changes the likely reading.

## Severity

- **P0**: likely severe taboo, dignity, relationship, sexualization, or safety meaning makes the storyboard/sample unusable. Block immediately.
- **P1**: a meaningful share of viewers may read the scene as awkward, disrespectful, unsafe, or culturally loaded. Revise before generation or selection.
- **P2**: limited polish or ambiguity risk. Fix when practical and record the decision.
- **Pass**: intended and likely readings align with no unresolved high-impact concern.

## Output Contract

Write `audience_interpretation_review.json` before generation and `audience_interpretation_postreview.json` for each generated sample. Record:

```json
{
  "stage": "pre_generation",
  "reviewer_role": "storyboard_risk_reviewer",
  "independent_from_storyboard_author": true,
  "passes": {
    "blind_reading": {"status": "complete", "intent_was_hidden": true},
    "contextual_comparison": {"status": "complete"}
  },
  "review_context": ["mainstream Chinese audience", "family dining"],
  "review_method": [
    "freeze_frame_test",
    "no_brief_test",
    "mainstream_likely_reading_test",
    "sequence_implication_test",
    "combination_cue_test"
  ],
  "coverage": {
    "reviewed_shots": [1, 2, 3],
    "reviewed_adjacent_pairs": ["1-2", "2-3"],
    "whole_film_reviewed": true
  },
  "items": [
    {
      "shot_scope": [1, 2, 3],
      "intended_reading": "family anticipation for a meal",
      "likely_reading": "the combined staging may resemble an offering or ritual",
      "risk": "ordinary dining is misread as worship or memorial",
      "risk_category": "ritual_taboo",
      "cue_combination": ["isolated centered bowl", "symmetric enclosure", "collective tapping", "solemn stillness"],
      "severity": "p1",
      "upstream_owner": "shot_script",
      "repair": "replace the ritual-like gestalt with motivated serving and eating actions",
      "status": "open"
    }
  ],
  "regulatory_candidates": [],
  "unresolved_blockers": ["shots 1-3 ritual association"],
  "status": "needs_revision"
}
```

Run `scripts/assert_audience_interpretation_review.js` after the reviewer writes the artifact. Run the storyboard assertion with the same review file so assembly cannot bypass the gate.

## Routing

- Wrong relationship or duplicate identity → Character Bible / Relationship Map / Shot Cast Plan
- Awkward gesture or etiquette → action/prop plan / shot script
- Loaded prop, composition, background, or ritual gestalt → storyboard / art direction
- Edit-created implication → shot order / transition plan
- Generated-only artifact with a valid specification → reject sample and `re_roll`
- Repeated risk across identical-input samples → repair the owning contract and `rewrite`
- Regulatory candidate → flag for authoritative compliance or legal review

## Legal Boundary

Do not declare a shot illegal solely from model judgment. State the observable risk and likely audience reading. Separate social-cultural review from legal or sector compliance; route regulatory candidates to current authoritative rules and qualified human review.
