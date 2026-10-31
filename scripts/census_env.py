#!/usr/bin/env python3
"""Shared Census directory & CENSUS_API_KEY resolver for CityClick pipelines and audits.

- On production Linux where `data/census` resolves to `/opt/data/home/software/cityclick/data/census`,
  returns that directory untouched with zero network calls.
- On local macOS workstations where `data/census` is a dangling symlink, transparently falls back to
  gitignored `data/census-local/` and hydrates missing official Census files (`2023_Gaz_place_national.zip`,
  `popest.csv`, `23_b*.dat`, and optional `zbp22.zip`) directly from `api.census.gov` + `www2.census.gov`
  using `CENSUS_API_KEY` from the global Antigravity vault.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Dict, Optional

ROOT = Path(__file__).resolve().parent.parent
SERVER_CENSUS_DIR = ROOT / "data" / "census"
LOCAL_CENSUS_DIR = ROOT / "data" / "census-local"
GLOBAL_ENV_PATH = Path.home() / ".gemini" / "config" / ".env.global"
AG_SECRETS_BIN = Path.home() / ".local" / "bin" / "ag-secrets"

ACS_TABLES = ["b01003", "b19013", "b19301", "b25077", "b25064", "b01002", "b25103"]
GAZETTEER_URL = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_place_national.zip"
POPEST_URL = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/cities/totals/sub-est2023.csv"
ZBP_URL = "https://www2.census.gov/programs-surveys/cbp/datasets/2022/zbp22detail.zip"


def get_census_api_key() -> Optional[str]:
    if os.environ.get("CENSUS_API_KEY"):
        return os.environ["CENSUS_API_KEY"].strip()
    if GLOBAL_ENV_PATH.is_file():
        for line in GLOBAL_ENV_PATH.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("CENSUS_API_KEY="):
                return s.split("=", 1)[1].strip().strip('"').strip("'")
    if AG_SECRETS_BIN.is_file() and os.access(AG_SECRETS_BIN, os.X_OK):
        try:
            out = subprocess.check_output(
                [str(AG_SECRETS_BIN), "get", "CENSUS_API_KEY"],
                text=True,
                stderr=subprocess.DEVNULL,
                timeout=10,
            ).strip()
            if out:
                return out
        except Exception:
            pass
    return None


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "CityClick-Federal-Pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp, open(tmp, "wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    tmp.replace(dest)


def _fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "CityClick-Federal-Pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _hydrate_acs_tables(target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    key = get_census_api_key()
    key_param = f"&key={key}" if key else ""
    vars_csv = ",".join(f"{t.upper()}_001E" for t in ACS_TABLES)
    base = "https://api.census.gov/data/2023/acs/acs5"

    table_rows: Dict[str, Dict[str, str]] = {t: {} for t in ACS_TABLES}

    def ingest(rows, geoid_fn):
        header = rows[0]
        idx_map = {col: i for i, col in enumerate(header)}
        for row in rows[1:]:
            geoid = geoid_fn(row, idx_map)
            for t in ACS_TABLES:
                val = row[idx_map[f"{t.upper()}_001E"]]
                # Census API uses negative sentinel values like -666666666 for missing estimates
                if val is not None and not str(val).startswith("-666666"):
                    table_rows[t][geoid] = str(val)

    print("[census_env] Hydrating ACS 2023 5-Year tables via api.census.gov ...", file=sys.stderr)
    # 1. National total (0100000US)
    us_rows = _fetch_json(f"{base}?get={vars_csv}&for=us:1{key_param}")
    ingest(us_rows, lambda r, m: "0100000US")

    # 2. All U.S. Census Places across all states (1600000US{state}{place})
    place_rows = _fetch_json(f"{base}?get={vars_csv}&for=place:*&in=state:*{key_param}")
    ingest(place_rows, lambda r, m: f"1600000US{r[m['state']]}{r[m['place']]}")

    # 3. ZCTA population B01003_001E for ZIP business density denominator (860Z200US{zcta})
    zcta_rows = _fetch_json(f"{base}?get=B01003_001E&for=zip%20code%20tabulation%20area:*{key_param}")
    z_hdr = {col: i for i, col in enumerate(zcta_rows[0])}
    z_col = "zip code tabulation area"
    for row in zcta_rows[1:]:
        val = row[z_hdr["B01003_001E"]]
        if val is not None and not str(val).startswith("-666666"):
            table_rows["b01003"][f"860Z200US{row[z_hdr[z_col]]}"] = str(val)

    for t in ACS_TABLES:
        out_path = target_dir / f"23_{t}.dat"
        lines = [f"{gid}|{val}\n" for gid, val in sorted(table_rows[t].items())]
        out_path.write_text("".join(lines), encoding="utf-8")


def resolve_census_dir(
    need_acs: bool = False,
    need_popest: bool = False,
    need_gazetteer: bool = False,
    need_zbp: bool = False,
) -> str:
    """Return trailing-slash path to active Census data directory, hydrating local cache if needed."""
    if SERVER_CENSUS_DIR.is_dir():
        return str(SERVER_CENSUS_DIR) + "/"

    LOCAL_CENSUS_DIR.mkdir(parents=True, exist_ok=True)
    if need_gazetteer and not (LOCAL_CENSUS_DIR / "2023_Gaz_place_national.zip").is_file():
        print("[census_env] Downloading Census 2023 Places Gazetteer ...", file=sys.stderr)
        _download(GAZETTEER_URL, LOCAL_CENSUS_DIR / "2023_Gaz_place_national.zip")

    if need_popest and not (LOCAL_CENSUS_DIR / "popest.csv").is_file():
        print("[census_env] Downloading Census SUB-EST2023 municipal population estimates ...", file=sys.stderr)
        _download(POPEST_URL, LOCAL_CENSUS_DIR / "popest.csv")

    if need_acs and any(not (LOCAL_CENSUS_DIR / f"23_{t}.dat").is_file() for t in ACS_TABLES):
        _hydrate_acs_tables(LOCAL_CENSUS_DIR)

    if need_zbp and not (LOCAL_CENSUS_DIR / "zbp22.zip").is_file():
        print("[census_env] Downloading Census 2022 ZIP Code Business Patterns (zbp22detail.zip) ...", file=sys.stderr)
        _download(ZBP_URL, LOCAL_CENSUS_DIR / "zbp22.zip")

    return str(LOCAL_CENSUS_DIR) + "/"


if __name__ == "__main__":
    d = resolve_census_dir(
        need_acs=True,
        need_popest=True,
        need_gazetteer=True,
        need_zbp="--with-zbp" in sys.argv,
    )
    print(f"Census directory ready: {d}")
