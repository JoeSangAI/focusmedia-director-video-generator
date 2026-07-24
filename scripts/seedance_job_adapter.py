#!/usr/bin/env python3
"""Package an already-approved multimodal TVC specification for generation.

The adapter does not create or rewrite the Creative Prompt. It copies validated
assets, stores runtime settings separately, and produces a submission checklist.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path


PROCESS_TERMS = (
    "请直接调用 Seedance",
    "不要生成九宫格",
    "返回视频预览",
    "mp4 下载链接",
    "当前已保存参数",
)
RUNTIME_TERMS = ("Prompt Rewrite", "480p", "480P", "720p", "720P", "1080p", "1080P")


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def slugify(value: str, fallback: str = "seedance-job") -> str:
    value = (value or "").strip() or fallback
    value = re.sub(r"[\\/:*?\"<>|#%&{}$!'@+=`~\s]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")[:80] or fallback


def read_json(path: str | Path) -> dict:
    return json.loads(Path(path).expanduser().read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_text_value(payload: dict, value_key: str, path_key: str) -> str:
    direct = str(payload.get(value_key) or "").strip()
    if direct:
        return direct
    source = str(payload.get(path_key) or "").strip()
    if source:
        return Path(source).expanduser().read_text(encoding="utf-8").strip()
    return ""


def run_command(args: list[str]) -> dict:
    try:
        completed = subprocess.run(args, capture_output=True, text=True, check=False)
        return {
            "ok": completed.returncode == 0,
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
            "cmd": args,
        }
    except FileNotFoundError as exc:
        return {"ok": False, "returncode": 127, "stdout": "", "stderr": str(exc), "cmd": args}


def ffprobe(path: Path) -> dict:
    path = path.expanduser()
    if not path.exists():
        return {"ok": False, "error": "file_not_found", "path": str(path)}
    result = run_command(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size",
            "-show_entries",
            "stream=index,codec_type,codec_name,width,height,sample_rate,channels",
            "-of",
            "json",
            str(path),
        ]
    )
    if not result["ok"]:
        return {"ok": False, "path": str(path), "error": result["stderr"], "raw": result}
    return {"ok": True, "path": str(path), "probe": json.loads(result["stdout"] or "{}")}


def prompt_preflight(prompt: str) -> list[dict]:
    issues: list[dict] = []
    for term in PROCESS_TERMS:
        if term in prompt:
            issues.append({"code": "process_term_in_prompt", "term": term})
    for term in RUNTIME_TERMS:
        if term in prompt:
            issues.append({"code": "runtime_term_in_prompt", "term": term})
    return issues


def asset_subdir(asset_type: str) -> str:
    normalized = (asset_type or "other").lower()
    if "audio" in normalized:
        return "audio"
    if normalized in {"logo", "product", "image", "kv"}:
        return "image"
    if "storyboard" in normalized:
        return "storyboard"
    if "character" in normalized or "face" in normalized:
        return "character"
    return "other"


def copy_assets(assets: list[dict], root: Path) -> tuple[list[dict], list[dict]]:
    copied: list[dict] = []
    issues: list[dict] = []
    for index, asset in enumerate(assets, start=1):
        item = dict(asset)
        slot = str(item.get("slot") or f"asset-{index}")
        eligible = item.get("platform_eligible") is not False
        fallback_mode = str(item.get("fallback_mode") or "").strip()
        source_value = str(item.get("path") or "").strip()
        source = Path(source_value).expanduser() if source_value else None

        if item.get("required") is True and not eligible and not fallback_mode:
            issues.append({"code": "required_asset_not_platform_eligible", "slot": slot})
            item["copied"] = False
            copied.append(item)
            continue
        if not eligible:
            item["copied"] = False
            item["copy_reason"] = f"platform_ineligible; fallback={fallback_mode or 'none'}"
            copied.append(item)
            continue
        if not source or not source.exists():
            item["copied"] = False
            item["copy_reason"] = "source_missing"
            if item.get("required") is True:
                issues.append({"code": "required_asset_missing", "slot": slot, "path": source_value})
            copied.append(item)
            continue

        target_dir = root / "assets" / asset_subdir(str(item.get("type") or ""))
        target_dir.mkdir(parents=True, exist_ok=True)
        target_name = f"{index:02d}_{slugify(slot, f'asset-{index}')}{source.suffix.lower()}"
        target = target_dir / target_name
        shutil.copy2(source, target)
        item["copied"] = True
        item["packaged_path"] = str(target)
        item["media_probe"] = ffprobe(target) if asset_subdir(str(item.get("type") or "")) == "audio" else None
        copied.append(item)
    return copied, issues


def normalized_runtime(payload: dict) -> dict:
    runtime = dict(payload.get("runtimeConfig") or payload.get("runtime_config") or {})
    return {
        "platform": runtime.get("platform") or "",
        "model": runtime.get("model") or "",
        "generation_phase": runtime.get("generation_phase") or "exploration",
        "duration_seconds": runtime.get("duration_seconds", 15),
        "aspect_ratio": runtime.get("aspect_ratio") or "16:9",
        "resolution": runtime.get("resolution") or "480p",
        "prompt_rewrite": bool(runtime.get("prompt_rewrite", False)),
        "zxz_profile": runtime.get("zxz_profile") or "focusmedia",
        "zxz_generation_profile": runtime.get("zxz_generation_profile") or "",
    }


def zxz_reference_kind(asset_type: str) -> str:
    normalized = (asset_type or "").lower()
    if "audio" in normalized:
        return "audio"
    if "video" in normalized:
        return "video"
    if normalized in {"logo", "product", "image", "kv", "storyboard", "character", "face"}:
        return "image"
    return "file"


def build_zxz_command(
    manifest: dict,
    *,
    generation_profile: str,
    credential_profile: str,
    wait: bool,
    timeout: float,
    dry_run: bool,
) -> list[str]:
    prompt_path = Path(str(manifest.get("prompt") or "")).expanduser()
    asset_manifest_path = Path(str(manifest.get("asset_manifest") or "")).expanduser()
    output_dir = Path(str(manifest.get("output_dir") or "")).expanduser()
    if not prompt_path.is_file():
        raise ValueError(f"Packaged prompt missing: {prompt_path}")
    if not asset_manifest_path.is_file():
        raise ValueError(f"Packaged asset manifest missing: {asset_manifest_path}")
    if not generation_profile:
        raise ValueError("A verified zxz generation profile is required.")

    command = [
        "zxz",
        "--profile",
        credential_profile or "focusmedia",
        "video",
        "generate",
        "--generation-profile",
        generation_profile,
        "--prompt-file",
        str(prompt_path),
    ]
    asset_manifest = read_json(asset_manifest_path)
    for asset in asset_manifest.get("assets") or []:
        if asset.get("copied") is not True:
            continue
        packaged_path = Path(str(asset.get("packaged_path") or "")).expanduser()
        if not packaged_path.is_file():
            raise ValueError(f"Packaged asset missing: {packaged_path}")
        command.extend(["--reference", f"{zxz_reference_kind(str(asset.get('type') or ''))}:{packaged_path}"])

    if wait:
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{Path(str(manifest.get('job_root') or 'tvc')).name}.mp4"
        command.extend(["--wait", "--timeout", str(timeout), "--out", str(output_path)])
    if dry_run:
        command.append("--dry-run")
    return command


def submit_job(
    manifest_path: Path,
    *,
    generation_profile: str,
    credential_profile: str,
    wait: bool,
    timeout: float,
    dry_run: bool,
) -> dict:
    manifest_path = manifest_path.expanduser()
    manifest = read_json(manifest_path)
    runtime_path = Path(str(manifest.get("runtime_config") or "")).expanduser()
    runtime = read_json(runtime_path) if runtime_path.is_file() else {}
    selected_generation_profile = generation_profile or str(runtime.get("zxz_generation_profile") or "")
    selected_credential_profile = credential_profile or str(runtime.get("zxz_profile") or "focusmedia")
    command = build_zxz_command(
        manifest,
        generation_profile=selected_generation_profile,
        credential_profile=selected_credential_profile,
        wait=wait,
        timeout=timeout,
        dry_run=dry_run,
    )
    result = run_command(command)
    parsed: dict = {}
    if result.get("stdout"):
        try:
            parsed = json.loads(result["stdout"])
        except json.JSONDecodeError:
            parsed = {"raw_stdout": result["stdout"]}
    report = {
        "ok": result["ok"],
        "submitted_at": now_stamp(),
        "operator": "zxz",
        "generation_profile": selected_generation_profile,
        "credential_profile": selected_credential_profile,
        "dry_run": dry_run,
        "result": parsed,
        "stderr": result.get("stderr") or "",
    }
    report_path = manifest_path.parent / "submission_result.json"
    write_json(report_path, report)
    report["report_path"] = str(report_path)
    return report


def create_job(payload: dict, out_root: Path) -> dict:
    prompt = read_text_value(payload, "creativePrompt", "creativePromptPath")
    if not prompt:
        raise ValueError("Pass creativePrompt or creativePromptPath. The adapter does not author prompts.")

    runtime = normalized_runtime(payload)
    prompt_issues = prompt_preflight(prompt)
    if prompt_issues:
        raise ValueError(f"Creative Prompt preflight failed: {prompt_issues}")

    suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
    root = out_root.expanduser() / f"{slugify(payload.get('jobName') or 'tvc')}-{suffix}"
    (root / "prompt").mkdir(parents=True, exist_ok=True)
    (root / "seedance-output").mkdir(parents=True, exist_ok=True)
    (root / "validation").mkdir(parents=True, exist_ok=True)

    prompt_path = root / "prompt" / "creative_prompt.md"
    prompt_path.write_text(prompt + "\n", encoding="utf-8")
    copied_assets, asset_issues = copy_assets(list(payload.get("assets") or []), root)
    if asset_issues:
        raise ValueError(f"Asset preflight failed: {asset_issues}")

    asset_manifest = {
        "platform": runtime["platform"],
        "assets": copied_assets,
        "validated_at": now_stamp(),
    }
    write_json(root / "asset_manifest.json", asset_manifest)
    write_json(root / "runtime_config.json", runtime)

    checklist = """# Generation Submission Checklist

- [ ] Run the skill's check_environment.py and resolve every required blocker.
- [ ] Run zxz doctor against the exact generation profile before any upload or paid generation.
- [ ] Submit submission_manifest.json through seedance_job_adapter.py submit-job; do not upload or paste assets manually.
- [ ] Keep runtime_config.json, asset_manifest.json, and prompt/creative_prompt.md unchanged inside one sampling batch.
- [ ] Generate the planned identical-input sample count without changing prompt or assets.
- [ ] Save outputs under seedance-output/ and run validate-output before creative review.
"""
    (root / "submission_checklist.md").write_text(checklist, encoding="utf-8")

    manifest = {
        "created_at": now_stamp(),
        "job_root": str(root),
        "prompt": str(prompt_path),
        "asset_manifest": str(root / "asset_manifest.json"),
        "runtime_config": str(root / "runtime_config.json"),
        "submission_checklist": str(root / "submission_checklist.md"),
        "output_dir": str(root / "seedance-output"),
        "validation_dir": str(root / "validation"),
    }
    write_json(root / "submission_manifest.json", manifest)
    return {"ok": True, "jobRoot": str(root), "manifestPath": str(root / "submission_manifest.json")}


def create_audio_job(payload: dict, out_root: Path) -> dict:
    prompt = read_text_value(payload, "audioPrompt", "audioPromptPath")
    if not prompt:
        raise ValueError("Pass audioPrompt or audioPromptPath. The adapter does not author audio prompts.")
    variants = max(3, int(payload.get("variants") or 3))
    suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
    root = out_root.expanduser() / f"{slugify(payload.get('jobName') or 'audio')}-{suffix}"
    root.mkdir(parents=True, exist_ok=True)
    prompt_path = root / "audio_prompt.md"
    prompt_path.write_text(prompt + "\n", encoding="utf-8")
    jobs = [
        {"prompt_file": str(prompt_path), "out": str(root / f"{index:02d}_sample.mp3")}
        for index in range(1, variants + 1)
    ]
    write_json(root / "audio_jobs.json", jobs)
    write_json(
        root / "manifest.json",
        {"created_at": now_stamp(), "variants": variants, "prompt": str(prompt_path), "jobs": str(root / "audio_jobs.json")},
    )
    return {"ok": True, "jobRoot": str(root), "manifestPath": str(root / "manifest.json")}


def prepare_audio(input_path: Path, output_path: Path, duration: float) -> dict:
    input_path = input_path.expanduser()
    output_path = output_path.expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = run_command(
        ["ffmpeg", "-y", "-i", str(input_path), "-t", f"{duration:.3f}", "-c", "copy", str(output_path)]
    )
    return {
        "ok": result["ok"],
        "input": ffprobe(input_path),
        "output": ffprobe(output_path) if output_path.exists() else {"ok": False},
        "codec_copy": True,
        "command": result,
    }


def validate_output(path: Path, validation_dir: Path) -> dict:
    path = path.expanduser()
    validation_dir = validation_dir.expanduser()
    validation_dir.mkdir(parents=True, exist_ok=True)
    contact_sheet = validation_dir / f"{path.stem}_contact_sheet.jpg"
    probe = ffprobe(path)
    contact_result = run_command(
        ["ffmpeg", "-y", "-i", str(path), "-vf", "fps=1,scale=320:-1,tile=5x3", "-frames:v", "1", str(contact_sheet)]
    )
    report = {
        "ok": probe.get("ok", False) and contact_result["ok"],
        "checked_at": now_stamp(),
        "output_path": str(path),
        "probe": probe,
        "contact_sheet": str(contact_sheet) if contact_sheet.exists() else "",
        "contact_sheet_command": contact_result,
    }
    report_path = validation_dir / f"{path.stem}_validation.json"
    write_json(report_path, report)
    report["report_path"] = str(report_path)
    return report


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        asset = root / "product.jpg"
        asset.write_bytes(b"test")
        job = create_job(
            {
                "jobName": "adapter-test",
                "creativePrompt": "@Image 1 是产品包装标准。产品正面清楚出现。",
                "runtimeConfig": {"duration_seconds": 15, "aspect_ratio": "16:9", "resolution": "480p"},
                "assets": [
                    {"slot": "@Image 1", "type": "product", "path": str(asset), "required": True, "platform_eligible": True}
                ],
            },
            root / "jobs",
        )
        if not Path(job["manifestPath"]).exists():
            raise AssertionError("submission manifest not created")
        audio = create_audio_job(
            {"jobName": "audio-test", "audioPrompt": "15秒。轻快广告歌。测试品牌。", "variants": 3},
            root / "audio-jobs",
        )
        jobs = read_json(Path(audio["jobRoot"]) / "audio_jobs.json")
        if len(jobs) != 3:
            raise AssertionError("audio job must create at least three identical-input samples")
        manifest = read_json(job["manifestPath"])
        command = build_zxz_command(
            manifest,
            generation_profile="test-generation-profile",
            credential_profile="focusmedia",
            wait=True,
            timeout=900,
            dry_run=False,
        )
        if command[:4] != ["zxz", "--profile", "focusmedia", "video"]:
            raise AssertionError("zxz command boundary is invalid")
        if not any(value.startswith("image:") for value in command):
            raise AssertionError("product asset must map to an image reference")
    print("seedance_job_adapter self-test passed")
    return 0


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    subparsers = parser.add_subparsers(dest="command")

    job_parser = subparsers.add_parser("create-job")
    job_parser.add_argument("--payload", required=True)
    job_parser.add_argument("--out-root", required=True)

    audio_parser = subparsers.add_parser("audio-job")
    audio_parser.add_argument("--payload", required=True)
    audio_parser.add_argument("--out-root", required=True)

    prepare_parser = subparsers.add_parser("prepare-audio")
    prepare_parser.add_argument("--input", required=True)
    prepare_parser.add_argument("--output", required=True)
    prepare_parser.add_argument("--duration", type=float, default=14.95)

    media_parser = subparsers.add_parser("validate-media")
    media_parser.add_argument("--path", required=True)

    output_parser = subparsers.add_parser("validate-output")
    output_parser.add_argument("--path", required=True)
    output_parser.add_argument("--validation-dir", required=True)

    submit_parser = subparsers.add_parser("submit-job")
    submit_parser.add_argument("--manifest", required=True)
    submit_parser.add_argument("--generation-profile", default="")
    submit_parser.add_argument("--credential-profile", default="")
    submit_parser.add_argument("--wait", action="store_true")
    submit_parser.add_argument("--timeout", type=float, default=900)
    submit_parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if args.command == "create-job":
        print_json(create_job(read_json(args.payload), Path(args.out_root)))
        return 0
    if args.command == "audio-job":
        print_json(create_audio_job(read_json(args.payload), Path(args.out_root)))
        return 0
    if args.command == "prepare-audio":
        print_json(prepare_audio(Path(args.input), Path(args.output), args.duration))
        return 0
    if args.command == "validate-media":
        print_json(ffprobe(Path(args.path)))
        return 0
    if args.command == "validate-output":
        print_json(validate_output(Path(args.path), Path(args.validation_dir)))
        return 0
    if args.command == "submit-job":
        report = submit_job(
            Path(args.manifest),
            generation_profile=args.generation_profile,
            credential_profile=args.credential_profile,
            wait=args.wait,
            timeout=args.timeout,
            dry_run=args.dry_run,
        )
        print_json(report)
        return 0 if report.get("ok") else 1
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
