#!/usr/bin/env python3
"""Seedance/众小智 local generation adapter.

This script creates submission packages and validation artifacts. It does not
perform live remote 众小智 submission without an explicit API contract.
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


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def slugify(value: str, fallback: str = "seedance-job") -> str:
    value = (value or "").strip() or fallback
    value = re.sub(r"[\\/:*?\"<>|#%&{}$!'@+=`~\s]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value[:80] or fallback


def read_payload(path: str) -> dict:
    return json.loads(Path(path).expanduser().read_text(encoding="utf-8"))


def split_lines(value: str) -> list[str]:
    lines = []
    for part in re.split(r"[\n；;]+", value or ""):
        text = part.strip()
        if text:
            lines.append(text)
    return lines


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
    try:
        parsed = json.loads(result["stdout"] or "{}")
    except json.JSONDecodeError:
        parsed = {}
    return {"ok": True, "path": str(path), "probe": parsed}


def build_audio_reference_prompt(payload: dict) -> str:
    product_name = payload.get("productName") or payload.get("slogan") or "产品"
    duration = str(payload.get("duration") or "15")
    aspect_ratio = payload.get("aspectRatio") or "16:9"
    resolution = payload.get("resolution") or "720p"
    visual_style = payload.get("visualStyle") or "分众电梯TVC广告风，产品清楚、节奏紧凑、品牌落版明确。"
    video_prompt = payload.get("videoPrompt") or visual_style
    audio_prompt = payload.get("audioPrompt") or "保留 @Audio 1 中的完整广告音频、旁白节奏、停顿、重音、BGM、音效和最后品牌落版。"
    forbidden = payload.get("forbidden") or "二维码、价格、电商按钮、随机英文、竞品、水印、来源标识。"
    voice_lines = split_lines(payload.get("voiceoverLines") or payload.get("slogan") or "")
    line_block = "\n".join(f"{index}. {line}" for index, line in enumerate(voice_lines, start=1)) or "1. [请补充完整台词顺序]"
    timeline = payload.get("timeline") or (
        "00:00-00:03 以 @Audio 1 开场重音为准，建立产品与核心场景。\n"
        "00:03-00:07 跟随 @Audio 1 的节奏展示产品利益点和关键视觉动作。\n"
        "00:07-00:11 产品正面清楚出现，画面服务广告语记忆，不要生成逐字字幕。\n"
        "00:11-00:15 跟随 @Audio 1 的最后重音完成品牌落版，产品和品牌名稳定停留。"
    )
    brand_context = payload.get("brandContext") or ""
    context_block = f"\n品牌/产品事实：{brand_context}\n" if brand_context.strip() else ""
    return f"""生成一支 {duration} 秒、{aspect_ratio}、{resolution} 的{product_name}广告，{visual_style}

参考输入优先级：
1. @Audio 1 是最高优先级，是完整成片音频参考。视频节奏、镜头切点、人物开口、停顿、重音、BGM、音效和最后品牌落版，都必须严格跟随 @Audio 1。不要重新设计另一版配音，不要改写台词，不要漏字，不要重复，不要换口音。
2. @Image 1 是产品图参考。必须参考 @Image 1 的产品外观、包装、比例和品牌识别。画面中产品要多次正面清楚出现。
{context_block}
声音要求：{audio_prompt}

必须完整保留以下台词顺序：
{line_block}

画面风格：{video_prompt}

画面结构必须贴合 @Audio 1 的声音节奏：
{timeline}

屏幕文字策略：{payload.get("screenText") or "只保留少量有记忆点的大字，不要生成逐字字幕，不要把所有旁白写到屏幕上。"}

不要出现{forbidden}
"""


def build_image_only_prompt(payload: dict) -> str:
    product_name = payload.get("productName") or payload.get("slogan") or "产品"
    duration = str(payload.get("duration") or "15")
    aspect_ratio = payload.get("aspectRatio") or "16:9"
    resolution = payload.get("resolution") or "720p"
    visual_style = payload.get("visualStyle") or "分众电梯TVC广告风，产品清楚、节奏紧凑、品牌落版明确。"
    video_prompt = payload.get("videoPrompt") or visual_style
    voice_prompt = payload.get("audioPrompt") or (
        "使用有感染力的中文广告旁白，语气有抑扬顿挫、停顿、重音和广告冲击力，最后一句要像电梯里能被记住的广告收口。"
    )
    forbidden = payload.get("forbidden") or "二维码、价格、电商按钮、随机英文、竞品、水印、来源标识。"
    voice_lines = split_lines(payload.get("voiceoverLines") or payload.get("slogan") or "")
    line_block = "\n".join(f"【旁白】{line}" for line in voice_lines) or "【旁白】[请补充完整台词顺序]"
    timeline = payload.get("timeline") or (
        "00:00-00:02：建立核心场景和产品第一眼，旁白低沉开场，屏幕只出现最大记忆大字。\n"
        "00:02-00:04：产品与核心原料或利益点绑定，产品包装正面清楚出现。\n"
        "00:04-00:06.5：进入工艺、技术或信任证明，屏幕大字短而有力。\n"
        "00:06.5-00:08.5：制造冲突或选择理由，旁白短促有力，画面动作清楚。\n"
        "00:08.5-00:11：产品利益转为感官或结果证明，产品名和关键卖点落地。\n"
        "00:11-00:12.5：情绪确认或信任背书，节奏收紧。\n"
        "00:12.5-00:15：产品、品牌和最终广告语落版，最后一句要有号召力。"
    )
    brand_context = payload.get("brandContext") or ""
    context_block = f"\n品牌/产品事实：{brand_context}\n" if brand_context.strip() else ""
    return f"""请直接调用 Seedance / AI 视频 2.0 生成视频，不要生成九宫格、不要生成分镜故事板、不要生成参考图、不要改写或摘要提示词。使用当前已保存参数：Duration={duration}秒，横版{aspect_ratio}，{resolution}。

生成一支 {duration} 秒横版 {aspect_ratio} 的{product_name}广告。

参考输入优先级：
1. @Image 1 是产品图参考，必须参考 @Image 1 的产品外观、包装、比例、标签颜色和品牌识别。产品图是必选约束，画面中产品要多次正面清楚出现。
2. 本策略不上传 @Audio。VO、BGM 和音效由 Seedance 根据下方声音要求和完整旁白直接生成，所以台词、重音、停顿、情绪和发音必须严格按提示词执行。
{context_block}
声音要求：
{voice_prompt}

口播文案必须完整、按顺序生成，不要漏字、不要改写、不要重复：
{line_block}

画面风格：
{video_prompt}

时间轴：
{timeline}

屏幕文字策略：{payload.get("screenText") or "屏幕大字少而重，只保留品牌名、核心卖点和最终广告语；不要把全部旁白做成逐字字幕。"}

不要出现{forbidden}
"""


def build_video_prompt(payload: dict) -> tuple[str, str, str]:
    strategy = payload.get("strategy") or "image_audio"
    if strategy == "image_only":
        return build_image_only_prompt(payload), "Product image + strong VO prompt", "seedance_image_only_prompt.md"
    return build_audio_reference_prompt(payload), "Product image + audio reference", "seedance_image_audio_prompt.md"


def copy_if_exists(source_value: str, target_dir: Path) -> dict:
    source = Path(source_value).expanduser() if source_value else None
    if not source or not source.exists():
        return {"copied": False, "source": source_value or "", "target": "", "reason": "source_missing"}
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / source.name
    shutil.copy2(source, target)
    return {"copied": True, "source": str(source), "target": str(target)}


def create_job(payload: dict, out_root: Path) -> dict:
    suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
    root = out_root.expanduser() / f"{slugify(payload.get('jobName') or payload.get('productName') or payload.get('slogan'))}-{suffix}"
    dirs = {
        "audio": root / "audio",
        "image": root / "image",
        "prompt": root / "prompt",
        "seedanceOutput": root / "seedance-output",
        "validation": root / "validation",
    }
    for directory in dirs.values():
        directory.mkdir(parents=True, exist_ok=True)
    prompt, label, prompt_file = build_video_prompt(payload)
    prompt_path = dirs["prompt"] / prompt_file
    prompt_path.write_text(prompt, encoding="utf-8")
    strategy = payload.get("strategy") or "image_audio"
    copied_image = copy_if_exists(payload.get("productImagePath", ""), dirs["image"])
    copied_audio = copy_if_exists(payload.get("audioPath", ""), dirs["audio"]) if strategy != "image_only" else {
        "copied": False,
        "source": "",
        "target": "",
        "reason": "strategy_does_not_use_audio",
    }
    audio_steps = (
        "- [ ] 再上传精修音频，确认输入区出现 WAV/音频文件名。\n"
        "- [ ] 提示词包含 `@Audio 1 是最高优先级，是完整成片音频参考`。\n"
    ) if strategy != "image_only" else (
        "- [ ] 不上传音频文件。\n"
        "- [ ] 提示词已经逐句写明完整旁白、声音人设、重音、停顿、情绪、收口和发音提示。\n"
    )
    checklist = f"""# Seedance / 众小智提交清单

- [ ] 打开干净新对话，不沿用历史失败任务。
- [ ] 模型切换为 `众小智-AI视频2.0`。
- [ ] 先上传产品图，确认输入区出现图片预览。
{audio_steps}- [ ] 再粘贴 `prompt/{prompt_file}`。
- [ ] 不上传旧视频，除非明确复刻旧视频画面。
- [ ] 生成后下载 mp4 到 `seedance-output/`。
- [ ] 运行 `validate-output` 做 ffprobe 与 contact sheet 校验。
"""
    checklist_path = root / "submit_checklist.md"
    checklist_path.write_text(checklist, encoding="utf-8")
    manifest = {
        "createdAt": now_stamp(),
        "strategy": strategy,
        "strategyLabel": label,
        "jobRoot": str(root),
        "inputs": payload,
        "copiedAssets": {"image": copied_image, "audio": copied_audio},
        "files": {
            "prompt": str(prompt_path),
            "checklist": str(checklist_path),
            "audioDir": str(dirs["audio"]),
            "imageDir": str(dirs["image"]),
            "seedanceOutputDir": str(dirs["seedanceOutput"]),
            "validationDir": str(dirs["validation"]),
        },
    }
    manifest_path = root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "jobRoot": str(root), "prompt": prompt, "manifestPath": str(manifest_path), "manifest": manifest}


def build_audio_generation_prompt(payload: dict) -> tuple[str, str]:
    provider = payload.get("audioProvider") or "doubao"
    provider_label = "Doubao-Seed-Audio" if provider == "doubao" else "MiniMax Audio / TTS"
    product_name = payload.get("productName") or payload.get("slogan") or "产品"
    voiceover = payload.get("voiceoverLines") or payload.get("slogan") or ""
    prompt = f"""生成一条严格 15 秒的中文广告完整音频。

音频模型：{provider_label}
产品：{product_name}

生成要求：
- 必须严格控制在 15 秒内，不要生成 20 秒、30 秒或更长版本。
- 旁白必须清楚、完整、按顺序，不要漏字、改字、重复。
- 情绪要适合分众电梯广告：节奏紧凑，有记忆点，最后品牌或广告语要有落锤感。
- 可加入 BGM 和少量音效，但旁白清晰度优先。

品牌/产品信息：
{payload.get("brandContext") or "暂无补充信息"}

声音风格：
{payload.get("audioPrompt") or "有感染力的中文广告旁白，重音清楚，停顿明确，最后收口有广告冲击力。"}

完整台词：
{voiceover or "[请补充完整台词]"}
"""
    return prompt, provider_label


def create_audio_job(payload: dict, out_root: Path) -> dict:
    suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
    root = out_root.expanduser() / f"{slugify(payload.get('jobName') or payload.get('productName') or payload.get('slogan'), 'audio-job')}-{suffix}"
    root.mkdir(parents=True, exist_ok=True)
    prompt, provider_label = build_audio_generation_prompt(payload)
    provider = payload.get("audioProvider") or "doubao"
    prompt_path = root / f"{provider}_audio_prompt.md"
    prompt_path.write_text(prompt, encoding="utf-8")
    checklist = f"""# {provider_label} 音频生成提交清单

- [ ] 打开对应音频生成页面或 API 调用环境。
- [ ] 粘贴 `{prompt_path.name}` 的完整内容。
- [ ] 确认输出严格 15 秒。
- [ ] 试听旁白是否完整、重音是否清楚、尾句是否有收口。
- [ ] 下载音频到本目录或稳定路径。
- [ ] 如尾部有无关声音，运行 `prepare-audio` 清理。
- [ ] 将精修音频作为 `@Audio 1` 用于视频生成任务。
"""
    checklist_path = root / "audio_submit_checklist.md"
    checklist_path.write_text(checklist, encoding="utf-8")
    manifest = {"createdAt": now_stamp(), "provider": provider, "providerLabel": provider_label, "inputs": payload, "files": {"prompt": str(prompt_path), "checklist": str(checklist_path)}}
    manifest_path = root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "jobRoot": str(root), "prompt": prompt, "manifestPath": str(manifest_path), "manifest": manifest}


def prepare_audio(input_path: Path, output_path: Path, duration: float, fade_duration: float) -> dict:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fade_start = max(duration - fade_duration, 0)
    result = run_command(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path.expanduser()),
            "-t",
            f"{duration:.3f}",
            "-af",
            f"afade=t=out:st={fade_start:.3f}:d={fade_duration:.3f}",
            str(output_path.expanduser()),
        ]
    )
    probe = ffprobe(output_path.expanduser()) if output_path.expanduser().exists() else {"ok": False}
    return {"ok": result["ok"], "outputPath": str(output_path.expanduser()), "command": result, "probe": probe}


def validate_output(path: Path, validation_dir: Path) -> dict:
    path = path.expanduser()
    validation_dir = validation_dir.expanduser()
    validation_dir.mkdir(parents=True, exist_ok=True)
    contact_sheet = validation_dir / f"{path.stem}_contact_sheet.jpg"
    probe = ffprobe(path)
    contact_result = run_command(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(path),
            "-vf",
            "fps=1,scale=320:-1,tile=5x3",
            "-frames:v",
            "1",
            str(contact_sheet),
        ]
    )
    report = {
        "ok": probe.get("ok", False) and contact_result["ok"],
        "checkedAt": now_stamp(),
        "outputPath": str(path),
        "probe": probe,
        "contactSheet": str(contact_sheet) if contact_sheet.exists() else "",
        "contactSheetCommand": contact_result,
    }
    report_path = validation_dir / f"{path.stem}_validation.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    report["reportPath"] = str(report_path)
    return report


def write_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        payload_path = tmp_path / "payload.json"
        payload_path.write_text(
            json.dumps(
                {
                    "jobName": "adapter-test",
                    "strategy": "image_only",
                    "productName": "测试产品",
                    "slogan": "测试广告语。",
                    "voiceoverLines": "测试广告语。\n测试品牌。",
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        payload = read_payload(str(payload_path))
        job = create_job(payload, tmp_path / "jobs")
        if not Path(job["manifestPath"]).exists():
            raise AssertionError("manifest not created")
        audio = create_audio_job(payload, tmp_path / "audio-jobs")
        if not Path(audio["manifestPath"]).exists():
            raise AssertionError("audio manifest not created")
    print("seedance_job_adapter self-test passed")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    subparsers = parser.add_subparsers(dest="command")

    build_parser = subparsers.add_parser("build-prompt")
    build_parser.add_argument("--payload", required=True)
    build_parser.add_argument("--out")

    job_parser = subparsers.add_parser("create-job")
    job_parser.add_argument("--payload", required=True)
    job_parser.add_argument("--out-root", required=True)

    audio_job_parser = subparsers.add_parser("audio-job")
    audio_job_parser.add_argument("--payload", required=True)
    audio_job_parser.add_argument("--out-root", required=True)

    prepare_parser = subparsers.add_parser("prepare-audio")
    prepare_parser.add_argument("--input", required=True)
    prepare_parser.add_argument("--output", required=True)
    prepare_parser.add_argument("--duration", type=float, default=15.0)
    prepare_parser.add_argument("--fade-duration", type=float, default=0.015)

    media_parser = subparsers.add_parser("validate-media")
    media_parser.add_argument("--path", required=True)

    output_parser = subparsers.add_parser("validate-output")
    output_parser.add_argument("--path", required=True)
    output_parser.add_argument("--validation-dir", required=True)

    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    if args.command == "build-prompt":
        payload = read_payload(args.payload)
        prompt, label, _ = build_video_prompt(payload)
        if args.out:
            Path(args.out).expanduser().parent.mkdir(parents=True, exist_ok=True)
            Path(args.out).expanduser().write_text(prompt, encoding="utf-8")
        write_json({"ok": True, "strategyLabel": label, "prompt": prompt})
        return 0
    if args.command == "create-job":
        write_json(create_job(read_payload(args.payload), Path(args.out_root)))
        return 0
    if args.command == "audio-job":
        write_json(create_audio_job(read_payload(args.payload), Path(args.out_root)))
        return 0
    if args.command == "prepare-audio":
        write_json(prepare_audio(Path(args.input), Path(args.output), args.duration, args.fade_duration))
        return 0
    if args.command == "validate-media":
        write_json(ffprobe(Path(args.path).expanduser()))
        return 0
    if args.command == "validate-output":
        write_json(validate_output(Path(args.path), Path(args.validation_dir)))
        return 0
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
