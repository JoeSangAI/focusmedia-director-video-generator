# Generation Adapter V0.2

## Contents

- Adapter boundary and input contract
- Job packaging and asset preflight
- Audio preparation and media validation
- Submission workflow

The adapter packages an already-approved Creative Prompt, asset manifest, and runtime config. It does not author or rewrite creative content.

## Boundary

The Generation Assembler decides asset authority and writes the lean prompt. The adapter owns:

- platform/model selection;
- duration, aspect, resolution, rewrite, and sound settings;
- platform eligibility and privacy checks;
- copying/uploading selected assets with stable slot mapping;
- submission checklist and output paths;
- technical output validation.

The bundled script creates a local submission package. Live 众小智 submission uses the separately installed internal `zxz` CLI as a thin operator; browser clicking and alternate video providers are not normal execution paths.

## Job Payload

```json
{
  "jobName": "brand-campaign-sample",
  "creativePromptPath": "/path/to/creative_prompt.md",
  "runtimeConfig": {
    "platform": "众小智 AI 视频 2.0",
    "model": "Seedance / AI 视频 2.0",
    "generation_phase": "exploration",
    "duration_seconds": 15,
    "aspect_ratio": "16:9",
    "resolution": "480p",
    "prompt_rewrite": false
  },
  "assets": [
    {
      "slot": "@Audio 1",
      "type": "complete_audio",
      "path": "/path/to/prepared.mp3",
      "authority": ["lyrics", "rhythm", "pauses", "bgm", "sfx", "ending"],
      "required": true,
      "platform_eligible": true,
      "required_in_prompt": true
    },
    {
      "slot": "@Image 7",
      "type": "storyboard",
      "path": "/path/to/storyboard.png",
      "authority": ["shot_order", "composition", "action"],
      "required": false,
      "platform_eligible": false,
      "fallback_mode": "text_storyboard",
      "required_in_prompt": false
    }
  ]
}
```

Pass either `creativePrompt` or `creativePromptPath`. The script fails rather than inventing a prompt.

## Commands

Create a submission package:

```bash
python3 scripts/seedance_job_adapter.py create-job --payload payload.json --out-root /path/to/jobs
```

Package one audio prompt into at least three identical-input jobs:

```bash
python3 scripts/seedance_job_adapter.py audio-job --payload audio_payload.json --out-root /path/to/audio-jobs
```

Prepare a slightly overlong selected audio with stream copy:

```bash
python3 scripts/seedance_job_adapter.py prepare-audio --input selected.mp3 --output prepared.mp3 --duration 14.95
```

Validate media or a generated output:

```bash
python3 scripts/seedance_job_adapter.py validate-media --path file.mp3
python3 scripts/seedance_job_adapter.py validate-output --path output.mp4 --validation-dir validation
```

## Preflight

After cloning or updating the skill, check local dependencies:

```bash
python3 scripts/check_environment.py
```

Before any upload or paid generation, list the current valid profiles:

```bash
zxz --profile focusmedia doctor
```

Select a valid Seedance 2.0 profile and run the same command again with `--generation-profile <verified-generation-profile>`. Do not hardcode a profile name copied from another machine.

The adapter rejects:

- missing required assets;
- required assets that are platform-ineligible without a fallback;
- process phrases such as direct-model invocation, grid-generation instructions, preview, or download requests inside Creative Prompt;
- runtime resolution terms inside Creative Prompt.

It copies only eligible assets. Ineligible storyboard/character assets remain in the manifest with an explicit fallback such as `text_storyboard`.

## Submission

- Import one verified platform profile after `zxz auth login`:

```bash
zxz profiles import-chat <verified-chat-id> --name <verified-generation-profile>
```

- Submit an approved package without rewriting its prompt or remapping its assets:

```bash
python3 scripts/seedance_job_adapter.py submit-job \
  --manifest /path/to/submission_manifest.json \
  --generation-profile <verified-generation-profile> \
  --wait
```

- The adapter only maps the package to `zxz`; authentication, upload, preflight, submission, polling, download, retries, and redacted diagnostics stay inside the CLI.
- `zxz` runs a read-only preflight before any upload or paid generation and fails explicitly when the platform contract changed.
- Do not replace a missing or failed `zxz` path with another video API or browser-click submission. Preserve the approved package and repair the 众小智 dependency or profile.
- Generate the planned identical-input batch without changing prompt or assets, then run technical and creative validation on every exact output.
