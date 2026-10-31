#!/usr/bin/env python3
"""Regenerate public/reports/austin_dossier_print.html from src/data/cities/tx.json and render public/reports/tx-austin-feasibility-dossier.pdf via headless Google Chrome."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from generate_austin_dossier_html import BANNED_SUBSTRINGS, generate_html

ROOT = Path(__file__).resolve().parent.parent
OUT_PDF_PATH = ROOT / "public" / "reports" / "tx-austin-feasibility-dossier.pdf"
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("google-chrome") or "",
    shutil.which("chromium") or "",
]


def find_chrome() -> str:
    for cand in CHROME_CANDIDATES:
        if cand and Path(cand).exists():
            return cand
    raise FileNotFoundError("Google Chrome binary not found on this machine.")


def build_pdf() -> Path:
    html_path = generate_html()
    chrome_bin = find_chrome()
    OUT_PDF_PATH.parent.mkdir(parents=True, exist_ok=True)

    tmp_profile = tempfile.mkdtemp(prefix="cityclick-pdf-chrome-")
    try:
        cmd = [
            chrome_bin,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--user-data-dir={tmp_profile}",
            f"--print-to-pdf={OUT_PDF_PATH}",
            html_path.resolve().as_uri(),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    finally:
        shutil.rmtree(tmp_profile, ignore_errors=True)

    if not OUT_PDF_PATH.exists() or OUT_PDF_PATH.stat().st_size < 10_000:
        raise RuntimeError(f"PDF generation failed or produced unexpectedly small file: {OUT_PDF_PATH}")

    raw_bytes = OUT_PDF_PATH.read_bytes()
    for banned in BANNED_SUBSTRINGS:
        if banned.encode("utf-8") in raw_bytes:
            raise AssertionError(f"Generated PDF raw bytes contain banned substring: {banned!r}")

    print(f"Rendered {OUT_PDF_PATH} ({OUT_PDF_PATH.stat().st_size:,} bytes)")
    return OUT_PDF_PATH


if __name__ == "__main__":
    try:
        build_pdf()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
