# Seedance Prompt V0.1

Use this reference when writing the final Creative Prompt. V0.1 follows the official Doubao Seedance 2.0 prompt guide first, then improves through case tests.

Official guide: https://www.volcengine.com/docs/82379/2222480?lang=zh

## Prompt Shape

```text
全片目标：...

必读口播脚本：
1. ...
2. ...
3. ...

主体定义：...

声音计划：...

文字计划：...

动作与道具逻辑：...

镜头1：...
镜头2：...
镜头3：...

必要约束：...
```

## Rules

- Define who does what first.
- Use shot sequence for complex videos.
- For normal 15-second Focus Media films, use 8-12 meaningful shots by default; 8-15 is acceptable. Avoid 5-6 long shots unless slow pacing is a deliberate creative choice.
- Every shot should earn its place through a clear advertising function; do not add empty cuts only to increase shot count.
- Each shot should include cut/camera move, subject action, scene/space, and audio.
- Required ad copy must live in a standalone `必读口播脚本` block immediately after `全片目标`. Number each line in exact order. Do not bury the ad copy inside a long `声音计划` paragraph.
- `声音计划` controls performance and the audio bed; it should refer back to `必读口播脚本` instead of becoming the only place where required copy appears.
- Shot descriptions may attach a script line to a shot, but should not rewrite, merge, split, or reorder required VO.
- Sound plan means the full audio system: continuous music bed, VO performance, shot-level SFX, music ducking, and ending sting/tail. Do not reduce it to spoken copy only.
- Action/prop logic should state the motivated action, active prop, prop function, and bridge to the next shot. Do not merely list objects in the frame.
- Prefer concrete, small, continuous actions.
- Externalize emotion through visible behavior.
- Use one main camera move per shot.
- Character control should be positive first: define age, role, body proportion, clothing, temperament, and action scale. If a character drifts, remove trigger words from the subject/action plan before adding any case-scoped negative constraint.
- Write text overlays separately: content, timing, position, appearance, style.
- Use common Chinese characters; avoid rare characters and special symbols.
- Keep voiceover and screen text separate.
- Brand endings need a distinct voice landing. Do not default to a falling intonation; choose the ending shape by brand tone. For many Focus Media ads, a short pause, clear enunciation, energetic lift, and firm landing are more useful than a low falling sentence end.
- Brand endings also need sonic continuity: music, sting, or tail should support the final lockup through the last frame when the ad needs a finished commercial ending.
- Keep necessary negative constraints only for known risks.
- Treat negative constraints as a small budget, not a dumping ground for every prior bad frame.
- Do not promote a one-case character drift into a universal negative prompt. Compress it into a positive subject-definition rule unless the same drift recurs across cases.

## Do Not Put Runtime In Prompt

Keep these outside Creative Prompt:

- 众小智
- Seedance
- AI 视频 2.0
- 15 秒
- 16:9
- 720p
- Prompt Rewrite
- mp4
- 下载链接
- 视频预览
- 接口
- 九宫格
- 参考图

Runtime belongs in adapter/UI/API state.

## Useful Necessary Constraints

Use only when relevant:

- 不要水印
- 不要随机中英文
- 不要二维码
- 不要无关 Logo
- 不要竞品包装或竞品标识
- 不要与客户禁区相冲突的画面
- 避免把口播全部做成字幕

If the prompt asks for deliberate screen text, do not also say “避免生成任何文字或字幕”. Use precise text-plan constraints instead.

## Negative Constraint Promotion

Do not add a case-specific bad object or mistake to the general prompt strategy after one failure. First ask whether the issue is:

- a source artifact/contract problem that should be fixed upstream
- a category-specific visual reality rule
- a recurring model risk worth a compact negative constraint

Only the third type belongs in the common necessary constraints list.

## Known Model Risks

- Chinese text may be inaccurate.
- Logo/package fidelity is weak without assets.
- Voice can miss brand closing lines if not included in sound plan and final shot.
- Voice can miss or reorder required ad copy when the copy is buried in a long sound/style paragraph. Promote required VO into `必读口播脚本` and keep `声音计划` focused on delivery.
- Voice tone descriptions must be concrete.
- Brand-name endings can feel unfinished if the prompt only says "firm" or "stop". Specify pause, word-by-word clarity, lift/landing shape, and no trailing half-sentence.
- Final lockups can feel broken when the prompt specifies VO but not music/sting/tail. Treat ending audio continuity as part of the ending contract.
- Props can become decorative clutter when the prompt lists products, ingredients, tools, and backgrounds without action causality. Give every important prop a proof, transition, memory, or closing function.
- Character roles can be exaggerated when the prompt stacks strength, labor, heroic, or cartoon cues. Prefer bounded role language over body-related negatives.
- Multiple people or multi-view character references can create duplicate/identity drift.
- Special effects described only in text may not match expected motion logic.
