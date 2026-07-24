# Doubao Audio Generation

Use this when a Focus Media TVC needs a generated jingle, sung ad copy, Cantonese-style opening shout, multi-role brand audio, or a stronger audio track before sending video prompts to Seedance/众小智.

## Contents

- Use cases and credentials
- Generation and audio-preparation scripts
- Prompt rules and known boundaries
- API facts and troubleshooting

## When To Use

- Use `Doubao-音频生成-1.0` for musical ad audio, jingle tests, sung lyrics, multi-part sound design, or prompt-directed performance.
- Use simpler TTS only for plain spoken VO. Agent Plan `seed-tts-2.0` is not the same product as `Doubao-音频生成-1.0`.
- For Cantonese, treat output quality as model-risk: generate options and human-listen before binding it to video.
- Do not rely on this model to reproduce a named existing melody exactly. It can create a song-like jingle, but it did not reliably follow very common tune names such as `小星星` or `两只老虎`, even when prompted with the original lyrics.

## Secrets

Load credentials from `--env-file` or `FOCUSMEDIA_AI_PROVIDER_ENV`. When neither is set, the script may use the current user's local default under `~/.config/joe/secrets/ai-providers.env`.

Expected variables:

```bash
VOLCENGINE_DOUBAO_AUDIO_API_KEY=""
VOLCENGINE_DOUBAO_AUDIO_ENDPOINT="https://openspeech.bytedance.com/api/v3/tts/create"
VOLCENGINE_DOUBAO_AUDIO_MODEL="seed-audio-1.0"
```

Never write API keys into case folders, prompts, learning records, logs, or chat.

## Scripts

Generate one complete musical or prompt-directed audio track:

```bash
node scripts/generate_doubao_audio.js \
  --prompt-file "/path/to/audio_prompt.md" \
  --out "/path/to/output.mp3"
```

Multiple options in parallel:

```bash
node scripts/generate_doubao_audio.js \
  --jobs-json "/path/to/audio_jobs.json" \
  --concurrency 4
```

Jobs JSON:

```json
[
  {
    "prompt_file": "/path/to/version-a.md",
    "out": "/path/to/version-a.mp3"
  },
  {
    "prompt_file": "/path/to/version-b.md",
    "out": "/path/to/version-b.mp3"
  }
]
```

The script writes a small sidecar JSON next to each audio file with duration and request metadata, but never stores the API key.

For plain spoken VO, create a TTS jobs file with an approved speaker id:

```json
[
  {
    "text": "必须完整朗读的广告口播",
    "speaker": "approved-speaker-id",
    "context_texts": ["品牌名和产品名的正确发音"],
    "out": "/path/to/voiceover-01.mp3"
  }
]
```

Then generate the samples:

```bash
node scripts/generate_doubao_tts.js \
  --jobs-json "/path/to/tts_jobs.json" \
  --concurrency 3
```

Do not invent a speaker id. Use a speaker the account is authorized to call, then human-listen before selecting it.

## Preparing For 众小智 / Seedance

Before a selected audio file is uploaded for video generation, run the Seedance audio preparation gate:

```bash
node scripts/prepare_seedance_audio_asset.js \
  --audio "/path/to/selected-audio.mp3" \
  --out-dir "/path/to/case/assets/audio/prepared"
```

The gate reads actual duration with `ffprobe`. If the file is over 15 seconds, it trims the tail to 14.95 seconds with `ffmpeg -c copy`, so the audio is not recompressed. Upload the prepared file and keep the sidecar JSON for traceability.

Do not put this process into the final Creative Prompt. The prompt should only say the film follows the uploaded complete ad-song audio for lyrics, rhythm, mouth movement, action beats, and ending.

## Prompt Rules

- Write the exact runtime duration, normally `15秒` for this pipeline, rather than “约15秒” or a BPM/bar-count substitute.
- Keep one compact chronological prompt: duration, overall musical character, performance/language sequence, only material rhythm corrections, then exact locked copy.
- State the creative priority order when the prompt asks for vocals, music, and multiple sound effects. For advertising Rap, default to intelligible brand/copy first, memorable groove second, sparse sound-design accents third.
- State exact modality: opening shout, sung middle, spoken ending. If singing is required, say it is melodic and rhythmic rather than narration.
- Do not add BPM, bar counts, note-by-note durations, or stacked micro-instructions unless a controlled test demonstrated a clear benefit.
- Generate at least three identical-input variants per batch; choose by human listening, not by prompt intent or ASR alone.
- When one prompt produces an acceptable sample, freeze it and sample again before rewriting it.
- Add negative sound constraints only for proven case risks such as bowl tapping or system beeps.

## Development Prompt Review Gate

- Show the exact `audio_prompt.md` to the project owner before generation.
- Record approval in `audio_prompt_review.json` with `status=approved` and the SHA-256 of the approved prompt.
- Treat a hash mismatch as a new prompt that requires renewed approval.
- After a human selects a sample, create `audio_beat_map.json` from the actual track. Record lyric/hook/pause anchors and the required visual beats that the storyboard must cover.
- Do not let ASR or automatic beat detection select the creative winner; these tools support compliance and timing only.

## Known Boundaries

- Named-tune following is not dependable. Treat prompts like `按小星星曲调唱` or `用两只老虎旋律唱` as rough inspiration only, not as a delivery promise.
- Current guide-vocal/reference-audio tests did not provide reliable attribute-level melody or rhythm control: the reference could dominate or be ignored. Do not add a guide vocal merely because text prompting is imperfect.
- Generate one complete advertising audio track through one prompt. Do not generate vocals, BGM, or closing VO separately and splice, layer, or mix them as a repair path.
- If prompt-only generation cannot reach exact rhythm, lyrics, language boundaries, or melody, treat that as the current model ceiling and continue sampling, selection, or rejection.
- For jingle ideation, ask Doubao for a catchy original melody and generate multiple options instead of asking it to clone a named tune.

## API Facts

- HTTP endpoint: `POST https://openspeech.bytedance.com/api/v3/tts/create`
- Auth header: `X-Api-Key`
- Model: `seed-audio-1.0`
- Output can be returned as base64 `audio` or temporary `url`.
- Basic `audio_config`: `format=mp3`, `sample_rate=48000`, `pitch_rate=0`, `speech_rate=0`, `loudness_rate=0`.
- Plain spoken TTS uses `POST https://openspeech.bytedance.com/api/v3/tts/unidirectional` with resource id `seed-tts-2.0`.

## Troubleshooting

- `403` with `requested resource not granted` can happen before the `音频生成1.0` service is opened or immediately after opening while authorization is still propagating. Check `豆包语音 > 服务管理/开通管理` and retry after a short delay.
- If output is too fast, lower prompt pressure first. Do not overuse speech-rate controls for music-like generation unless testing proves it helps.
- If the model speaks instead of sings, strengthen the prompt with exact modality and generate multiple variants.
- If the model changes the requested named tune, classify it as a known model boundary, not a prompt typo, unless the prompt failed to state that the line must be sung.
- If the ending has beeps or long silence, trim the audio externally and tighten the prompt for the next run.
