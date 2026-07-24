#!/usr/bin/env python3
"""Protect the public skill package from provider prototypes and local clutter."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".md", ".json", ".csv", ".js", ".py", ".yaml", ".yml", ".gitignore"}
FORBIDDEN_PROVIDER_TERMS = ("pix" + "verse", "pixel" + "verse", "pai" + "-cli")
FORBIDDEN_FILES = {"README.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md", "CHANGELOG.md", ".DS_Store", ".env"}
FORBIDDEN_MEDIA_SUFFIXES = {".mp3", ".wav", ".m4a", ".mp4", ".mov"}
PERSONAL_PATH = re.compile("/" + "Users" + r"/[^/\s\"']+")


files = [path for path in ROOT.rglob("*") if path.is_file() and ".git" not in path.parts]
relative_files = {path.relative_to(ROOT).as_posix() for path in files}
required_capability_files = {
    "references/storyboard-execution.md",
    "references/doubao-audio-generation.md",
    "scripts/generate_doubao_audio.js",
    "scripts/generate_doubao_tts.js",
    "scripts/assert_storyboard_density.js",
    "scripts/seedance_job_adapter.py",
}
assert required_capability_files <= relative_files, "release package is missing a required end-to-end capability"

for path in files:
    relative = path.relative_to(ROOT)
    assert path.name not in FORBIDDEN_FILES, f"release-only file found: {relative}"
    assert path.suffix.lower() not in FORBIDDEN_MEDIA_SUFFIXES, f"generated media found: {relative}"
    assert path.stat().st_size <= 1_000_000, f"unexpected large file: {relative}"
    if path.suffix.lower() not in TEXT_SUFFIXES and path.name != ".gitignore":
        continue
    text = path.read_text(encoding="utf-8-sig")
    lowered = text.lower()
    for term in FORBIDDEN_PROVIDER_TERMS:
        assert term not in lowered, f"alternate-provider residue in {relative}"
    assert not PERSONAL_PATH.search(text), f"personal absolute path in {relative}"

for document in [ROOT / "SKILL.md", *(ROOT / "references").glob("*.md")]:
    document_text = document.read_text(encoding="utf-8")
    linked_paths = set(re.findall(r"`((?:references|scripts)/[^`\s]+)`", document_text))
    for linked_path in linked_paths:
        assert linked_path in relative_files, f"{document.name} points to missing file: {linked_path}"

print("test_release_package passed")
