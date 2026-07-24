# 333 Replay Benchmark V0.2.1

Use this reference to compare forward director/storyboard decisions with delivered Focus Media films without turning individual cases into permanent rules.

## What the benchmark can prove

The 333 corpus is a retrospective diagnostic set. It can reveal recurring gaps between the pipeline and delivered films, but it cannot prove out-of-sample generalization because the corpus also informed the director knowledge library.

Use a separate blind brief set for the final generalization claim. New blind cases are validation surfaces, not new rules or an ever-growing example library.

## Leakage boundary

For each replay case:

1. Give the forward pipeline only the category, brand, product/campaign, approved copy, VO, subtitle/legal requirements, and canonical client assets that would have existed before production.
2. Do not expose the delivered shot script, reverse prompt, frames, video, event label, or previous analysis.
3. Freeze the Director Contract and storyboard output.
4. Reveal the delivered shot script only during evaluation.

The bundled copy-only baseline follows this boundary. It is a deterministic smoke test, not a substitute for the full director agent.

## Compare intent, not imitation

Different good directors will not choose identical shots. Compare these dimensions:

| Dimension | Question |
|---|---|
| Communication | Do both films make the same promise and future recall situation legible? |
| Hook | Does the first beat immediately create attention or a clear question? |
| Carrier/event | Is there a visible or audible device that can repeat? |
| Product causality | Does the product cause the change rather than decorate the scene? |
| Creative tension | Is there contrast, surprise, escalation, humor, stakes, or sensory transformation? |
| Performance | Do people have a trigger, objective, action, reaction, and handoff rather than poses? |
| Cinematic specificity | Are material, location, props, framing, camera, and edit chosen for a reason? |
| Information efficiency | Does each shot add proof, rhythm, emotion, offer, or memory? |
| Brand attribution | Does the event return clearly to brand and product? |
| Generatability | Can the selected model and assets reliably express the plan? |

Score the pipeline and delivered film independently. Record `pipeline_better`, `delivered_better`, `different_but_equal`, or `uncertain` per dimension with one observable reason.

## Promotion gate

Do not upgrade a case observation into the common pipeline unless it:

1. recurs in at least five films;
2. appears in at least two industries;
3. is not explained only by one platform, celebrity, offer type, or production budget;
4. survives human director review;
5. improves at least one separate blind brief without damaging another category.

Promote an abstract capability or review question, not a copied shot. For example, promote “give people an action-reaction handoff,” not “always show a mother passing a bowl.”

## Two evaluation layers

### Layer A: all-333 structural replay

Run `scripts/replay_333_benchmark.py`. It creates copy-only inputs, a rules baseline, canonical signatures, per-case gaps, and aggregate recurring patterns. Use it to detect distribution collapse, missing action, text dependence, weak product causality, and weak attribution.

### Layer B: blind qualitative replay

Select a stratified set across industries, message types, production styles, and known operations. Run the actual director and storyboard agents with canonical shots hidden. Have a human review the dimension table before revealing the delivered film.

Keep at least one route outside the known-operation library. If every output converges on the same mechanism, the pipeline has failed the diversity test even when its structural scores are high.

## Required report

Report:

- dataset and leakage policy;
- operation distribution and collapse warnings;
- recurring strengths in delivered films;
- recurring structural opportunities for the pipeline;
- ambiguous comparisons requiring human judgment;
- changes proposed to the pipeline;
- blind-brief result after the change;
- rejected learnings that were too case-specific.
