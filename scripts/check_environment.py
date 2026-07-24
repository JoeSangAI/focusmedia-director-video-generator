#!/usr/bin/env python3
"""Check local prerequisites without printing or transmitting secrets."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def parse_version(text: str) -> tuple[int, ...]:
    match = re.search(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?", text)
    if not match:
        return ()
    return tuple(int(value or 0) for value in match.groups())


def command_check(
    name: str,
    version_args: list[str],
    minimum: tuple[int, ...] | None,
    action: str,
) -> dict[str, Any]:
    executable = shutil.which(name)
    if not executable:
        return {
            "name": name,
            "required": True,
            "ok": False,
            "detail": "command not found",
            "action": action,
        }
    try:
        result = subprocess.run(
            [executable, *version_args],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "name": name,
            "required": True,
            "ok": False,
            "detail": str(error),
            "action": action,
        }
    detail = (result.stdout or result.stderr).strip().splitlines()
    version_text = detail[0] if detail else f"exit {result.returncode}"
    parsed = parse_version(version_text)
    ok = result.returncode == 0 and (minimum is None or parsed >= minimum)
    return {
        "name": name,
        "required": True,
        "ok": ok,
        "detail": version_text,
        "action": "" if ok else action,
    }


def secret_is_configured(variable: str) -> tuple[bool, str]:
    if os.environ.get(variable):
        return True, "environment variable"
    configured_path = os.environ.get("FOCUSMEDIA_AI_PROVIDER_ENV")
    env_path = Path(configured_path).expanduser() if configured_path else Path.home() / ".config" / "joe" / "secrets" / "ai-providers.env"
    if not env_path.is_file():
        return False, str(env_path)
    pattern = re.compile(rf"^\s*{re.escape(variable)}\s*=\s*(.+?)\s*$")
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            match = pattern.match(line)
            if match and match.group(1).strip().strip("\"'"):
                return True, str(env_path)
    except OSError:
        pass
    return False, str(env_path)


def build_report() -> dict[str, Any]:
    checks: list[dict[str, Any]] = [
        {
            "name": "python3",
            "required": True,
            "ok": sys.version_info >= (3, 9),
            "detail": sys.version.split()[0],
            "action": "" if sys.version_info >= (3, 9) else "Install Python 3.9 or newer.",
        },
        command_check("node", ["--version"], (18, 0), "Install Node.js 18 or newer."),
        command_check("ffmpeg", ["-version"], None, "Install ffmpeg, including ffprobe."),
        command_check("ffprobe", ["-version"], None, "Install ffmpeg, including ffprobe."),
        command_check(
            "zxz",
            ["--version"],
            (0, 2, 0),
            "Ask the project owner for the internal zhongxiaozhi-cli package, install it, and rerun this check.",
        ),
    ]
    numpy_ok = importlib.util.find_spec("numpy") is not None
    checks.append(
        {
            "name": "numpy",
            "required": True,
            "ok": numpy_ok,
            "detail": "available" if numpy_ok else "Python module not found",
            "action": "" if numpy_ok else "Run: python3 -m pip install numpy",
        }
    )
    audio_key_ok, audio_key_source = secret_is_configured("VOLCENGINE_DOUBAO_AUDIO_API_KEY")
    checks.append(
        {
            "name": "doubao_audio_credentials",
            "required": False,
            "ok": audio_key_ok,
            "detail": f"configured via {audio_key_source}" if audio_key_ok else "not configured; only needed for generated audio",
            "action": "" if audio_key_ok else "Configure VOLCENGINE_DOUBAO_AUDIO_API_KEY only when the selected route needs generated audio.",
        }
    )
    required_ok = all(item["ok"] for item in checks if item["required"])
    return {
        "ok": required_ok,
        "checks": checks,
        "next_actions": [item["action"] for item in checks if not item["ok"] and item["action"]],
    }


def print_text(report: dict[str, Any]) -> None:
    print(f"FocusMedia TVC environment: {'READY' if report['ok'] else 'BLOCKED'}")
    for item in report["checks"]:
        marker = "OK" if item["ok"] else ("OPTIONAL" if not item["required"] else "MISSING")
        print(f"[{marker}] {item['name']}: {item['detail']}")
    if report["next_actions"]:
        print("Next actions:")
        for action in report["next_actions"]:
            print(f"- {action}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    args = parser.parse_args()
    report = build_report()
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_text(report)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
