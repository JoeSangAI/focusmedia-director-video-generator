#!/usr/bin/env python3
"""Verify that a generated video preserves the locked complete audio master."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", required=True, help="Locked audio master")
    parser.add_argument("--candidate", required=True, help="Generated video or audio to inspect")
    parser.add_argument("--out", help="Optional JSON report path")
    parser.add_argument("--sample-id", default="")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--sample-rate", type=int, default=8000)
    parser.add_argument("--max-lag-seconds", type=float, default=1.0)
    parser.add_argument("--min-correlation", type=float, default=0.90)
    parser.add_argument("--max-duration-delta", type=float, default=0.20)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def decode_audio(path: Path, ffmpeg: str, sample_rate: int) -> np.ndarray:
    command = [
        ffmpeg,
        "-v",
        "error",
        "-i",
        str(path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-f",
        "f32le",
        "pipe:1",
    ]
    result = subprocess.run(command, check=False, capture_output=True)
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"ffmpeg could not decode {path}: {message}")
    audio = np.frombuffer(result.stdout, dtype="<f4").astype(np.float64)
    if audio.size == 0:
        raise RuntimeError(f"No audio stream found in {path}")
    return audio


def aligned_pair(master: np.ndarray, candidate: np.ndarray, lag: int) -> tuple[np.ndarray, np.ndarray]:
    if lag >= 0:
        overlap = min(master.size, candidate.size - lag)
        return master[: max(overlap, 0)], candidate[lag : lag + max(overlap, 0)]
    overlap = min(master.size + lag, candidate.size)
    start = -lag
    return master[start : start + max(overlap, 0)], candidate[: max(overlap, 0)]


def normalized_correlation(left: np.ndarray, right: np.ndarray) -> float:
    if left.size < 2 or right.size < 2:
        return -1.0
    left = left - np.mean(left)
    right = right - np.mean(right)
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denominator <= 1e-12:
        return -1.0
    return float(np.dot(left, right) / denominator)


def rms_envelope(audio: np.ndarray, frame_size: int) -> np.ndarray:
    usable = (audio.size // frame_size) * frame_size
    if usable < frame_size * 10:
        raise RuntimeError("Audio is too short for a reliable comparison")
    framed = audio[:usable].reshape(-1, frame_size)
    return np.sqrt(np.mean(np.square(framed), axis=1) + 1e-12)


def find_best_lag(
    master: np.ndarray,
    candidate: np.ndarray,
    sample_rate: int,
    max_lag_seconds: float,
) -> tuple[int, float]:
    frame_size = max(1, round(sample_rate * 0.01))
    master_env = rms_envelope(master, frame_size)
    candidate_env = rms_envelope(candidate, frame_size)
    max_frame_lag = max(0, round(max_lag_seconds * sample_rate / frame_size))

    best_frame_lag = 0
    best_envelope_correlation = -1.0
    for frame_lag in range(-max_frame_lag, max_frame_lag + 1):
        left, right = aligned_pair(master_env, candidate_env, frame_lag)
        correlation = normalized_correlation(left, right)
        if correlation > best_envelope_correlation:
            best_envelope_correlation = correlation
            best_frame_lag = frame_lag

    coarse_lag = best_frame_lag * frame_size
    best_lag = coarse_lag
    best_waveform_correlation = -1.0
    for lag in range(coarse_lag - frame_size, coarse_lag + frame_size + 1):
        left, right = aligned_pair(master, candidate, lag)
        correlation = normalized_correlation(left, right)
        if correlation > best_waveform_correlation:
            best_waveform_correlation = correlation
            best_lag = lag

    return best_lag, best_waveform_correlation


def main() -> int:
    args = parse_args()
    master_path = Path(args.master).expanduser().resolve()
    candidate_path = Path(args.candidate).expanduser().resolve()
    if not master_path.is_file():
        raise FileNotFoundError(f"Master audio not found: {master_path}")
    if not candidate_path.is_file():
        raise FileNotFoundError(f"Candidate not found: {candidate_path}")

    master = decode_audio(master_path, args.ffmpeg, args.sample_rate)
    candidate = decode_audio(candidate_path, args.ffmpeg, args.sample_rate)
    master_duration = master.size / args.sample_rate
    candidate_duration = candidate.size / args.sample_rate
    duration_delta = abs(master_duration - candidate_duration)
    lag, correlation = find_best_lag(
        master,
        candidate,
        args.sample_rate,
        args.max_lag_seconds,
    )
    aligned_master, aligned_candidate = aligned_pair(master, candidate, lag)
    overlap_ratio = min(aligned_master.size, aligned_candidate.size) / max(master.size, candidate.size)

    issues: list[dict[str, object]] = []
    if duration_delta > args.max_duration_delta:
        issues.append(
            {
                "code": "locked_audio_duration_mismatch",
                "message": "Candidate duration does not match the locked audio master.",
                "observed_seconds": round(duration_delta, 4),
                "allowed_seconds": args.max_duration_delta,
            }
        )
    if correlation < args.min_correlation:
        issues.append(
            {
                "code": "locked_audio_content_mismatch",
                "message": "Candidate audio content does not match the locked audio master.",
                "observed_correlation": round(correlation, 6),
                "required_correlation": args.min_correlation,
            }
        )
    report = {
        "sample_id": args.sample_id,
        "status": "fail" if issues else "pass",
        "master": {
            "path": str(master_path),
            "sha256": sha256(master_path),
            "duration_seconds": round(master_duration, 4),
        },
        "candidate": {
            "path": str(candidate_path),
            "sha256": sha256(candidate_path),
            "duration_seconds": round(candidate_duration, 4),
        },
        "comparison": {
            "sample_rate": args.sample_rate,
            "best_lag_ms": round(lag * 1000 / args.sample_rate, 3),
            "waveform_correlation": round(correlation, 6),
            "duration_delta_seconds": round(duration_delta, 4),
            "overlap_ratio": round(overlap_ratio, 6),
            "min_correlation": args.min_correlation,
            "max_duration_delta_seconds": args.max_duration_delta,
        },
        "issues": issues,
    }

    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        out_path = Path(args.out).expanduser().resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(payload, encoding="utf-8")
    print(payload, end="")
    return 1 if issues else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "error", "message": str(error)}, ensure_ascii=False, indent=2))
        raise SystemExit(2)
