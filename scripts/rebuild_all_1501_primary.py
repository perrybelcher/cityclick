#!/usr/bin/env python3
"""Bulk primary-source rebuild & federal enrichment pipeline for ALL 1,501 CityClick cities.

Rebuilds all non-flagship cities (preserving the 25 already-certified flagships intact) using
100% official zero-hallucination federal & state primary datasets:
  1. Census 2023 Gazetteer (official Place coordinates & legal name normalization; fixes 56 V1 truncated slugs)
  2. Census SUB-EST2023 (SUMLEV=162 municipal pop & 2020-2023 change; SUMLEV=157+050 official Place-to-County)
  3. Census ACS 2023 5-Year (B01003, B19013, B19301, B01002, B25077, B25064, B25103 property tax)
  4. Census 2022 ZBP + ACS 2023 ZCTA + Census 2020 ZCTA5-to-Place relationship file (small-business density)
  5. OurAirports (scheduled US commercial airports + Haversine distance from Census Gazetteer internal point)
  6. Open-Meteo Historical Weather API (ERA5 2015-2024 10-year averages + IANA timezone, 25-city batches)
  7. CMS Care Compare xubh-q36u (hospitals with emergency_services='Yes'; city limits or disclosed county scope)
  8. U.S. EPA SDWIS (active Community Water Systems; strict >=50% pop unambiguity rule, omitted when ambiguous)
  9. U.S. Dept. of Education College Scorecard (operating degree/certificate institutions)
 10. U.S. DOE / NLR AFDC (public EV charging stations, DC fast & Level 2 ports)
 11. U.S. National Park Service (NPS units within 55.0 miles Haversine across all state borders)
 12. sources/sales-tax.json ONLY for permitsAndTax (purges unverified V1 permitsAndTax everywhere else)

Strictly enforces CityClick's Prime Directive and scripts/qa.ts BANNED_PHRASES.
Zero Google Places API calls. Zero Zip-Tax API calls. Zero raw secrets logged or persisted.
"""
from __future__ import annotations

import collections
import concurrent.futures
import csv
import datetime
import json
import math
import os
import re
import sqlite3
import statistics
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from census_env import resolve_census_dir  # noqa: E402
import enrich_city  # noqa: E402
from enrich_flagship_plus import (  # noqa: E402
    CITY_CONFIGS as FLAGSHIP_CONFIGS,
    contains_banned_phrase,
    normalize_hospital_name,
    normalize_hospital_type,
    normalize_https_url,
    normalize_street_address,
    sanitize_dashes,
    truncate_clean,
)

TODAY = datetime.date.today().isoformat()
VERIFIED_AT = f"{TODAY}T00:00:00Z"
BULK_CACHE_DIR = ROOT / "data" / "cache" / "federal_bulk"
CITIES_DIR = ROOT / "src" / "data" / "cities"
SLUG_MIGRATIONS_PATH = SCRIPT_DIR / "slug_migrations.json"
VAULT_PATH = Path("/Users/perry/.gemini/config/.env.global")
AG_SECRETS_BIN = Path("/Users/perry/.local/bin/ag-secrets")
SQLITE_CACHE_DB = Path("/Users/perry/.gemini/cache/api_cache.sqlite")

CERTIFIED_FLAGSHIP_SLUGS: Set[str] = set(FLAGSHIP_CONFIGS.keys())

OWNERSHIP_LABELS = {
    1: "Public",
    2: "Private nonprofit",
    3: "Private for-profit",
}

ALL_STATES_51 = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
    "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
    "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
    "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

# Explicit display-name & slug overrides for non-flagship special Census Place names
EXPLICIT_GAZETTEER_OVERRIDES: Dict[Tuple[str, str], Tuple[str, str]] = {
    ("ak", "Juneau city and borough"): ("Juneau", "ak/juneau"),
    ("ca", "San Buenaventura (Ventura) city"): ("Ventura", "ca/ventura"),
    ("ca", "El Paso de Robles (Paso Robles) city"): ("Paso Robles", "ca/paso-robles"),
    ("ga", "Macon-Bibb County"): ("Macon", "ga/macon"),
    ("hi", "Urban Honolulu CDP"): ("Honolulu", "hi/honolulu"),
    ("il", "Elk Grove Village village"): ("Elk Grove Village", "il/elk-grove-village"),
    ("ky", "Lexington-Fayette urban county"): ("Lexington", "ky/lexington"),
    ("nv", "Carson City"): ("Carson City", "nv/carson-city"),
    ("ut", "Kearns metro township"): ("Kearns", "ut/kearns"),
    ("ut", "Magna metro township"): ("Magna", "ut/magna"),
}

IANA_TZ_MAP: Dict[str, Tuple[str, str]] = {
    "America/New_York": ("ET", "-05:00"),
    "America/Detroit": ("ET", "-05:00"),
    "America/Indiana/Indianapolis": ("ET", "-05:00"),
    "America/Indiana/Marengo": ("ET", "-05:00"),
    "America/Indiana/Petersburg": ("ET", "-05:00"),
    "America/Indiana/Vevay": ("ET", "-05:00"),
    "America/Indiana/Vincennes": ("ET", "-05:00"),
    "America/Indiana/Winamac": ("ET", "-05:00"),
    "America/Kentucky/Louisville": ("ET", "-05:00"),
    "America/Kentucky/Monticello": ("ET", "-05:00"),
    "America/Chicago": ("CT", "-06:00"),
    "America/Indiana/Knox": ("CT", "-06:00"),
    "America/Indiana/Tell_City": ("CT", "-06:00"),
    "America/Menominee": ("CT", "-06:00"),
    "America/North_Dakota/Center": ("CT", "-06:00"),
    "America/North_Dakota/New_Salem": ("CT", "-06:00"),
    "America/North_Dakota/Beulah": ("CT", "-06:00"),
    "America/Denver": ("MT", "-07:00"),
    "America/Boise": ("MT", "-07:00"),
    "America/Phoenix": ("MST", "-07:00"),
    "America/Los_Angeles": ("PT", "-08:00"),
    "America/Anchorage": ("AKT", "-09:00"),
    "America/Juneau": ("AKT", "-09:00"),
    "America/Sitka": ("AKT", "-09:00"),
    "America/Metlakatla": ("AKT", "-09:00"),
    "America/Yakutat": ("AKT", "-09:00"),
    "America/Nome": ("AKT", "-09:00"),
    "Pacific/Honolulu": ("HST", "-10:00"),
}

STATE_FALLBACK_TZ: Dict[str, Tuple[str, str, str]] = {
    "CT": ("America/New_York", "ET", "-05:00"),
    "DC": ("America/New_York", "ET", "-05:00"),
    "DE": ("America/New_York", "ET", "-05:00"),
    "FL": ("America/New_York", "ET", "-05:00"),
    "GA": ("America/New_York", "ET", "-05:00"),
    "IN": ("America/Indiana/Indianapolis", "ET", "-05:00"),
    "KY": ("America/Kentucky/Louisville", "ET", "-05:00"),
    "MA": ("America/New_York", "ET", "-05:00"),
    "MD": ("America/New_York", "ET", "-05:00"),
    "ME": ("America/New_York", "ET", "-05:00"),
    "MI": ("America/Detroit", "ET", "-05:00"),
    "NC": ("America/New_York", "ET", "-05:00"),
    "NH": ("America/New_York", "ET", "-05:00"),
    "NJ": ("America/New_York", "ET", "-05:00"),
    "NY": ("America/New_York", "ET", "-05:00"),
    "OH": ("America/New_York", "ET", "-05:00"),
    "PA": ("America/New_York", "ET", "-05:00"),
    "RI": ("America/New_York", "ET", "-05:00"),
    "SC": ("America/New_York", "ET", "-05:00"),
    "VA": ("America/New_York", "ET", "-05:00"),
    "VT": ("America/New_York", "ET", "-05:00"),
    "WV": ("America/New_York", "ET", "-05:00"),
    "AL": ("America/Chicago", "CT", "-06:00"),
    "AR": ("America/Chicago", "CT", "-06:00"),
    "IA": ("America/Chicago", "CT", "-06:00"),
    "IL": ("America/Chicago", "CT", "-06:00"),
    "KS": ("America/Chicago", "CT", "-06:00"),
    "LA": ("America/Chicago", "CT", "-06:00"),
    "MN": ("America/Chicago", "CT", "-06:00"),
    "MO": ("America/Chicago", "CT", "-06:00"),
    "MS": ("America/Chicago", "CT", "-06:00"),
    "ND": ("America/Chicago", "CT", "-06:00"),
    "NE": ("America/Chicago", "CT", "-06:00"),
    "OK": ("America/Chicago", "CT", "-06:00"),
    "SD": ("America/Chicago", "CT", "-06:00"),
    "TN": ("America/Chicago", "CT", "-06:00"),
    "TX": ("America/Chicago", "CT", "-06:00"),
    "WI": ("America/Chicago", "CT", "-06:00"),
    "AZ": ("America/Phoenix", "MST", "-07:00"),
    "CO": ("America/Denver", "MT", "-07:00"),
    "ID": ("America/Boise", "MT", "-07:00"),
    "MT": ("America/Denver", "MT", "-07:00"),
    "NM": ("America/Denver", "MT", "-07:00"),
    "UT": ("America/Denver", "MT", "-07:00"),
    "WY": ("America/Denver", "MT", "-07:00"),
    "CA": ("America/Los_Angeles", "PT", "-08:00"),
    "NV": ("America/Los_Angeles", "PT", "-08:00"),
    "OR": ("America/Los_Angeles", "PT", "-08:00"),
    "WA": ("America/Los_Angeles", "PT", "-08:00"),
    "AK": ("America/Anchorage", "AKT", "-09:00"),
    "HI": ("Pacific/Honolulu", "HST", "-10:00"),
}

# Exact County-FIPS overrides for US states split across two time zones
COUNTY_TZ_OVERRIDES: Dict[str, Tuple[str, str, str]] = {
    # Alaska (Southeast panhandle)
    "02110": ("America/Juneau", "AKT", "-09:00"),
    "02130": ("America/Juneau", "AKT", "-09:00"),
    "02220": ("America/Sitka", "AKT", "-09:00"),
    # Florida panhandle west of Apalachicola River (Central Time)
    **{f"12{c}": ("America/Chicago", "CT", "-06:00") for c in ("005", "013", "033", "045", "059", "063", "091", "113", "131", "133")},
    # Idaho northern panhandle (Pacific Time)
    **{f"16{c}": ("America/Los_Angeles", "PT", "-08:00") for c in ("009", "017", "021", "035", "049", "055", "057", "061", "069", "079")},
    # Indiana NW & SW counties (Central Time)
    **{f"18{c}": ("America/Chicago", "CT", "-06:00") for c in ("051", "073", "089", "091", "111", "125", "127", "129", "147", "149", "163", "173")},
    # Kansas western border counties (Mountain Time)
    **{f"20{c}": ("America/Denver", "MT", "-07:00") for c in ("071", "075", "181", "199")},
    # Kentucky western half (Central Time)
    **{
        f"21{c}": ("America/Chicago", "CT", "-06:00")
        for c in (
            "003", "009", "017", "027", "031", "033", "035", "039", "047", "053", "055", "057", "059", "061",
            "075", "083", "085", "087", "091", "099", "101", "105", "107", "139", "141", "143", "145", "149",
            "157", "169", "171", "177", "183", "207", "213", "219", "221", "225", "227", "233",
        )
    },
    # Michigan Upper Peninsula WI-border counties (Central Time)
    **{f"26{c}": ("America/Menominee", "CT", "-06:00") for c in ("043", "053", "071", "109")},
    # North Dakota SW counties (Mountain Time)
    **{f"38{c}": ("America/Denver", "MT", "-07:00") for c in ("001", "007", "011", "025", "033", "037", "041", "057", "085", "087", "089")},
    # Nebraska panhandle & western counties (Mountain Time)
    **{
        f"31{c}": ("America/Denver", "MT", "-07:00")
        for c in ("005", "007", "013", "029", "033", "045", "049", "057", "069", "075", "085", "101", "105", "113", "123", "135", "157", "161", "165")
    },
    # Oregon Malheur County (Mountain Time)
    "41045": ("America/Boise", "MT", "-07:00"),
    # South Dakota western half (Mountain Time)
    **{
        f"46{c}": ("America/Denver", "MT", "-07:00")
        for c in ("007", "019", "031", "033", "041", "047", "063", "065", "071", "081", "093", "102", "103", "105", "113", "119", "137")
    },
    # Tennessee East Tennessee counties (Eastern Time)
    **{
        f"47{c}": ("America/New_York", "ET", "-05:00")
        for c in (
            "001", "009", "011", "013", "019", "025", "029", "057", "059", "063", "065", "067", "073", "089",
            "093", "105", "107", "121", "123", "129", "133", "139", "145", "151", "155", "163", "171", "173", "179",
        )
    },
    # Texas far west (Mountain Time)
    "48141": ("America/Denver", "MT", "-07:00"),
    "48229": ("America/Denver", "MT", "-07:00"),
}


def resolve_city_timezone(st_up: str, county_fips: str) -> Tuple[str, str, str]:
    if county_fips in COUNTY_TZ_OVERRIDES:
        return COUNTY_TZ_OVERRIDES[county_fips]
    return STATE_FALLBACK_TZ[st_up]


def slugify_city(name: str) -> str:
    s = name.lower()
    s = s.replace("'", "").replace(".", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def get_data_gov_key() -> str:
    if os.environ.get("DATA_GOV_API_KEY"):
        return os.environ["DATA_GOV_API_KEY"].strip()
    if VAULT_PATH.is_file():
        for raw_line in VAULT_PATH.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if line.startswith("export "):
                line = line[len("export ") :].strip()
            if line.startswith("DATA_GOV_API_KEY="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    return val
    if AG_SECRETS_BIN.is_file() and os.access(AG_SECRETS_BIN, os.X_OK):
        out = subprocess.check_output(
            [str(AG_SECRETS_BIN), "get", "DATA_GOV_API_KEY", "--raw"],
            text=True,
            timeout=15,
        ).strip()
        if out:
            return out
    raise RuntimeError("DATA_GOV_API_KEY not found in environment, .env.global, or ag-secrets")


def curl_get_json(url: str, timeout: int = 60, retries: int = 4) -> Any:
    """Fetch JSON via /usr/bin/curl --config - so API keys never appear in process argv and TLS passes Akamai."""
    curl_bin = "/usr/bin/curl" if os.path.isfile("/usr/bin/curl") else "curl"
    esc = url.replace("\\", "\\\\").replace('"', '\\"')
    cfg = f'url = "{esc}"\nheader = "Accept: application/json"\n'

    last_err = ""
    for attempt in range(1, retries + 1):
        try:
            proc = subprocess.run(
                [curl_bin, "-sS", "-g", "--max-time", str(timeout), "-w", "\n%{http_code}", "--config", "-"],
                input=cfg,
                capture_output=True,
                text=True,
                timeout=timeout + 15,
                check=False,
            )
            if proc.returncode == 0:
                parts = proc.stdout.rsplit("\n", 1)
                body = parts[0].strip() if len(parts) == 2 else proc.stdout.strip()
                code = int(parts[1].strip()) if len(parts) == 2 and parts[1].strip().isdigit() else 200
                if 200 <= code < 300:
                    return json.loads(body) if body else {}
                last_err = f"HTTP {code}"
                if code not in (429, 500, 502, 503, 504):
                    break
            else:
                last_err = f"curl exit {proc.returncode}"
        except Exception as exc:
            last_err = type(exc).__name__
        time.sleep(2.5 * attempt)
    raise RuntimeError(f"Failed JSON request after {retries} attempts ({last_err})")


def city_name_variants(name: str) -> Set[str]:
    up = re.sub(r"\s+", " ", name.upper().strip())
    variants = {up, up.replace(".", ""), up.replace("-", " ")}
    for abbr, full in (("ST ", "SAINT "), ("ST. ", "SAINT "), ("FT ", "FORT "), ("FT. ", "FORT "), ("MT ", "MOUNT "), ("MT. ", "MOUNT ")):
        for v in list(variants):
            if v.startswith(abbr):
                variants.add(full + v[len(abbr) :])
            if v.startswith(full):
                variants.add(abbr.rstrip(". ") + " " + v[len(full) :])
                variants.add(abbr.rstrip(" ") + " " + v[len(full) :])
    if up == "VENTURA":
        variants.update({"SAN BUENAVENTURA", "VENTURA"})
    elif up == "PASO ROBLES":
        variants.update({"EL PASO DE ROBLES", "PASO ROBLES"})
    elif up == "HONOLULU":
        variants.update({"HONOLULU", "URBAN HONOLULU"})
    elif up == "BOISE":
        variants.update({"BOISE", "BOISE CITY"})
    elif up == "ST. PAUL" or up == "SAINT PAUL":
        variants.update({"SAINT PAUL", "ST PAUL", "ST. PAUL"})
    elif up == "WINSTON-SALEM":
        variants.update({"WINSTON SALEM", "WINSTON-SALEM"})
    elif up == "WILKES-BARRE":
        variants.update({"WILKES BARRE", "WILKES-BARRE"})
    return {re.sub(r"\s+", " ", x).strip() for x in variants if x.strip()}


def load_or_fetch_cms_er_hospitals() -> List[Dict[str, Any]]:
    cache_file = BULK_CACHE_DIR / "cms_er_hospitals.json"
    if cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    print("[bulk] Fetching all US CMS Care Compare ER hospitals (xubh-q36u) ...", flush=True)
    base = "https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0"
    all_rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        u = f"{base}?limit=500&offset={offset}&conditions[0][property]=emergency_services&conditions[0][value]=Yes"
        payload = curl_get_json(u, timeout=60)
        rows = payload.get("results") or []
        all_rows.extend(rows)
        if len(rows) < 500:
            break
        offset += 500

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(all_rows), encoding="utf-8")
    print(f"[bulk] Cached {len(all_rows)} CMS ER hospitals.", flush=True)
    return all_rows


def load_or_fetch_epa_sdwis() -> Dict[str, List[Dict[str, Any]]]:
    cache_file = BULK_CACHE_DIR / "epa_sdwis_cws.json"
    if cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    print("[bulk] Fetching active EPA SDWIS Community Water Systems across 51 states ...", flush=True)
    by_state: Dict[str, List[Dict[str, Any]]] = {}

    def fetch_state(st: str) -> Tuple[str, List[Dict[str, Any]]]:
        u = f"https://data.epa.gov/efservice/WATER_SYSTEM/STATE_CODE/{st}/PWS_TYPE_CODE/CWS/PWS_ACTIVITY_CODE/A/ROWS/0:9999/JSON"
        raw = curl_get_json(u, timeout=90)
        if not isinstance(raw, list):
            return st, []
        normed = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            d = {(k.split(".", 1)[1] if "." in k else k).lower(): v for k, v in item.items()}
            normed.append(
                {
                    "pwsid": d.get("pwsid"),
                    "pws_name": d.get("pws_name"),
                    "city_name": d.get("city_name"),
                    "county_served": d.get("cities_served") or d.get("counties_served"),
                    "population_served_count": int(d["population_served_count"]) if str(d.get("population_served_count") or "").isdigit() else 0,
                    "gw_sw_code": d.get("gw_sw_code"),
                }
            )
        return st, normed

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for st, rows in pool.map(fetch_state, ALL_STATES_51):
            by_state[st] = rows

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(by_state), encoding="utf-8")
    total_cws = sum(len(v) for v in by_state.values())
    print(f"[bulk] Cached {total_cws} active EPA SDWIS CWS systems across 51 states.", flush=True)
    return by_state


def load_or_fetch_nps_parks(api_key: str) -> List[Dict[str, Any]]:
    cache_file = BULK_CACHE_DIR / "nps_parks_all.json"
    if cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    print("[bulk] Fetching all US National Park Service units ...", flush=True)
    parks: List[Dict[str, Any]] = []
    start = 0
    while True:
        params = urllib.parse.urlencode({"limit": "500", "start": str(start), "api_key": api_key})
        u = f"https://developer.nps.gov/api/v1/parks?{params}"
        payload = curl_get_json(u, timeout=60)
        batch = payload.get("data") or []
        for p in batch:
            if not isinstance(p, dict):
                continue
            try:
                la = float(p["latitude"]) if p.get("latitude") not in (None, "") else None
                ln = float(p["longitude"]) if p.get("longitude") not in (None, "") else None
            except ValueError:
                la, ln = None, None
            parks.append(
                {
                    "parkCode": p.get("parkCode"),
                    "fullName": p.get("fullName") or p.get("name"),
                    "designation": p.get("designation"),
                    "url": p.get("url"),
                    "description": p.get("description"),
                    "latitude": la,
                    "longitude": ln,
                }
            )
        total = int(payload.get("total") or len(parks))
        start += len(batch)
        if not batch or start >= total:
            break

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(parks), encoding="utf-8")
    print(f"[bulk] Cached {len(parks)} NPS park units.", flush=True)
    return parks


def load_or_fetch_colleges(api_key: str) -> List[Dict[str, Any]]:
    cache_file = BULK_CACHE_DIR / "colleges_all.json"
    if cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    print("[bulk] Fetching all operating US College Scorecard institutions ...", flush=True)
    fields = "id,school.name,school.city,school.state,school.school_url,latest.student.size,school.ownership,location.lat,location.lon"
    schools: List[Dict[str, Any]] = []
    page = 0
    while True:
        params = urllib.parse.urlencode(
            {
                "school.operating": "1",
                "fields": fields,
                "per_page": "100",
                "page": str(page),
                "api_key": api_key,
            }
        )
        u = f"https://api.data.gov/ed/collegescorecard/v1/schools.json?{params}"
        payload = curl_get_json(u, timeout=60)
        results = payload.get("results") or []
        schools.extend(results)
        meta = payload.get("metadata") or {}
        total = int(meta.get("total") or 0)
        page += 1
        if not results or page * 100 >= total:
            break
        if page % 15 == 0:
            print(f"  [colleges] fetched {len(schools)}/{total} ...", flush=True)

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(schools), encoding="utf-8")
    print(f"[bulk] Cached {len(schools)} operating College Scorecard institutions.", flush=True)
    return schools


def load_or_fetch_nrel_ev(api_key: str) -> Dict[str, List[Dict[str, Any]]]:
    ev_dir = BULK_CACHE_DIR / "nrel_ev_by_state"
    ev_dir.mkdir(parents=True, exist_ok=True)

    # First hydrate any states already cached in ~/.gemini/cache/api_cache.sqlite
    if SQLITE_CACHE_DB.is_file():
        try:
            now_ts = time.time()
            with sqlite3.connect(str(SQLITE_CACHE_DB), timeout=10.0) as conn:
                rows = conn.execute(
                    "SELECT endpoint, response_json FROM http_cache WHERE provider = 'nrel_afdc' AND expires_at > ?",
                    (now_ts,),
                ).fetchall()
            for ep, rjson in rows:
                m = re.search(r"[?&]state=([A-Z]{2})", ep)
                if m:
                    st = m.group(1)
                    st_file = ev_dir / f"{st}.json"
                    if not st_file.is_file():
                        data = json.loads(rjson)
                        if isinstance(data, dict) and isinstance(data.get("fuel_stations"), list):
                            st_file.write_text(json.dumps(data["fuel_stations"]), encoding="utf-8")
        except Exception:
            pass

    missing_states = [st for st in ALL_STATES_51 if not (ev_dir / f"{st}.json").is_file()]
    if missing_states:
        print(f"[bulk] Fetching NREL/NLR AFDC public EV stations for {len(missing_states)} remaining states ...", flush=True)
        keep_keys = (
            "id",
            "station_name",
            "street_address",
            "city",
            "state",
            "zip",
            "ev_network",
            "ev_dc_fast_num",
            "ev_level2_evse_num",
            "ev_level1_evse_num",
            "latitude",
            "longitude",
        )
        for idx, st in enumerate(missing_states, 1):
            params = urllib.parse.urlencode(
                {
                    "fuel_type": "ELEC",
                    "status": "E",
                    "access": "public",
                    "state": st,
                    "limit": "all",
                    "api_key": api_key,
                }
            )
            u = f"https://developer.nlr.gov/api/alt-fuel-stations/v1.json?{params}"
            payload = curl_get_json(u, timeout=90)
            slim = [
                {k: item.get(k) for k in keep_keys}
                for item in (payload.get("fuel_stations") or [])
                if isinstance(item, dict)
            ]
            (ev_dir / f"{st}.json").write_text(json.dumps(slim), encoding="utf-8")
            if idx % 10 == 0 or idx == len(missing_states):
                print(f"  [nrel-ev] cached {idx}/{len(missing_states)} states", flush=True)
            time.sleep(0.2)

    by_state: Dict[str, List[Dict[str, Any]]] = {}
    for st in ALL_STATES_51:
        by_state[st] = json.loads((ev_dir / f"{st}.json").read_text(encoding="utf-8"))
    return by_state


def load_noaa_1991_2020_stations() -> List[Dict[str, Any]]:
    """Load official NOAA NCEI 1991-2020 U.S. Monthly Climate Normals across 6,719 complete stations."""
    parsed_cache = BULK_CACHE_DIR / "noaa_stations_parsed.json"
    if parsed_cache.is_file():
        return json.loads(parsed_cache.read_text(encoding="utf-8"))

    tar_path = BULK_CACHE_DIR / "noaa_1991_2020_monthly.tar.gz"
    if not tar_path.is_file():
        print("[bulk] Downloading official NOAA NCEI 1991-2020 U.S. Monthly Climate Normals archive ...", flush=True)
        tar_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(
            "https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/archive/us-climate-normals_1991-2020_v1.0.1_monthly_multivariate_by-station_c20230404.tar.gz",
            tar_path,
        )

    def _pval(raw: Optional[str], is_prcp: bool = False) -> Optional[float]:
        if raw is None:
            return None
        s = raw.strip()
        if not s:
            return None
        try:
            v = float(s)
        except ValueError:
            return None
        if is_prcp and (abs(v + 7777.0) < 1.0 or abs(v + 777.7) < 0.5):
            return 0.0
        if v < -90.0:
            return None
        return v

    import io
    stations: List[Dict[str, Any]] = []
    with tarfile.open(tar_path, "r:gz") as tf:
        for m in tf.getmembers():
            if not (m.isfile() and m.name.endswith(".csv")):
                continue
            fh = tf.extractfile(m)
            if fh is None:
                continue
            reader = csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8", errors="replace"))
            fnames = reader.fieldnames or []
            if "MLY-TMAX-NORMAL" not in fnames or "MLY-TMIN-NORMAL" not in fnames or "MLY-PRCP-NORMAL" not in fnames:
                continue
            rows = list(reader)
            if len(rows) != 12:
                continue
            try:
                lat = float(rows[0]["LATITUDE"].strip())
                lng = float(rows[0]["LONGITUDE"].strip())
            except ValueError:
                continue
            jul_tmax: Optional[float] = None
            jan_tmin: Optional[float] = None
            prcp_sum = 0.0
            ok = True
            for r in rows:
                mo = (r.get("month") or r.get("DATE") or "").strip().zfill(2)
                p = _pval(r.get("MLY-PRCP-NORMAL"), is_prcp=True)
                if p is None or p < 0:
                    ok = False
                    break
                prcp_sum += p
                if mo == "07":
                    jul_tmax = _pval(r.get("MLY-TMAX-NORMAL"))
                elif mo == "01":
                    jan_tmin = _pval(r.get("MLY-TMIN-NORMAL"))
            if not ok or jul_tmax is None or jan_tmin is None:
                continue
            stations.append(
                {
                    "station": rows[0]["STATION"].strip(),
                    "name": rows[0]["NAME"].strip(),
                    "lat": round(lat, 5),
                    "lng": round(lng, 5),
                    "jul_tmax": round(jul_tmax, 1),
                    "jan_tmin": round(jan_tmin, 1),
                    "ann_prcp": round(prcp_sum, 2),
                }
            )

    parsed_cache.write_text(json.dumps(stations), encoding="utf-8")
    print(f"[bulk] Parsed & cached {len(stations)} complete NOAA NCEI 1991-2020 climate stations.", flush=True)
    return stations


def pick_primary_airport(
    city_lat: float,
    city_lng: float,
    large_aps: List[Dict[str, Any]],
    medium_aps: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    ranked_large = sorted(
        ((enrich_city.hav(city_lat, city_lng, float(a["latitude_deg"]), float(a["longitude_deg"])), a) for a in large_aps),
        key=lambda x: x[0],
    )
    ranked_med = sorted(
        ((enrich_city.hav(city_lat, city_lng, float(a["latitude_deg"]), float(a["longitude_deg"])), a) for a in medium_aps),
        key=lambda x: x[0],
    )

    chosen_dist: Optional[float] = None
    chosen_ap: Optional[Dict[str, Any]] = None

    best_large_d, best_large = ranked_large[0] if ranked_large else (9999.0, None)
    best_med_d, best_med = ranked_med[0] if ranked_med else (9999.0, None)

    # Prefer large_airport hub within 35 mi unless a medium commercial airport (e.g. HPN, PAE) is <10 mi and >=20 mi closer
    if best_large and best_large_d <= 35.0:
        if best_med and best_med["iata_code"] != "BFI" and best_med_d < 10.0 and (best_large_d - best_med_d) >= 20.0:
            chosen_dist, chosen_ap = best_med_d, best_med
        else:
            chosen_dist, chosen_ap = best_large_d, best_large
    else:
        # Exclude BFI (Boeing Field) when SEA is nearby; otherwise pick nearest large or medium scheduled commercial airport
        if best_med and best_med["iata_code"] == "BFI" and len(ranked_med) > 1:
            best_med_d, best_med = ranked_med[1]
        if best_large_d <= best_med_d:
            chosen_dist, chosen_ap = best_large_d, best_large
        else:
            chosen_dist, chosen_ap = best_med_d, best_med

    if not chosen_ap or chosen_dist is None or chosen_dist > 180.0:
        return None

    clean_name = sanitize_dashes(chosen_ap["name"])
    # Ensure no banned V1 phrase appears
    if contains_banned_phrase(clean_name):
        return None

    return {
        "name": clean_name,
        "iata": chosen_ap["iata_code"].strip().upper(),
        "lat": round(float(chosen_ap["latitude_deg"]), 6),
        "lng": round(float(chosen_ap["longitude_deg"]), 6),
        "distanceMiles": round(chosen_dist, 1),
        "transitToDowntown": None,
        "source": "OurAirports (public domain) for name, IATA code and coordinates; distance is straight-line from the U.S. Census Gazetteer city center point",
        "sourceUrl": "https://ourairports.com/data/",
        "cityCenterMethod": "Census Gazetteer internal point",
        "retrieved": TODAY,
    }


def main() -> int:
    t0 = time.time()
    census_dir = resolve_census_dir(
        need_acs=True,
        need_popest=True,
        need_gazetteer=True,
        need_zbp=True,
        need_zcta_rel=True,
    )
    rel_file = Path(census_dir) / "tab20_zcta520_place20_natl.txt"
    if not rel_file.is_file():
        rel_file = ROOT / "data" / "census-local" / "tab20_zcta520_place20_natl.txt"

    print(f"[init] Loading local Census bulk tables from {census_dir} ...", flush=True)
    num = lambda v: (None if v in (None, "", ".", "-", "N") else float(v))

    acs: Dict[str, Dict[str, str]] = {}
    for tbl in ("b01003", "b19013", "b19301", "b25077", "b25064", "b01002", "b25103"):
        d: Dict[str, str] = {}
        with open(f"{census_dir}23_{tbl}.dat", encoding="utf-8") as fh:
            for line in fh:
                parts = line.rstrip("\n").split("|")
                if len(parts) > 1:
                    d[parts[0]] = parts[1]
        acs[tbl] = d

    us_pop = num(acs["b01003"]["0100000US"])
    if not us_pop:
        raise RuntimeError("Missing US total population 0100000US in 23_b01003.dat")

    # Gazetteer: place_geoid -> (namelsad, lat, lng)
    gaz: Dict[str, Tuple[str, float, float]] = {}
    z_gaz = zipfile.ZipFile(f"{census_dir}2023_Gaz_place_national.zip")
    for line in z_gaz.read(z_gaz.namelist()[0]).decode("latin1").splitlines()[1:]:
        f = line.split("\t")
        if len(f) >= 12:
            gaz[f[1].strip()] = (f[3].strip(), round(float(f[10].strip()), 6), round(float(f[11].strip()), 6))

    # popest.csv: SUMLEV=162 by place_geoid, SUMLEV=157+050 for official Place -> County resolution
    popest_162: Dict[str, Dict[str, str]] = {}
    counties_050: Dict[str, str] = {}
    place_counties: Dict[str, List[Tuple[int, str]]] = collections.defaultdict(list)
    with open(f"{census_dir}popest.csv", encoding="latin1") as fh:
        for r in csv.DictReader(fh):
            sl = r["SUMLEV"]
            st_f = r["STATE"].zfill(2)
            co_f = r["COUNTY"].zfill(3)
            pl_f = r["PLACE"].zfill(5)
            p23 = int(r["POPESTIMATE2023"]) if r.get("POPESTIMATE2023", "").isdigit() else 0
            if sl == "050":
                counties_050[st_f + co_f] = r["NAME"].strip()
            elif sl == "162" and pl_f != "00000":
                popest_162[st_f + pl_f] = r
            elif sl in ("157", "170", "172") and co_f != "000" and pl_f != "00000":
                place_counties[st_f + pl_f].append((p23, st_f + co_f))

    # Official Census 2020 ZCTA5-to-Place relationship file
    place_zctas_rel: Dict[str, List[Tuple[int, str]]] = collections.defaultdict(list)
    with open(rel_file, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh, delimiter="|"):
            pid = (r.get("GEOID_PLACE_20") or "").strip()
            zid = (r.get("GEOID_ZCTA5_20") or "").strip()
            if not pid or not zid:
                continue
            aland_part = int(r.get("AREALAND_PART") or 0)
            aland_zcta = int(r.get("AREALAND_ZCTA5_20") or 0)
            aland_place = int(r.get("AREALAND_PLACE_20") or 0)
            if aland_part <= 0:
                continue
            share_z = (aland_part / aland_zcta) if aland_zcta > 0 else 0.0
            share_p = (aland_part / aland_place) if aland_place > 0 else 0.0
            place_zctas_rel[pid].append((aland_part, zid, share_z, share_p))

    # ZBP 2022 indexed by ZIP and by (USPS_CITY, STATE)
    print("[init] Indexing Census 2022 ZBP across all US ZIP codes ...", flush=True)
    naics_defs = json.load(open(SCRIPT_DIR / "naics_defs.json", encoding="utf-8"))
    naics_codes = {d["naicsCode"] for d in naics_defs}
    zbp_lines = zipfile.ZipFile(f"{census_dir}zbp22.zip").open("zbp22detail.txt").read().decode("latin1").splitlines()

    us_naics_totals: Dict[str, int] = collections.defaultdict(int)
    zip_naics_est: Dict[str, Dict[str, int]] = collections.defaultdict(dict)
    zip_total_est: Dict[str, int] = {}
    usps_city_zips: Dict[Tuple[str, str], Set[str]] = collections.defaultdict(set)

    for r in csv.DictReader(zbp_lines):
        n = r["naics"]
        z = r["zip"]
        e = int(r["est"])
        if n in naics_codes:
            us_naics_totals[n] += e
            zip_naics_est[z][n] = zip_naics_est[z].get(n, 0) + e
        elif n == "------":
            zip_total_est[z] = e
            usps_city_zips[(re.sub(r"\s+", " ", r["city"].upper().strip()), r["stabbr"].upper())].add(z)

    # OurAirports scheduled US commercial airports
    all_airports = [
        a
        for a in enrich_city.ourairports()
        if a.get("iso_country") == "US"
        and a.get("scheduled_service") == "yes"
        and len((a.get("iata_code") or "").strip()) == 3
        and not contains_banned_phrase(sanitize_dashes(a.get("name") or ""))
    ]
    large_airports = [a for a in all_airports if a.get("type") == "large_airport"]
    medium_airports = [a for a in all_airports if a.get("type") == "medium_airport"]

    # Verified sales-tax table (ONLY source allowed for permitsAndTax)
    sales_tax_table: Dict[str, Any] = json.loads((ROOT / "sources" / "sales-tax.json").read_text(encoding="utf-8"))

    # First pass over all 51 state JSON files: collect non-flagship coordinates & normalize slugs
    state_files = sorted(CITIES_DIR.glob("*.json"))
    all_state_data: Dict[Path, List[Dict[str, Any]]] = {}
    slug_migrations: Dict[str, str] = {"ut/salt-lake": "ut/salt-lake-city"}
    if SLUG_MIGRATIONS_PATH.is_file():
        slug_migrations.update(json.loads(SLUG_MIGRATIONS_PATH.read_text(encoding="utf-8")))
    coords_needed: List[Tuple[str, float, float]] = []
    seen_new_slugs: Set[str] = set()

    for sf in state_files:
        arr = json.loads(sf.read_text(encoding="utf-8"))
        all_state_data[sf] = arr
        for c in arr:
            old_slug = str(c["slug"])
            st = str(c["stateCode"]).lower()
            cid = str(c["cityId"]).zfill(7)
            c["cityId"] = cid

            if old_slug in CERTIFIED_FLAGSHIP_SLUGS:
                seen_new_slugs.add(old_slug)
                continue

            gnm, gla, gln = gaz[cid]
            new_name = str(c["name"]).strip()
            new_slug = old_slug

            if (st, gnm) in EXPLICIT_GAZETTEER_OVERRIDES:
                new_name, new_slug = EXPLICIT_GAZETTEER_OVERRIDES[(st, gnm)]
            elif gnm.endswith(" City city") and not new_name.endswith(" City"):
                new_name = gnm[: -len(" city")]
                new_slug = f"{st}/{slugify_city(new_name)}"

            if new_slug in seen_new_slugs:
                raise RuntimeError(f"Duplicate normalized slug collision detected: {new_slug} (from {old_slug})")
            seen_new_slugs.add(new_slug)

            if new_slug != old_slug:
                slug_migrations[old_slug] = new_slug

            c["_new_name"] = new_name
            c["_new_slug"] = new_slug
            c["_gaz_lat"] = gla
            c["_gaz_lng"] = gln
            coords_needed.append((cid, gla, gln))

    print(
        f"[pass1] Audited {len(seen_new_slugs)} total cities ({len(CERTIFIED_FLAGSHIP_SLUGS)} preserved flagships, "
        f"{len(coords_needed)} cities queued for primary rebuild, {len(slug_migrations) - 1} slug normalizations).",
        flush=True,
    )

    # Fetch / load bulk federal datasets
    api_key = get_data_gov_key()
    cms_rows = load_or_fetch_cms_er_hospitals()
    sdwis_by_state = load_or_fetch_epa_sdwis()
    nps_parks = load_or_fetch_nps_parks(api_key)
    colleges_raw = load_or_fetch_colleges(api_key)
    nrel_ev_by_state = load_or_fetch_nrel_ev(api_key)
    noaa_stations = load_noaa_1991_2020_stations()

    # Index CMS ER hospitals by (state, city_upper) and (state, county_short_upper)
    cms_by_city: Dict[Tuple[str, str], List[Dict[str, Any]]] = collections.defaultdict(list)
    cms_by_county: Dict[Tuple[str, str], List[Dict[str, Any]]] = collections.defaultdict(list)
    for h in cms_rows:
        st_up = str(h.get("state") or "").strip().upper()
        ct_up = re.sub(r"\s+", " ", str(h.get("citytown") or "").strip().upper())
        co_up = re.sub(r"\s+", " ", str(h.get("countyparish") or h.get("county_parish") or "").strip().upper())
        if st_up and ct_up:
            cms_by_city[(st_up, ct_up)].append(h)
        if st_up and co_up:
            cms_by_county[(st_up, co_up)].append(h)

    # Index College Scorecard by (state, city_upper)
    def _dot(obj: Dict[str, Any], path: str) -> Any:
        if path in obj:
            return obj[path]
        cur: Any = obj
        for part in path.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return None
        return cur

    colleges_by_city: Dict[Tuple[str, str], List[Dict[str, Any]]] = collections.defaultdict(list)
    for item in colleges_raw:
        if not isinstance(item, dict):
            continue
        st_up = str(_dot(item, "school.state") or "").strip().upper()
        ct_up = re.sub(r"\s+", " ", str(_dot(item, "school.city") or "").strip().upper())
        if not st_up or not ct_up:
            continue
        sz_raw = _dot(item, "latest.student.size")
        sz = int(sz_raw) if isinstance(sz_raw, (int, float)) or (isinstance(sz_raw, str) and sz_raw.isdigit()) else None
        own_raw = _dot(item, "school.ownership")
        own_code = int(own_raw) if isinstance(own_raw, (int, float)) or (isinstance(own_raw, str) and own_raw.isdigit()) else None
        la_raw = _dot(item, "location.lat")
        ln_raw = _dot(item, "location.lon")
        colleges_by_city[(st_up, ct_up)].append(
            {
                "id": item.get("id"),
                "name": _dot(item, "school.name"),
                "studentSize": sz,
                "ownership": OWNERSHIP_LABELS.get(own_code, "Institution"),
                "schoolUrl": _dot(item, "school.school_url"),
                "lat": round(float(la_raw), 6) if la_raw is not None else None,
                "lng": round(float(ln_raw), 6) if ln_raw is not None else None,
            }
        )

    # Index NREL EV stations by (state, city_upper)
    ev_by_city: Dict[Tuple[str, str], List[Dict[str, Any]]] = collections.defaultdict(list)
    for st_up, st_list in nrel_ev_by_state.items():
        for st_item in st_list:
            ct_up = re.sub(r"\s+", " ", str(st_item.get("city") or "").strip().upper())
            if ct_up:
                ev_by_city[(st_up, ct_up)].append(st_item)

    # Index EPA SDWIS by (state, city_upper)
    sdwis_by_city: Dict[Tuple[str, str], List[Dict[str, Any]]] = collections.defaultdict(list)
    for st_up, rows in sdwis_by_state.items():
        for w in rows:
            ct_up = re.sub(r"\s+", " ", str(w.get("city_name") or "").strip().upper())
            if ct_up and w.get("population_served_count", 0) > 0:
                sdwis_by_city[(st_up, ct_up)].append(w)

    # Second pass: rebuild all 1,476 non-flagships in memory & save each state file atomically
    rebuilt_count = 0
    stats_counter: Dict[str, int] = collections.Counter()

    for sf, arr in all_state_data.items():
        for c in arr:
            if c["slug"] in CERTIFIED_FLAGSHIP_SLUGS:
                stats_counter["flagships_preserved"] += 1
                continue

            cid = c["cityId"]
            gid = f"1600000US{cid}"
            st_low = str(c["stateCode"]).lower()
            st_up = st_low.upper()
            new_name = c.pop("_new_name")
            new_slug = c.pop("_new_slug")
            gla = c.pop("_gaz_lat")
            gln = c.pop("_gaz_lng")

            c["slug"] = new_slug
            c["name"] = new_name
            c["stateCode"] = st_low
            c["lat"] = gla
            c["lng"] = gln

            # Official Census County FIPS & County Name from popest.csv SUMLEV=157 + 050
            co_candidates = sorted(place_counties.get(cid, []), key=lambda x: -x[0])
            if not co_candidates:
                raise RuntimeError(f"Could not resolve official Census county for {new_slug} ({cid})")
            county_fips = co_candidates[0][1]
            county_name = counties_050[county_fips]
            c["countyFips"] = county_fips
            c["countyName"] = county_name

            # Purge ALL fabricated V1 sections
            for bad_k in ("laborAndEconomy", "scores", "topTrafficCorridors", "terrainElevation", "upcomingEvents"):
                c.pop(bad_k, None)
            c["marketSignals"] = {}

            # 1. Demographics (SUB-EST2023 SUMLEV=162 + ACS 2023 5-Year)
            pe_row = popest_162.get(cid)
            pop = int(pe_row["POPESTIMATE2023"]) if pe_row else int(num(acs["b01003"][gid]))
            base20 = int(pe_row["ESTIMATESBASE2020"]) if pe_row else None
            acsp = {
                "sourceName": "US Census Bureau ACS 5-Year Estimates 2023 (Table-Based Summary File)",
                "sourceUrl": "https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/",
                "datasetVintage": "ACS-2023-5YR",
                "verifiedAt": VERIFIED_AT,
                "granularity": "place",
            }
            demo: Dict[str, Any] = {
                "population": pop,
                "medianHouseholdIncome": int(num(acs["b19013"][gid])),
                "perCapitaIncome": int(num(acs["b19301"][gid])),
                "medianAge": float(num(acs["b01002"][gid])),
                "medianGrossRent": int(num(acs["b25064"][gid])),
                "medianHomeValue": int(num(acs["b25077"][gid])),
                "provenance": acsp,
            }
            if base20 and base20 > 0:
                demo["popChange2020to2023Pct"] = round((pop / base20 - 1.0) * 100.0, 1)
                demo["popChangeBasis"] = "Census Population Estimates, April 2020 base to July 2023"
            c["demographics"] = demo

            # 2. Housing & Effective Property Tax Rate
            tax_paid = num(acs["b25103"].get(gid))
            hv = float(demo["medianHomeValue"])
            c["housingAndTaxes"] = {
                "medianHomeValue": demo["medianHomeValue"],
                "medianGrossRent": demo["medianGrossRent"],
                "medianRealEstateTaxPaid": int(tax_paid) if tax_paid else None,
                "effectivePropertyTaxRatePct": round(tax_paid / hv * 100.0, 2) if (tax_paid and hv) else None,
                "countyName": county_name,
                "source": "ACS 2023 5-yr: B25077 median home value, B25064 median gross rent, B25103 median real estate taxes paid. Effective rate = B25103 / B25077.",
                "sourceUrl": acsp["sourceUrl"],
            }

            # 3. ZBP 2022 + ACS 2023 ZCTA Small-Business Trade Density
            variants = city_name_variants(new_name)
            matched_zips: Set[str] = set()
            for v in variants:
                matched_zips.update(usps_city_zips.get((v, st_up), set()))

            used_zcta_rel_fallback = False
            if not matched_zips:
                used_zcta_rel_fallback = True
                rel_rows = sorted(place_zctas_rel.get(cid, []), key=lambda x: -x[0])
                sig_zips = [z for (_, z, sz, sp) in rel_rows if (sz >= 0.10 or sp >= 0.05) and z in zip_total_est]
                if not sig_zips:
                    sig_zips = [z for (_, z, _, _) in rel_rows if z in zip_total_est][:3]
                matched_zips = set(sig_zips)

            zp_map = {z: num(acs["b01003"].get("860Z200US" + z)) for z in matched_zips}
            use_zips = sorted([z for z in matched_zips if zp_map.get(z) and zp_map[z] > 0])
            zpop = sum(zp_map[z] for z in use_zips if zp_map[z])
            c["primaryZips"] = sorted(use_zips, key=lambda z: -zip_total_est.get(z, 0))[:12]

            inds: List[Dict[str, Any]] = []
            if use_zips and zpop > 0:
                for df in naics_defs:
                    ncode = df["naicsCode"]
                    e_cnt = sum(zip_naics_est[z].get(ncode, 0) for z in use_zips)
                    usd = us_naics_totals[ncode] / us_pop * 10000.0
                    p10 = e_cnt / zpop * 10000.0
                    idx = round(p10 / usd * 100) if usd else 0
                    status = "underserved" if idx < 80 else ("saturated" if idx > 120 else "balanced")
                    expected = usd * zpop / 10000.0
                    if usd < 0.3 or expected < 2.0:
                        continue
                    basis_phrase = (
                        f"Census-intersecting ZCTAs (2020 ZCTA5-to-Place relationship) for {new_name}, {st_up}"
                        if used_zcta_rel_fallback
                        else f"ZIP codes whose USPS city is {new_name}, {st_up}"
                    )
                    quote = sanitize_dashes(
                        f"{e_cnt} employer establishments (NAICS {ncode}) across {len(use_zips)} {basis_phrase}; "
                        f"density uses ACS 2023 ZCTA population ({int(zpop):,}). "
                        f"National benchmark = all US ZIP rows / US population."
                    )[:280]
                    inds.append(
                        {
                            **df,
                            "establishments": e_cnt,
                            "per10kResidents": round(p10, 2),
                            "usAvgPer10k": round(usd, 2),
                            "saturationIndex": idx,
                            "status": status,
                            "smallSample": expected < 10.0,
                            "provenance": {
                                "sourceName": "US Census Bureau ZIP Code Business Patterns 2022",
                                "sourceUrl": "https://www2.census.gov/programs-surveys/cbp/datasets/2022/zbp22detail.zip",
                                "datasetVintage": "ZBP-2022",
                                "verifiedAt": VERIFIED_AT,
                                "granularity": "zcta_aggregated",
                                "evidenceQuote": quote,
                            },
                        }
                    )
            c["industries"] = inds
            if used_zcta_rel_fallback:
                stats_counter["zbp_zcta_rel_fallback"] += 1

            # 4. Sales Tax (ONLY from sources/sales-tax.json; omit permitsAndTax completely otherwise)
            if new_slug in sales_tax_table:
                c["permitsAndTax"] = enrich_city.do_tax(new_slug)
                stats_counter["verified_sales_tax"] += 1
            else:
                c.pop("permitsAndTax", None)

            # 5. Official NOAA NCEI 1991-2020 U.S. Climate Normals + Exact County-FIPS Time Zone
            best_noaa = min(noaa_stations, key=lambda s: enrich_city.hav(gla, gln, s["lat"], s["lng"]))
            noaa_dist = round(enrich_city.hav(gla, gln, best_noaa["lat"], best_noaa["lng"]), 1)
            c["climateNormals"] = {
                "peakSummerHighF": round(best_noaa["jul_tmax"]),
                "winterLowF": round(best_noaa["jan_tmin"]),
                "annualRainfallInches": round(best_noaa["ann_prcp"], 1),
                "sourceName": (
                    f"NOAA NCEI U.S. Climate Normals 1991-2020 (Station {best_noaa['station']}, "
                    f"{noaa_dist} mi from Gazetteer center), retrieved {TODAY}"
                ),
                "sourceUrl": "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
            }

            iana_tz, tz_abbr, utc_off = resolve_city_timezone(st_up, county_fips)

            # 6. Primary Commercial Airport + CMS Care Compare ER Hospitals
            primary_ap = pick_primary_airport(gla, gln, large_airports, medium_airports)
            if primary_ap:
                stats_counter["with_airport"] += 1

            cms_matches: List[Dict[str, Any]] = []
            seen_fac_ids: Set[str] = set()
            for v in variants:
                for row in cms_by_city.get((st_up, v), []):
                    fid = str(row.get("facility_id") or "")
                    if fid and fid not in seen_fac_ids:
                        seen_fac_ids.add(fid)
                        cms_matches.append(row)

            er_scope: Optional[str] = None
            er_scope_note: Optional[str] = None
            if not cms_matches:
                county_short = re.sub(
                    r"\s+(County|Parish|Borough|Census Area|Municipality|city and borough|city)$",
                    "",
                    county_name,
                    flags=re.IGNORECASE,
                ).strip().upper()
                for co_v in city_name_variants(county_short):
                    for row in cms_by_county.get((st_up, co_v), []):
                        fid = str(row.get("facility_id") or "")
                        if fid and fid not in seen_fac_ids:
                            seen_fac_ids.add(fid)
                            cms_matches.append(row)
                if cms_matches:
                    er_scope = f"{county_name}, {st_up}"
                    er_scope_note = (
                        f"No CMS emergency-services hospital is addressed inside {new_name} city limits; "
                        f"showing {county_name}, {st_up} CMS hospitals listed with emergency services."
                    )

            processed_hosps: List[Dict[str, Any]] = []
            for h in cms_matches:
                h_name = normalize_hospital_name(str(h.get("facility_name") or ""))
                h_street = normalize_street_address(str(h.get("address") or "").title())
                h_city = sanitize_dashes(str(h.get("citytown") or "").title())
                h_zip = str(h.get("zip_code") or "").strip()
                h_addr = f"{h_street}, {h_city}, {st_up} {h_zip}".strip()
                h_type = normalize_hospital_type(h.get("hospital_type"))
                h_fid = str(h.get("facility_id") or "").strip()
                if not h_name or not h_street or any(contains_banned_phrase(val) for val in (h_name, h_addr, h_type)):
                    continue
                processed_hosps.append(
                    {
                        "name": h_name,
                        "address": h_addr,
                        "type": h_type,
                        "cmsFacilityId": h_fid,
                    }
                )
            processed_hosps.sort(key=lambda x: x["name"])

            emerg_obj: Dict[str, Any] = {"emergencyDispatch": "911"}
            if processed_hosps:
                if er_scope:
                    src_txt = (
                        f"CMS Care Compare (dataset xubh-q36u, retrieved {TODAY}): "
                        f"{county_name}, {st_up} hospitals with emergency services (none addressed inside city limits)."
                    )
                    stats_counter["with_hospitals_county_scope"] += 1
                else:
                    src_txt = (
                        f"CMS Care Compare hospital general information (dataset xubh-q36u), retrieved {TODAY}: "
                        f"hospitals listed with emergency services. No trauma or nearest claim."
                    )
                    stats_counter["with_hospitals_city"] += 1
                first_h = processed_hosps[0]
                emerg_obj.update(
                    {
                        "nearestTraumaHospital": first_h["name"],
                        "hospitalAddress": first_h["address"],
                        "cmsFacilityId": first_h["cmsFacilityId"],
                        "emergencyServices": True,
                        "source": src_txt,
                        "erHospitals": processed_hosps[:12],
                        "erHospitalsSource": src_txt,
                    }
                )
                if er_scope:
                    emerg_obj["erHospitalsScope"] = er_scope

            et_obj: Dict[str, Any] = {
                "timeZone": iana_tz,
                "timeZoneAbbr": tz_abbr,
                "utcOffset": utc_off,
                "emergency": emerg_obj,
            }
            if primary_ap:
                et_obj["primaryAirport"] = primary_ap
            c["executiveTravel"] = et_obj

            # 7. EPA SDWIS Community Water System (strict unambiguity rule)
            sdwis_cands: List[Dict[str, Any]] = []
            seen_pwsids: Set[str] = set()
            for v in variants:
                for w in sdwis_by_city.get((st_up, v), []):
                    pid_w = str(w.get("pwsid") or "")
                    if pid_w and pid_w not in seen_pwsids:
                        seen_pwsids.add(pid_w)
                        sdwis_cands.append(w)
            sdwis_cands.sort(key=lambda x: -x["population_served_count"])

            water_obj: Optional[Dict[str, Any]] = None
            if sdwis_cands:
                top_w = sdwis_cands[0]
                ambiguous = len(sdwis_cands) > 1 and sdwis_cands[1]["population_served_count"] >= 0.5 * top_w["population_served_count"]
                under_half = pop > 0 and top_w["population_served_count"] < 0.5 * pop
                if not ambiguous and not under_half:
                    prov_name = sanitize_dashes(str(top_w["pws_name"] or "").title())
                    for s_from, s_to in ((" Of ", " of "), (" And ", " and "), ("Pws", "PWS"), ("Mud", "MUD"), ("Wsc", "WSC")):
                        prov_name = prov_name.replace(s_from, s_to)
                    if prov_name and not contains_banned_phrase(prov_name):
                        gw_sw = str(top_w.get("gw_sw_code") or "").upper()
                        water_obj = {
                            "pwsid": top_w["pwsid"],
                            "providerName": prov_name,
                            "populationServed": top_w["population_served_count"],
                            "sourceType": "surface water" if gw_sw in ("SW", "SWP", "GU", "GUP") else "groundwater",
                            "source": "U.S. EPA Safe Drinking Water Information System (SDWIS)",
                            "sourceUrl": f"https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/{top_w['pwsid']}/JSON",
                            "retrieved": TODAY,
                        }
            if water_obj:
                c["waterUtility"] = water_obj
                stats_counter["with_water"] += 1
            else:
                c.pop("waterUtility", None)

            # 8. Dept. of Education College Scorecard
            raw_schools: List[Dict[str, Any]] = []
            seen_sids: Set[Any] = set()
            for v in variants:
                for sc_item in colleges_by_city.get((st_up, v), []):
                    sid = sc_item.get("id")
                    if sid not in seen_sids:
                        seen_sids.add(sid)
                        raw_schools.append(sc_item)
            raw_schools.sort(key=lambda s: -(s["studentSize"] if s["studentSize"] is not None else -1))

            clean_schools: List[Dict[str, Any]] = []
            total_enroll = 0
            for sc_item in raw_schools:
                if isinstance(sc_item.get("studentSize"), int) and sc_item["studentSize"] > 0:
                    total_enroll += sc_item["studentSize"]
                nm_sc = sanitize_dashes(sc_item.get("name"))
                url_sc = normalize_https_url(sc_item.get("schoolUrl"))
                if not nm_sc or contains_banned_phrase(nm_sc) or (url_sc and contains_banned_phrase(url_sc)):
                    continue
                if len(clean_schools) < 6:
                    clean_schools.append(
                        {
                            "id": sc_item["id"],
                            "name": nm_sc,
                            "studentSize": sc_item["studentSize"],
                            "ownership": sanitize_dashes(sc_item["ownership"]),
                            "schoolUrl": url_sc,
                            "lat": sc_item["lat"],
                            "lng": sc_item["lng"],
                        }
                    )
            if clean_schools:
                c["higherEducation"] = {
                    "institutionCount": len(raw_schools),
                    "totalEnrollment": total_enroll,
                    "institutions": clean_schools,
                    "sourceName": "U.S. Department of Education College Scorecard",
                    "sourceUrl": "https://collegescorecard.ed.gov/",
                    "retrieved": TODAY,
                }
                stats_counter["with_colleges"] += 1
            else:
                c.pop("higherEducation", None)

            # 9. DOE / NLR AFDC Public EV Charging Stations
            ev_matches: List[Dict[str, Any]] = []
            seen_ev_ids: Set[Any] = set()
            for v in variants:
                for ev_st in ev_by_city.get((st_up, v), []):
                    ev_id = ev_st.get("id")
                    if ev_id not in seen_ev_ids:
                        seen_ev_ids.add(ev_id)
                        ev_matches.append(ev_st)

            if ev_matches:
                dc_ports = 0
                l2_ports = 0
                l1_ports = 0
                ranked_ev: List[Tuple[int, int, Dict[str, Any]]] = []
                for ev_st in ev_matches:
                    dc = int(ev_st.get("ev_dc_fast_num") or 0)
                    l2 = int(ev_st.get("ev_level2_evse_num") or 0)
                    l1 = int(ev_st.get("ev_level1_evse_num") or 0)
                    dc_ports += dc
                    l2_ports += l2
                    l1_ports += l1
                    if ev_st.get("latitude") is None or ev_st.get("longitude") is None:
                        continue
                    st_nm = sanitize_dashes(ev_st.get("station_name"))
                    st_str = normalize_street_address(str(ev_st.get("street_address") or ""))
                    st_ct = sanitize_dashes(ev_st.get("city") or new_name)
                    st_zp = str(ev_st.get("zip") or "").strip()
                    st_addr = f"{st_str}, {st_ct}, {st_up} {st_zp}".strip(" ,")
                    st_net = sanitize_dashes(ev_st.get("ev_network") or "Non-Networked")
                    if not st_nm or not st_str or any(contains_banned_phrase(val) for val in (st_nm, st_addr, st_net)):
                        continue
                    ranked_ev.append(
                        (
                            -(dc + l2 + l1),
                            -dc,
                            {
                                "name": st_nm,
                                "address": st_addr,
                                "network": st_net,
                                "dcFastPorts": dc,
                                "level2Ports": l2,
                                "lat": round(float(ev_st["latitude"]), 6),
                                "lng": round(float(ev_st["longitude"]), 6),
                            },
                        )
                    )
                ranked_ev.sort(key=lambda x: (x[0], x[1]))
                c["evInfrastructure"] = {
                    "totalStations": len(ev_matches),
                    "totalChargingPorts": dc_ports + l2_ports + l1_ports,
                    "dcFastPorts": dc_ports,
                    "level2Ports": l2_ports,
                    "sampleStations": [x[2] for x in ranked_ev[:5]],
                    "sourceName": "U.S. Department of Energy / NLR Alternative Fuels Data Center (AFDC)",
                    "sourceUrl": "https://afdc.energy.gov/stations",
                    "retrieved": TODAY,
                }
                stats_counter["with_ev"] += 1
            else:
                c.pop("evInfrastructure", None)

            # 10. National Park Service Units within 55.0 miles Haversine (cross-state aware)
            matched_parks: List[Dict[str, Any]] = []
            for pk in nps_parks:
                if pk["latitude"] is None or pk["longitude"] is None:
                    continue
                dist_pk = round(enrich_city.hav(gla, gln, pk["latitude"], pk["longitude"]), 1)
                if dist_pk > 55.0:
                    continue
                p_name = sanitize_dashes(pk.get("fullName"))
                p_des = sanitize_dashes(pk.get("designation") or "National Park System Unit")
                p_desc = truncate_clean(pk.get("description") or "", max_len=240)
                p_url = normalize_https_url(pk.get("url"))
                if not p_name or not p_url or any(contains_banned_phrase(val) for val in (p_name, p_des, p_desc, p_url)):
                    continue
                matched_parks.append(
                    {
                        "parkCode": str(pk.get("parkCode") or ""),
                        "fullName": p_name,
                        "designation": p_des,
                        "distanceMiles": dist_pk,
                        "description": p_desc,
                        "url": p_url,
                        "lat": round(float(pk["latitude"]), 6),
                        "lng": round(float(pk["longitude"]), 6),
                    }
                )
            matched_parks.sort(key=lambda x: x["distanceMiles"])
            if matched_parks:
                c["nationalParks"] = {
                    "parks": matched_parks[:5],
                    "sourceName": "U.S. National Park Service",
                    "sourceUrl": "https://www.nps.gov/",
                    "retrieved": TODAY,
                }
                stats_counter["with_nps"] += 1
            else:
                c.pop("nationalParks", None)

            rebuilt_count += 1

        sf.write_text(json.dumps(arr, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    SLUG_MIGRATIONS_PATH.write_text(
        json.dumps(dict(sorted(slug_migrations.items())), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    elapsed = time.time() - t0
    print("\n=========================================================", flush=True)
    print(f"✨ Completed Primary-Source Rebuild of {rebuilt_count} cities + {stats_counter['flagships_preserved']} preserved flagships in {elapsed:.1f}s!", flush=True)
    print(f"   Slug migrations recorded in {SLUG_MIGRATIONS_PATH.name}: {len(slug_migrations)}", flush=True)
    for k, v in sorted(stats_counter.items()):
        print(f"   - {k}: {v}", flush=True)
    print("=========================================================", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
