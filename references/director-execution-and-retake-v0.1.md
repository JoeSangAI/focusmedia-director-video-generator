# Director Execution and Retake V0.1

Use this reference when finalizing `shot_script.json` and after each generation batch. It keeps short-form directing legible for non-expert users without asking them to judge lenses or production jargon.

## 1. One Shot, One Intention

Every shot gets one `shot_intention`: the single thing an ordinary viewer should perceive, feel, or remember at that moment.

Camera, visible action, performance, product role, sound anchor, and transition must support that intention. Record:

```json
{
  "shot_intention": "四地厨房被同一瓶油依次点燃",
  "coherence_check": {
    "supports_intention": true,
    "conflicts": []
  }
}
```

If two ideas compete, split the shot or remove the weaker idea. Do not hide a conflict with more camera language.

## 2. Per-Shot Fidelity Budget

Video generation spends limited reliability across three competing dimensions:

- `identity_fidelity`: exact product packaging, Logo, recurring person, or other identity-critical assets;
- `motion_boldness`: complex camera movement, choreography, handoffs, transformations, or fast physical action;
- `scene_density`: many people, props, locations, dishes, layers, or simultaneous events.

For every shot:

- choose exactly one `primary_fidelity_spend`;
- choose zero or one `secondary_spend`;
- list every unselected dimension in `economized`;
- record `fragility_risk` as `low`, `medium`, or `high`;
- when risk is high, write a concrete `split_or_simplify_plan` before generation.

Example:

```json
{
  "primary_fidelity_spend": "identity_fidelity",
  "secondary_spend": "motion_boldness",
  "economized": ["scene_density"],
  "fragility_risk": "medium",
  "split_or_simplify_plan": ""
}
```

Never ask one short shot to maximize all three dimensions. A product packshot normally prioritizes identity and economizes motion or density. A choreography shot may prioritize motion and keep product identity simple.

## 3. Five-Way Take Verdict

After hard gates, assign exactly one verdict:

- `keep`: select the take; no further change.
- `fix_in_post`: the generated material is valid and a deterministic overlay, cleanup, mix, or finish can repair it.
- `edit`: the material is valid but needs trimming, resequencing, or selecting different existing moments.
- `re_roll`: the specification is valid; generate another sample with the same prompt, assets, and runtime. Only the sampling seed changes.
- `rewrite`: the specification or an owning contract is wrong; repair one owner layer, then regenerate.

Before assigning any verdict, bind the exact sample's independent `audience_interpretation_postreview`. `keep`, `fix_in_post`, and `edit` require a passed post-review with no unresolved P0/P1 blocker. A generated-only social-meaning drift may use `re_roll`; a storyboard- or contract-owned risk requires `rewrite`.

Use `take_review.json` to record evidence, attempt budget, and the next generation change. The next generation may change one variable only:

```json
{
  "verdict": "rewrite",
  "evidence": ["同一动作在三个相同输入样本中都丢失产品交接"],
  "audience_interpretation_postreview": {
    "sample_id": "sample_03",
    "status": "needs_revision",
    "unresolved_blockers": ["交接动作导致不尊重的大众解读"]
  },
  "repeated_failure_evidence": {
    "failure": "产品交接动作消失",
    "identical_sample_ids": ["sample_01", "sample_02", "sample_03"]
  },
  "next_generation_change": {
    "variable": "storyboard",
    "instruction": "把四地同镜改成两个连续交接镜头"
  }
}
```

Two or more identical-input samples with the same flaw are systematic evidence: use `rewrite`, not blind re-sampling. Stop when the attempt budget is exhausted and report the unresolved limitation.
