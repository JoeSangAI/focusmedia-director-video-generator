# Seedance / 众小智 Generation Adapter

## Boundary

The Creative Prompt describes only the ad that should appear and sound in the video. The Generation Adapter owns platform and runtime concerns:

- model/platform choice
- duration, aspect ratio, resolution
- prompt rewrite setting
- product image and audio reference uploads
- submission checklist
- generated-video download path
- validation artifacts

Do not put runtime words such as `众小智`, `Seedance`, `AI视频2.0`, `720p`, `mp4下载链接`, `接口`, or `Prompt Rewrite` into the Creative Prompt unless the actual execution channel requires a separate submission wrapper.

The packaged adapter creates local task packages and validation reports. It does not include a live remote 众小智 HTTP submission because no stable public API contract is bundled. If real API docs and credentials are supplied, implement them behind the same adapter boundary.

## Generation Routes

### Product Image + Audio Reference

Use when a satisfactory full ad audio already exists.

Inputs:

- `@Image 1`: product/KV image for packaging and product identity.
- `@Audio 1`: complete 15-second audio reference with VO, BGM, SFX, rhythm, pauses, emphasis, and final brand landing.
- Prompt still lists the exact VO lines, but performance control can be more concise because `@Audio 1` carries rhythm and delivery.

Hard rule:

```text
@Audio 1 是最高优先级，是完整成片音频参考。
```

Do not post-produce by pasting audio onto an unrelated generated video and call it audio-reference generation.

### Product Image + Strong VO Prompt

Use when letting Seedance generate VO, BGM, and SFX directly.

Inputs:

- `@Image 1`: product/KV image.
- No audio file.
- Prompt must specify complete VO, voice persona, accent boundary, emphasis, pauses, emotion, pronunciation hints, and final landing.

This route can be faster and more integrated, but product fidelity and VO compliance remain model risks.

### Audio Generation Task

Use an audio model first when VO performance matters. The audio prompt should demand a strict 15-second complete Chinese ad audio, not "about 15 seconds." After selection, trim/clean tail noise if needed, then use the audio as `@Audio 1`.

## Submit Order

1. Open a clean new 众小智 conversation.
2. Switch to `众小智-AI视频2.0`.
3. Upload product image and confirm the image preview appears.
4. If using audio route, upload the cleaned audio and confirm the filename appears.
5. Paste the generated prompt.
6. Generate, download MP4, and save it into the job's `seedance-output/`.
7. Run `validate-output` to create ffprobe JSON and a contact sheet.

Avoid reusing old conversations with previous videos, old audio, failed prompts, or conflicting references.

## Output Quality Bands

- 60%: video generates, product is roughly recognizable, but rhythm or voice does not follow.
- 80%: product image, audio/prompt structure, rhythm, and final brand landing mostly work; Chinese text can still be unstable.
- 95%: frame rhythm, mouth/action timing, product exposure, audio emphasis, final lockup, and key Chinese text are all close enough for production.

## Payload Fields

`seedance_job_adapter.py` accepts a JSON payload with these useful fields:

- `jobName`
- `strategy`: `image_audio` or `image_only`
- `productName`
- `slogan`
- `brandContext`
- `productImagePath`
- `audioPath`
- `voiceoverLines`
- `videoPrompt`
- `audioPrompt`
- `timeline`
- `duration`
- `aspectRatio`
- `resolution`
- `visualStyle`
- `forbidden`

The adapter writes a manifest, prompt file, checklist, copied input assets when paths exist, and output/validation folders.
