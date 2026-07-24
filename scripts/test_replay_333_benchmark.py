#!/usr/bin/env python3
import csv
import json
import subprocess
import tempfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("replay_333_benchmark.py")


def write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    copy_csv = root / "copy.csv"
    shot_csv = root / "shots.csv"
    pattern_json = root / "patterns.json"
    out_dir = root / "out"
    write_csv(
        copy_csv,
        ["文件名", "行业", "品牌", "产品或Campaign", "VO（旁白）", "字幕"],
        [
            {"文件名": "a.mp4", "行业": "家电", "品牌": "A", "产品或Campaign": "智能清洁", "VO（旁白）": "看不见的污渍也能清洁", "字幕": "智能清洁"},
            {"文件名": "b.mp4", "行业": "食品", "品牌": "B", "产品或Campaign": "好吃", "VO（旁白）": "【唱】B B B", "字幕": "好吃"},
        ],
    )
    write_csv(
        shot_csv,
        ["文件名", "镜头序号", "时间段", "TVC生成提示词"],
        [
            {"文件名": "a.mp4", "镜头序号": "1", "时间段": "00:00.00-00:02.00", "TVC生成提示词": "人物按下产品按钮，清洁路径显形。"},
            {"文件名": "a.mp4", "镜头序号": "2", "时间段": "00:02.00-00:05.00", "TVC生成提示词": "产品定格，A品牌收口。"},
            {"文件名": "b.mp4", "镜头序号": "1", "时间段": "00:00.00-00:05.00", "TVC生成提示词": "产品包装跟随音乐节拍跳动，LOGO收口。"},
        ],
    )
    pattern_json.write_text(
        json.dumps(
            {"operation_cards": [{"operation": "功能显形", "count": 1}, {"operation": "节拍化", "count": 1}]},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    completed = subprocess.run(
        [
            "python3", str(SCRIPT), "--copy-csv", str(copy_csv), "--shot-csv", str(shot_csv),
            "--pattern-json", str(pattern_json), "--out-dir", str(out_dir),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    summary = json.loads(completed.stdout)
    assert summary["case_count"] == 2
    assert summary["canonical_shot_count"] == 3
    assert summary["generalization_claim"] == "none; requires separate blind briefs"
    assert (out_dir / "copy_only_cases.jsonl").exists()
    assert (out_dir / "baseline_predictions.jsonl").exists()
    assert (out_dir / "canonical_signatures.jsonl").exists()
    assert (out_dir / "summary.md").exists()

print("test_replay_333_benchmark passed")
