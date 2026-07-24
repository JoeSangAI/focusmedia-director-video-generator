# Multimodal Control V0.2

Use this reference before selecting generation inputs, assigning asset slots, or assembling the final prompt.

## Principle

Do not make one long prompt carry every requirement. Assign each requirement to the modality that can express it most directly and verify it most clearly.

The hierarchy is authority by domain, not a single global ordering:

| Domain | Preferred authority |
|---|---|
| Approved advertising message and product facts | locked contract |
| Lyrics, language, vocal performance, rhythm, pauses, BGM, SFX, ending | selected complete audio |
| Package, Logo, SKU color/shape, brand identity | supplied product/Logo image |
| Shot order, composition, key action, spatial relation | approved storyboard when supported |
| Recurring identity, face, wardrobe | per-role character reference when supported |
| Remaining creative intent, causality, style, action detail, proven boundaries | lean text prompt |
| Duration, aspect, resolution, model, rewrite, sound switch | runtime config |

An asset only controls its declared domain. A product image does not control rhythm; a storyboard does not override exact packaging; a complete audio mix does not define visual composition.

## Asset Manifest

Create `asset_manifest.json` before final assembly:

```json
{
  "assets": [
    {
      "slot": "@Audio 1",
      "type": "complete_audio",
      "path": "assets/audio/prepared/master.mp3",
      "authority": ["lyrics", "rhythm", "pauses", "bgm", "sfx", "ending"],
      "prompt_role": "唯一成片声轨；画面按歌词、重拍和停顿推进",
      "required": true,
      "platform_eligible": true,
      "validated": true
    }
  ]
}
```

Keep paths and validation metadata out of Creative Prompt. The prompt may use slot labels and output-facing roles only.

## Generation Routes

Choose the richest reliable route supported by the platform and available assets:

1. **Prompt only**: exploration when no canonical assets exist; lowest identity and audio repeatability.
2. **Product/Logo + prompt**: minimum route for product advertising when packaging matters.
3. **Product/Logo + complete audio + prompt**: preferred for a selected jingle/VO mix.
4. **Product/Logo + complete audio + storyboard + prompt**: preferred when the platform accepts the board and shot control matters.
5. **Product/Logo + complete audio + storyboard + character references + prompt**: strongest route when identity references are supported and safe.

Do not upload a weak or misleading reference merely to increase modality count.

## Platform Capability Policy

Capabilities must live in the Generation Adapter and be verified at runtime. Read `platform-capability-registry.json` for time-stamped observations; never turn one case or node into a universal platform promise.

- Validate required reference types before spending a high-resolution generation.
- When a required modality is unsupported, preserve its approved contract and translate only that missing control into concise prompt text.
- Do not write direct-generation operations such as “不要生成九宫格” in Creative Prompt; they belong to the adapter.
- Record a new observation with platform path, model/node, date, evidence scope, and confidence. Replace stale records instead of adding permanent exception prose.

## Prompt Attention Budget

- Mention each asset role once near the start.
- Merge audio mapping and shot progression; do not write separate duplicated sections for storyboard, sound-to-picture logic, and editing.
- Use lyric, beat, or natural-pause anchors when complete audio exists. Do not impose equal-duration time boxes on a musical film.
- Remove process language, filenames, upload order, model/UI instructions, tuning history, and evaluation notes.
- Keep exact copy once in the correct authority block. Do not repeat it with paraphrases.
- Keep negative constraints only for recurrent, high-impact failures that positive specification cannot solve.
- Do not optimize for character count or word count. Optimize for unambiguous authority and no duplication.

## Required Validation

- Verify actual audio duration and prepare it for the platform limit without recompressing a selected performance when possible.
- Verify product/Logo files and slot mapping.
- Verify storyboard and character references against platform privacy/capability rules.
- Verify runtime parameters independently from prompt text.
- After generation, verify whether each authority actually influenced the output; do not infer compliance from successful upload alone.
