#!/usr/bin/env python3
import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).with_name("check_environment.py")
SPEC = importlib.util.spec_from_file_location("check_environment", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

assert MODULE.parse_version("v18.20.1") == (18, 20, 1)
assert MODULE.parse_version("zxz 0.2.0") == (0, 2, 0)
assert MODULE.parse_version("unknown") == ()

report = MODULE.build_report()
assert isinstance(report["ok"], bool)
assert {item["name"] for item in report["checks"]} >= {
    "python3",
    "node",
    "ffmpeg",
    "ffprobe",
    "zxz",
    "numpy",
    "doubao_audio_credentials",
}
assert all("value" not in item for item in report["checks"])

print("test_check_environment passed")
