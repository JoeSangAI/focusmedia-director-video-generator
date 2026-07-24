#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("assert_locked_audio.py")


def run(command: list[str], expected: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode != expected:
        raise AssertionError(result.stdout + result.stderr)
    return result


with tempfile.TemporaryDirectory(prefix="locked-audio-test-") as temp_dir:
    root = Path(temp_dir)
    master = root / "master.wav"
    different = root / "different.wav"
    matching_video = root / "matching.mp4"
    different_video = root / "different.mp4"
    pass_report = root / "pass.json"
    fail_report = root / "fail.json"

    run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000:duration=5", str(master)])
    run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=523:sample_rate=8000:duration=5", str(different)])
    run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x180:d=5", "-i", str(master), "-shortest", "-c:v", "mpeg4", "-c:a", "aac", str(matching_video)])
    run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=320x180:d=5", "-i", str(different), "-shortest", "-c:v", "mpeg4", "-c:a", "aac", str(different_video)])

    run([sys.executable, str(SCRIPT), "--master", str(master), "--candidate", str(matching_video), "--out", str(pass_report)])
    run([sys.executable, str(SCRIPT), "--master", str(master), "--candidate", str(different_video), "--out", str(fail_report)], expected=1)

    assert json.loads(pass_report.read_text())["status"] == "pass"
    failed = json.loads(fail_report.read_text())
    assert failed["status"] == "fail"
    assert any(issue["code"] == "locked_audio_content_mismatch" for issue in failed["issues"])

print("test_assert_locked_audio passed")
