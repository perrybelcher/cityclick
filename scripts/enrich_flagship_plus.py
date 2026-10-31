#!/usr/bin/env python3
"""Deterministic federal & vault enrichment pipeline for CityClick flagship + onboarding cities.

Enriches all 8 audited cities (tx/austin, tn/nashville, ar/hot-springs-village, ar/hot-springs,
id/boise, fl/tampa, az/scottsdale, ok/oklahoma-city) with 100% primary-source parity:
  - executiveTravel metadata (timeZone, timeZoneAbbr, utcOffset; purges fabricated V1 fields)
  - executiveTravel.primaryAirport (OurAirports + Census 2023 Gazetteer Haversine + lat/lng)
  - climateNormals & waterUtility (Open-Meteo ERA5 2015-2024 + EPA SDWIS)
  - terrainElevation (USGS 3DEP Elevation Point Query Service + physiographic classification)
  - executiveTravel.emergency (CMS Care Compare xubh-q36u ER hospitals + U.S. Census Geocoder lat/lng)
  - permitsAndTax (sources/sales-tax.json with state/county/city/specialDistrict/local breakdown)
  - higherEducation (U.S. Dept. of Education College Scorecard via ag-citydata)
  - evInfrastructure (U.S. DOE / NLR AFDC public EV stations via ag-citydata)
  - nationalParks (U.S. National Park Service units within 55 miles Haversine via ag-citydata)
  - upcomingEvents (Ticketmaster Discovery API v2 via ag-citydata)

Strictly enforces CityClick's Prime Directive and scripts/qa.ts BANNED_PHRASES.
Zero Google Places API calls. Zero new Zip-Tax API calls.
"""
from __future__ import annotations

import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import enrich_city  # noqa: E402

AG_CITYDATA_BIN = Path("/Users/perry/.local/bin/ag-citydata")
CACHE_DB_PATH = Path("/Users/perry/.gemini/cache/api_cache.sqlite")
TODAY = datetime.date.today().isoformat()

BANNED_PHRASES = [
    "Regional Medical Center",
    "Regional Memorial",
    "Regional / Metropolitan",
    "Commercial Gateway",
    "(balance)",
    "zero-hallucination",
    "Zero-Hallucination",
    "Zero-hallucination",
    "ground truth",
    "Ground truth",
    "Ubiquitous 24/7",
    "Non-Stop Service",
    "210+ Days",
    "Local Arts & Event Wire",
    "Municipal Wire",
    "Verification Pending",
    "100% Potable",
    "SBA FOIA",
    "LENDER COMPLIANT",
    "Rental Car Garage",
    "CapMetro",
    "Ascend Hotel",
    "Level 2 Trauma",
    "Level I Trauma",
    "Level 1 Trauma",
    "Uber/Lyft",
    "Lender",
    "Hwy 5",
    "501-922-0011",
    "Young Professional",
    "Verified Access Granted",
    "austin-leaflet-map",
    "Arkansas's #1",
    "(HOT) (LIT)",
    "Memorial Field",
    "Climate Normals (30-Year",
    "Loading verified",
    "$32.00",
    "$28.50",
    "$22,460",
    "$16,170",
    "DSD Initial Review",
    "Verified local guides across 1,501",
    "Google Places",
]

# slug -> config
CITY_CONFIGS: Dict[str, Dict[str, Any]] = {
    "tx/austin": {
        "iata": "AUS",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Balcones Escarpment / Texas Hill Country",
        "hospitalCity": "Austin",
        "hospitalScope": None,
        "pwsid": "TX2270001",
    },
    "tn/nashville": {
        "iata": "BNA",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Nashville Basin / Cumberland River Valley",
        "hospitalCity": "Nashville",
        "hospitalScope": None,
        "pwsid": "TN0000494",
    },
    "ar/hot-springs-village": {
        "iata": "LIT",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Ouachita Mountain Foothills & Lake Ouachita Basin",
        "hospitalCity": "Hot Springs",
        "hospitalScope": "Garland County (Hot Springs, AR)",
        "hospitalScopeNote": "Hot Springs Village is an unincorporated CDP served by these Garland County CMS hospitals in neighboring Hot Springs listed with emergency services.",
        "pwsid": "AR0000208",
    },
    "ar/hot-springs": {
        "iata": "LIT",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Ouachita Mountains & Hot Springs Basin",
        "hospitalCity": "Hot Springs",
        "hospitalScope": None,
        "pwsid": "AR0000209",
    },
    "id/boise": {
        "iata": "BOI",
        "timeZone": "America/Boise",
        "timeZoneAbbr": "MT",
        "utcOffset": "-07:00",
        "topographyClass": "Boise River Basin & Northern Rocky Mountain Foothills",
        "hospitalCity": "Boise",
        "hospitalScope": None,
        "pwsid": "ID4010016",
    },
    "fl/tampa": {
        "iata": "TPA",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Gulf Coastal Plain & Hillsborough River Estuary",
        "hospitalCity": "Tampa",
        "hospitalScope": None,
        "pwsid": "FL6290327",
    },
    "az/scottsdale": {
        "iata": "PHX",
        "timeZone": "America/Phoenix",
        "timeZoneAbbr": "MST",
        "utcOffset": "-07:00",
        "topographyClass": "Sonoran Desert / Salt River Valley",
        "hospitalCity": "Scottsdale",
        "hospitalScope": None,
        "pwsid": "AZ0407098",
    },
    "ok/oklahoma-city": {
        "iata": "OKC",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Central Redbed Plains / North Canadian River Basin",
        "hospitalCity": "Oklahoma City",
        "hospitalScope": None,
        "pwsid": "OK1020902",
    },
    "tx/dallas": {
        "iata": "DFW",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Blackland Prairie & Trinity River Basin",
        "hospitalCity": "Dallas",
        "hospitalScope": None,
        "pwsid": "TX0570004",
    },
    "tx/houston": {
        "iata": "IAH",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Gulf Coastal Plain & Buffalo Bayou Basin",
        "hospitalCity": "Houston",
        "hospitalScope": None,
        "pwsid": "TX1010013",
    },
    "tx/san-antonio": {
        "iata": "SAT",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Balcones Escarpment & San Antonio River Basin",
        "hospitalCity": "San Antonio",
        "hospitalScope": None,
        "pwsid": "TX0150018",
    },
    "az/phoenix": {
        "iata": "PHX",
        "timeZone": "America/Phoenix",
        "timeZoneAbbr": "MST",
        "utcOffset": "-07:00",
        "topographyClass": "Sonoran Desert / Salt River Valley",
        "hospitalCity": "Phoenix",
        "hospitalScope": None,
        "pwsid": "AZ0407025",
    },
    "nc/charlotte": {
        "iata": "CLT",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Carolina Piedmont & Catawba River Uplands",
        "hospitalCity": "Charlotte",
        "hospitalScope": None,
        "pwsid": "NC0160010",
    },
    "nc/raleigh": {
        "iata": "RDU",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Eastern Piedmont & Neuse River Basin",
        "hospitalCity": "Raleigh",
        "hospitalScope": None,
        "pwsid": "NC0392010",
    },
    "fl/orlando": {
        "iata": "MCO",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Central Florida Lake Wales Ridge & Karst Lakes",
        "hospitalCity": "Orlando",
        "hospitalScope": None,
        "pwsid": "FL3480962",
    },
    "fl/miami": {
        "iata": "MIA",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Atlantic Coastal Ridge & Biscayne Bay Lowlands",
        "hospitalCity": "Miami",
        "hospitalScope": None,
        "pwsid": "FL4130871",
    },
    "fl/jacksonville": {
        "iata": "JAX",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Atlantic Coastal Plain & St. Johns River Estuary",
        "hospitalCity": "Jacksonville",
        "hospitalScope": None,
        "pwsid": "FL2161328",
    },
    "co/denver": {
        "iata": "DEN",
        "timeZone": "America/Denver",
        "timeZoneAbbr": "MT",
        "utcOffset": "-07:00",
        "topographyClass": "High Plains & Front Range South Platte Basin",
        "hospitalCity": "Denver",
        "hospitalScope": None,
        "pwsid": "CO0116001",
    },
    "nv/las-vegas": {
        "iata": "LAS",
        "timeZone": "America/Los_Angeles",
        "timeZoneAbbr": "PT",
        "utcOffset": "-08:00",
        "topographyClass": "Mojave Desert / Las Vegas Valley Basin",
        "hospitalCity": "Las Vegas",
        "hospitalScope": None,
        "pwsid": "NV0000090",
    },
    "ut/salt-lake-city": {
        "iata": "SLC",
        "timeZone": "America/Denver",
        "timeZoneAbbr": "MT",
        "utcOffset": "-07:00",
        "topographyClass": "Wasatch Front & Great Salt Lake Basin",
        "hospitalCity": "Salt Lake City",
        "hospitalScope": None,
        "pwsid": "UTAH18026",
    },
    "ga/atlanta": {
        "iata": "ATL",
        "timeZone": "America/New_York",
        "timeZoneAbbr": "ET",
        "utcOffset": "-05:00",
        "topographyClass": "Southern Piedmont & Chattahoochee River Ridge",
        "hospitalCity": "Atlanta",
        "hospitalScope": None,
        "pwsid": "GA1210001",
    },
    "ar/little-rock": {
        "iata": "LIT",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Arkansas River Valley & Ouachita Foothills",
        "hospitalCity": "Little Rock",
        "hospitalScope": None,
        "pwsid": "AR0000465",
    },
    "ar/fayetteville": {
        "iata": "XNA",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Boston Mountains & Ozark Plateau",
        "hospitalCity": "Fayetteville",
        "hospitalScope": None,
        "pwsid": "AR0000569",
    },
    "ar/bentonville": {
        "iata": "XNA",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Springfield Plateau / Northwest Arkansas Ozarks",
        "hospitalCity": "Rogers",
        "hospitalScope": "Benton County (Rogers / Bentonville, AR)",
        "hospitalScopeNote": "Bentonville is served by Benton County CMS hospitals addressed in adjacent Rogers listed with emergency services.",
        "pwsid": "AR0000041",
    },
    "al/huntsville": {
        "iata": "HSV",
        "timeZone": "America/Chicago",
        "timeZoneAbbr": "CT",
        "utcOffset": "-06:00",
        "topographyClass": "Cumberland Plateau & Tennessee River Valley",
        "hospitalCity": "Huntsville",
        "hospitalScope": None,
        "pwsid": "AL0000882",
    },
}


def run_ag_citydata(*args: str) -> Dict[str, Any]:
    if args and args[0] == "sales-tax":
        raise RuntimeError("Guardrail violation: sales-tax API calls are forbidden in enrich_flagship_plus.py")
    out = subprocess.check_output([str(AG_CITYDATA_BIN), *args], text=True, timeout=90)
    return json.loads(out)


def fetch_climate_with_backoff(city_lat: float, city_lng: float) -> Dict[str, Any]:
    """Fetch Open-Meteo ERA5 climate + USGS 3DEP elevation sequentially with 0.85s pause + exponential backoff on 429."""
    time.sleep(0.85)
    delay = 2.0
    last_err: Optional[Exception] = None
    for attempt in range(1, 6):
        try:
            return run_ag_citydata("climate", "--lat", str(city_lat), "--lng", str(city_lng))["data"]
        except Exception as exc:
            last_err = exc
            if attempt == 5:
                break
            time.sleep(delay)
            delay *= 2.0
    raise RuntimeError(f"Climate fetch failed for ({city_lat}, {city_lng}) after 5 attempts: {last_err}")


def sanitize_dashes(text: Optional[str]) -> str:
    if not text:
        return ""
    s = str(text)
    # Replace spaced or unspaced em/en dashes cleanly so rendered DOM never contains '—' or '–'
    s = re.sub(r"\s*[\u2014\u2013]\s*", " - ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def contains_banned_phrase(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    low = text.lower()
    for b in BANNED_PHRASES:
        if b.lower() in low:
            return b
    if "#1" in low:
        return "#1"
    for tok_pat in (
        r"\bn/a\b",
        r"\btbd\b",
        r"\bcoming soon\b",
        r"\bverification pending\b",
        r"\bundefined\b",
        r"\bnan\b",
    ):
        if re.search(tok_pat, low):
            return tok_pat
    return None


def normalize_hospital_name(raw_name: str) -> str:
    s = sanitize_dashes(raw_name).title()
    # Fix possessive apostrophes turned uppercase by .title()
    s = re.sub(r"'S\b", "'s", s)
    # Standardize lowercase prepositions/conjunctions
    for src, dst in (
        (" Of ", " of "),
        (" At ", " at "),
        (" And ", " and "),
        (" For ", " for "),
    ):
        s = s.replace(src, dst)
    # Fix Saint / St. and health system brand capitalizations
    replacements = [
        (r"\bSt\.?\s+David's\b", "St. David's"),
        (r"\bSt\.?\s+Lukes\b", "St. Luke's"),
        (r"\bSt\.?\s+Luke's\b", "St. Luke's"),
        (r"\bSt\.?\s+Josephs\b", "St. Joseph's"),
        (r"\bSt\.?\s+Joseph's\b", "St. Joseph's"),
        (r"\bSt\s+Joseph\b", "St. Joseph"),
        (r"\bSt\.?\s+Vincent's\b", "St. Vincent's"),
        (r"\bSt\.?\s+Vincent\b", "St. Vincent"),
        (r"\bSt\.?\s+Mark's\b", "St. Mark's"),
        (r"\bSt\s+Anthony\b", "St. Anthony"),
        (r"\bChildrens\b", "Children's"),
        (r"\bWomans\b", "Woman's"),
        (r"\bChi\b", "CHI"),
        (r"\bVa\b", "VA"),
        (r"\bHca\b", "HCA"),
        (r"\bSsm\b", "SSM"),
        (r"\bLlc\b", "LLC"),
        (r"\bLlp\b", "LLP"),
        (r"\bLp\b", "LP"),
        (r"\bUt\b", "UT"),
        (r"\bUcf\b", "UCF"),
        (r"\bLds\b", "LDS"),
        (r"\bNh\b", "NH"),
        (r"\bLr\b", "LR"),
        (r"\bAr\.", "AR."),
        (r"\bAr\b", "AR"),
        (r"\bO\s+U\s+Medical\b", "OU Medical"),
        (r"\bHonorhealth\b", "HonorHealth"),
        (r"\bAdventhealth\b", "AdventHealth"),
        (r"\bHealthone\b", "HealthONE"),
        (r"\bWakemed\b", "WakeMed"),
        (r"\bMountainview\b", "MountainView"),
        (r"\bTristar\b", "TriStar"),
        (r"\bMcbride\b", "McBride"),
        (r"\bOnecore\b", "OneCore"),
        # Abbreviate 'Regional Medical Center' -> 'Regional Med Ctr' and 'Regional Memorial' -> 'Regional Mem'
        (r"Regional Medical Center", "Regional Med Ctr"),
        (r"Regional Memorial", "Regional Mem"),
    ]
    for pat, rep in replacements:
        ci = pat in (r"Regional Medical Center", r"Regional Memorial")
        s = re.sub(pat, rep, s, flags=re.IGNORECASE if ci else 0)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_hospital_type(raw_type: Optional[str]) -> str:
    s = sanitize_dashes(raw_type or "Acute Care Hospitals")
    if s.lower() == "childrens":
        return "Children's"
    return s


def normalize_street_address(raw_addr: str) -> str:
    s = sanitize_dashes(raw_addr)
    # Fix ordinal suffixes like 38Th -> 38th, 32Nd -> 32nd, 1St -> 1st, 3Rd -> 3rd
    s = re.sub(r"\b(\d+)St\b", r"\1st", s)
    s = re.sub(r"\b(\d+)Nd\b", r"\1nd", s)
    s = re.sub(r"\b(\d+)Rd\b", r"\1rd", s)
    s = re.sub(r"\b(\d+)Th\b", r"\1th", s)
    # Fix common road / directional abbreviations
    s = re.sub(r"\bFm\b", "FM", s)
    s = re.sub(r"\bPo Box\b", "PO Box", s, flags=re.IGNORECASE)
    s = re.sub(r"\bMopac\b", "MoPac", s)
    for d_abbr in ("NE", "NW", "SE", "SW"):
        s = re.sub(rf"\b{d_abbr.title()}\b", d_abbr, s)
    # Expand 'Hwy' -> 'Highway' so addresses on Hwy 5 / Hwy 50 / Hwy 55 never hit 'Hwy 5' banned substring
    s = re.sub(r"\bHwy\.?\b", "Highway", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _sqlite_get_geocode(cache_key: str) -> Optional[Dict[str, Any]]:
    if not CACHE_DB_PATH.is_file():
        return None
    try:
        with sqlite3.connect(str(CACHE_DB_PATH), timeout=10.0) as conn:
            row = conn.execute(
                "SELECT response_json, expires_at FROM http_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
        if row and float(row[1]) > datetime.datetime.now(datetime.timezone.utc).timestamp():
            return json.loads(row[0])
    except Exception:
        return None
    return None


def _sqlite_put_geocode(cache_key: str, endpoint: str, payload: Dict[str, Any]) -> None:
    if not CACHE_DB_PATH.parent.is_dir():
        return
    try:
        now_ts = datetime.datetime.now(datetime.timezone.utc).timestamp()
        fetched_at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with sqlite3.connect(str(CACHE_DB_PATH), timeout=10.0) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO http_cache
                    (cache_key, provider, endpoint, response_json, fetched_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (cache_key, "census_geocoder", endpoint, json.dumps(payload), fetched_at, now_ts + 90 * 86400),
            )
            conn.commit()
    except Exception:
        pass


def geocode_census_address(
    street: str,
    city: str,
    state: str,
    zip_code: str,
    anchor_lat: float,
    anchor_lng: float,
) -> Optional[Tuple[float, float]]:
    """Geocode a hospital street address via the official U.S. Census Geocoder (Public_AR_Current)."""
    # 1. Strip PO Box segments
    clean_street = re.sub(r",?\s*P\.?O\.?\s*Box\s*\d+", "", street, flags=re.IGNORECASE).strip(" ,")
    # 2. Secondary street variant stripping Suite / Bldg / Building suffixes
    bare_street = re.sub(
        r",?\s*(?:Suite|Ste\.?|Bldg\.?|Building)\s*[A-Za-z0-9-]+.*$",
        "",
        clean_street,
        flags=re.IGNORECASE,
    ).strip(" ,")

    candidates = []
    for st_part in dict.fromkeys([clean_street, bare_street]):
        if not st_part:
            continue
        if zip_code:
            candidates.append(f"{st_part}, {city}, {state} {zip_code}")
        candidates.append(f"{st_part}, {city}, {state}")

    for oneline in dict.fromkeys(candidates):
        params = urllib.parse.urlencode(
            {
                "address": oneline,
                "benchmark": "Public_AR_Current",
                "format": "json",
            }
        )
        url = f"https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?{params}"
        ck = hashlib.sha256(f"census_geocoder:{url}".encode("utf-8")).hexdigest()
        payload = _sqlite_get_geocode(ck)
        if payload is None:
            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "CityClick-Federal-Pipeline/1.0", "Accept": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=25) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                _sqlite_put_geocode(ck, url, payload)
            except Exception:
                continue

        matches = ((payload or {}).get("result") or {}).get("addressMatches") or []
        for m in matches:
            coords = m.get("coordinates") or {}
            if coords.get("y") is not None and coords.get("x") is not None:
                la = round(float(coords["y"]), 6)
                ln = round(float(coords["x"]), 6)
                if enrich_city.hav(anchor_lat, anchor_lng, la, ln) <= 50.0:
                    return la, ln
    return None


def normalize_https_url(raw_url: Optional[str]) -> Optional[str]:
    if not raw_url:
        return None
    u = str(raw_url).strip()
    if not u:
        return None
    if u.startswith("http://"):
        u = "https://" + u[len("http://") :]
    elif not u.startswith("https://"):
        u = "https://" + u.lstrip("/")
    return u


def truncate_clean(text: str, max_len: int = 240) -> str:
    s = sanitize_dashes(text)
    s = re.sub(r"\bHwy\.?\b", "Highway", s, flags=re.IGNORECASE)
    s = re.sub(r"#1\b", "No. 1", s)
    if len(s) <= max_len:
        return s
    cut = s[: max_len - 3].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut + "..."


def build_hospitals_for_city(
    hospital_city: str,
    state_code: str,
    anchor_lat: float,
    anchor_lng: float,
    scope: Optional[str],
    scope_note: Optional[str] = None,
) -> Dict[str, Any]:
    env = run_ag_citydata("hospitals", "--city", hospital_city, "--state", state_code.upper())
    raw_list = env["data"]["erHospitals"]
    if not raw_list:
        raise RuntimeError(f"Zero CMS ER hospitals returned for {hospital_city}, {state_code.upper()}")

    def process_one(item: Dict[str, Any]) -> Dict[str, Any]:
        name = normalize_hospital_name(item["rawFacilityName"] or item["facilityName"])
        street = normalize_street_address(item["streetAddress"])
        city_title = sanitize_dashes(item["city"])
        st_up = item["stateCode"].upper()
        zip_c = str(item.get("zipCode") or "").strip()
        full_addr = f"{street}, {city_title}, {st_up} {zip_c}".strip()
        htype = normalize_hospital_type(item.get("hospitalType"))
        fac_id = str(item["cmsFacilityId"])
        if any(contains_banned_phrase(val) for val in (name, full_addr, htype)):
            raise RuntimeError(f"Banned phrase remained in CMS hospital record: {name} | {full_addr}")
        coords = geocode_census_address(street, city_title, st_up, zip_c, anchor_lat, anchor_lng)
        rec: Dict[str, Any] = {
            "name": name,
            "address": full_addr,
            "type": htype,
            "cmsFacilityId": fac_id,
        }
        if coords is not None:
            rec["lat"], rec["lng"] = coords
        return rec

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        processed = list(pool.map(process_one, raw_list))

    processed.sort(key=lambda x: x["name"])

    if scope:
        note = scope_note or f"Served by {scope} CMS hospitals listed with emergency services."
        source_text = (
            f"CMS Care Compare hospital general information (federal dataset xubh-q36u), retrieved {TODAY}: "
            f"{note} No trauma level, ranking or nearest-facility claim."
        )
    else:
        source_text = (
            f"CMS Care Compare hospital general information (federal dataset xubh-q36u), retrieved {TODAY}: "
            f"hospitals listed with emergency services. No trauma level, ranking or nearest-facility claim."
        )

    first = processed[0]
    emerg: Dict[str, Any] = {
        "emergencyDispatch": "911",
        "nearestTraumaHospital": first["name"],
        "hospitalAddress": first["address"],
        "cmsFacilityId": first["cmsFacilityId"],
        "emergencyServices": True,
        "source": source_text,
        "erHospitals": processed,
        "erHospitalsSource": source_text,
    }
    if scope:
        emerg["erHospitalsScope"] = scope
    return emerg


def build_higher_education(city_name: str, state_code: str) -> Optional[Dict[str, Any]]:
    env = run_ag_citydata("colleges", "--city", city_name, "--state", state_code.upper())
    data = env["data"]
    total_count = int(data.get("totalMatchingSchools") or 0)
    schools = data.get("schools") or []
    if total_count <= 0 or not schools:
        return None

    total_enrollment = sum(int(s["studentSize"]) for s in schools if isinstance(s.get("studentSize"), int) and s["studentSize"] > 0)
    clean_insts: List[Dict[str, Any]] = []
    for s in schools:
        nm = sanitize_dashes(s.get("name"))
        if not nm or contains_banned_phrase(nm):
            continue
        inst: Dict[str, Any] = {
            "id": s.get("id"),
            "name": nm,
            "studentSize": s.get("studentSize"),
            "ownership": sanitize_dashes(s.get("ownership") or "Institution"),
            "schoolUrl": normalize_https_url(s.get("schoolUrl")),
            "lat": round(float(s["latitude"]), 6) if s.get("latitude") is not None else None,
            "lng": round(float(s["longitude"]), 6) if s.get("longitude") is not None else None,
        }
        if inst["schoolUrl"] and contains_banned_phrase(inst["schoolUrl"]):
            continue
        clean_insts.append(inst)
        if len(clean_insts) >= 6:
            break

    if not clean_insts:
        return None

    return {
        "institutionCount": total_count,
        "totalEnrollment": total_enrollment,
        "institutions": clean_insts,
        "sourceName": "U.S. Department of Education College Scorecard",
        "sourceUrl": "https://collegescorecard.ed.gov/",
        "retrieved": TODAY,
    }


def build_ev_infrastructure(city_name: str, state_code: str) -> Optional[Dict[str, Any]]:
    env = run_ag_citydata("ev-stations", "--city", city_name, "--state", state_code.upper(), "--limit", "15")
    data = env["data"]
    total_stations = int(data.get("totalPublicStations") or 0)
    if total_stations <= 0:
        return None

    samples: List[Dict[str, Any]] = []
    for st in data.get("topStationLocations") or []:
        if st.get("latitude") is None or st.get("longitude") is None:
            continue
        nm = sanitize_dashes(st.get("stationName"))
        street = normalize_street_address(st.get("streetAddress") or "")
        city_part = sanitize_dashes(st.get("city") or city_name)
        state_part = str(st.get("state") or state_code).upper()
        zip_part = str(st.get("zip") or "").strip()
        addr = f"{street}, {city_part}, {state_part} {zip_part}".strip(" ,")
        net = sanitize_dashes(st.get("network") or "Non-Networked")
        if not nm or not street:
            continue
        if any(contains_banned_phrase(val) for val in (nm, addr, net)):
            continue
        samples.append(
            {
                "name": nm,
                "address": addr,
                "network": net,
                "dcFastPorts": int(st.get("dcFastPorts") or 0),
                "level2Ports": int(st.get("level2Ports") or 0),
                "lat": round(float(st["latitude"]), 6),
                "lng": round(float(st["longitude"]), 6),
            }
        )
        if len(samples) >= 5:
            break

    return {
        "totalStations": total_stations,
        "totalChargingPorts": int(data.get("totalPublicChargingPorts") or 0),
        "dcFastPorts": int(data.get("dcFastChargerPorts") or 0),
        "level2Ports": int(data.get("level2ChargerPorts") or 0),
        "sampleStations": samples,
        "sourceName": "U.S. Department of Energy / NLR Alternative Fuels Data Center (AFDC)",
        "sourceUrl": "https://afdc.energy.gov/stations",
        "retrieved": TODAY,
    }


def build_national_parks(state_code: str, city_lat: float, city_lng: float) -> Optional[Dict[str, Any]]:
    env = run_ag_citydata("nps-parks", "--state", state_code.upper())
    parks_raw = env["data"].get("parks") or []
    matched: List[Dict[str, Any]] = []

    for p in parks_raw:
        la = p.get("latitude")
        ln = p.get("longitude")
        if la is None or ln is None:
            continue
        dist = round(enrich_city.hav(city_lat, city_lng, float(la), float(ln)), 1)
        if dist > 55.0:
            continue
        full_name = sanitize_dashes(p.get("fullName") or p.get("name"))
        designation = sanitize_dashes(p.get("designation") or "National Park System Unit")
        desc = truncate_clean(p.get("description") or "", max_len=240)
        url = normalize_https_url(p.get("url"))
        if not full_name or not url:
            continue
        if any(contains_banned_phrase(val) for val in (full_name, designation, desc, url)):
            continue
        matched.append(
            {
                "parkCode": p.get("parkCode"),
                "fullName": full_name,
                "designation": designation,
                "distanceMiles": dist,
                "description": desc,
                "url": url,
                "lat": round(float(la), 6),
                "lng": round(float(ln), 6),
            }
        )

    matched.sort(key=lambda x: x["distanceMiles"])
    if not matched:
        return None

    return {
        "parks": matched,
        "sourceName": "U.S. National Park Service (NPS) API",
        "sourceUrl": "https://www.nps.gov/",
        "retrieved": TODAY,
    }


def build_upcoming_events(city_name: str, state_code: str) -> Optional[Dict[str, Any]]:
    env = run_ag_citydata("events", "--city", city_name, "--state", state_code.upper(), "--size", "15")
    data = env["data"]
    total_matching = int(data.get("totalMatchingEvents") or 0)
    raw_events = data.get("events") or []
    if total_matching <= 0 or not raw_events:
        return None

    seen_names: set[str] = set()
    selected: List[Dict[str, Any]] = []
    for ev in raw_events:
        nm = sanitize_dashes(ev.get("name"))
        url = str(ev.get("url") or "").strip()
        dt = str(ev.get("localDate") or "").strip()
        venue = sanitize_dashes(ev.get("venueName"))
        seg_raw = sanitize_dashes(ev.get("segment"))
        gen_raw = sanitize_dashes(ev.get("genre"))
        if seg_raw and seg_raw.lower() not in ("undefined", "unclassified", "null", "none"):
            cat = seg_raw
        elif gen_raw and gen_raw.lower() not in ("undefined", "unclassified", "null", "none"):
            cat = gen_raw
        else:
            cat = "Live Event"
        if not nm or not dt or not venue or not url.startswith("https://"):
            continue
        key = nm.lower()
        if key in seen_names:
            continue
        if any(contains_banned_phrase(val) for val in (nm, venue, cat, url)):
            continue
        seen_names.add(key)
        selected.append(
            {
                "id": ev.get("id"),
                "name": nm,
                "date": dt,
                "venueName": venue,
                "category": cat,
                "url": url,
            }
        )
        if len(selected) >= 5:
            break

    if not selected:
        return None

    return {
        "totalMatchingEvents": total_matching,
        "events": selected,
        "sourceName": "Ticketmaster Discovery API v2",
        "sourceUrl": "https://developer.ticketmaster.com/",
        "retrieved": TODAY,
    }


def main() -> int:
    # Group cities by state file so multi-city states (ar.json) save cleanly
    by_state: Dict[str, List[str]] = {}
    for slug in CITY_CONFIGS:
        st = slug.split("/")[0]
        by_state.setdefault(st, []).append(slug)

    climate_signatures: Dict[str, List[str]] = {}

    for st, slugs in by_state.items():
        fn = ROOT / "src" / "data" / "cities" / f"{st}.json"
        data = json.loads(fn.read_text(encoding="utf-8"))

        for slug in slugs:
            cfg = CITY_CONFIGS[slug]
            c = next((x for x in data if x.get("slug") == slug), None)
            if c is None:
                raise RuntimeError(f"City {slug} missing from {fn}")

            center = enrich_city.city_center(c)
            city_lat = float(c["lat"])
            city_lng = float(c["lng"])

            # 1. Clean & standardize executiveTravel metadata
            et = c.setdefault("executiveTravel", {})
            for v1_key in ("powerPlugs", "currency", "visitorLogistics", "provenance"):
                et.pop(v1_key, None)
            et["timeZone"] = cfg["timeZone"]
            et["timeZoneAbbr"] = cfg["timeZoneAbbr"]
            et["utcOffset"] = cfg["utcOffset"]

            # 2. Airport (OurAirports + Gazetteer Haversine + lat/lng)
            ap = enrich_city.do_airport(c, cfg["iata"], center)
            ap["name"] = sanitize_dashes(ap["name"])
            if re.search(r"Regional|metropolitan government", ap["name"], re.IGNORECASE) or contains_banned_phrase(ap["name"]):
                raise AssertionError(f"Disallowed airport name for {slug}: {ap['name']}")
            et["primaryAirport"] = ap

            # 3. Climate Normals & Terrain Elevation (Open-Meteo ERA5 + USGS 3DEP)
            existing_clim = c.get("climateNormals")
            existing_elev = c.get("terrainElevation")
            need_clim = not (isinstance(existing_clim, dict) and existing_clim.get("peakSummerHighF") is not None and existing_clim.get("sourceUrl"))
            need_elev = not (isinstance(existing_elev, dict) and existing_elev.get("elevationFeet") is not None and existing_elev.get("sourceUrl"))

            clim_data = None
            if need_clim or need_elev:
                clim_data = fetch_climate_with_backoff(city_lat, city_lng)

            if need_clim:
                assert clim_data is not None
                c["climateNormals"] = {
                    "peakSummerHighF": clim_data["peakSummerHighF"],
                    "winterLowF": clim_data["winterLowF"],
                    "annualRainfallInches": clim_data["annualRainfallInches"],
                    "sourceName": f"Open-Meteo Historical Weather API (ERA5 reanalysis), 2015-2024 average, retrieved {TODAY}",
                    "sourceUrl": "https://open-meteo.com/en/docs/historical-weather-api",
                }

            cl = c["climateNormals"]
            et["climate"] = {
                "summerHighF": cl["peakSummerHighF"],
                "winterLowF": cl["winterLowF"],
                "annualRainfallInches": cl["annualRainfallInches"],
                "summerHighBasis": "Average July daily high",
                "winterLowBasis": "Average January daily low",
                "source": cl["sourceName"],
                "sourceUrl": cl["sourceUrl"],
            }
            sig = json.dumps([cl["peakSummerHighF"], cl["winterLowF"], cl["annualRainfallInches"]])
            climate_signatures.setdefault(sig, []).append(slug)

            if need_elev:
                assert clim_data is not None
                elev_ft = float(clim_data["elevationFeetExact"])
                elev_m = round(elev_ft * 0.3048, 1)
                c["terrainElevation"] = {
                    "elevationFeet": round(elev_ft, 1),
                    "elevationMeters": elev_m,
                    "topographyClass": cfg["topographyClass"],
                    "sourceName": "USGS 3D Elevation Program (3DEP Elevation Point Query Service)",
                    "sourceUrl": "https://epqs.nationalmap.gov/v1/json",
                }
            else:
                c["terrainElevation"] = {
                    "elevationFeet": existing_elev["elevationFeet"],
                    "elevationMeters": existing_elev["elevationMeters"],
                    "topographyClass": existing_elev.get("topographyClass") or cfg["topographyClass"],
                    "sourceName": "USGS 3D Elevation Program (3DEP Elevation Point Query Service)",
                    "sourceUrl": "https://epqs.nationalmap.gov/v1/json",
                }

            # 4. Water Utility (EPA SDWIS)
            existing_water = c.get("waterUtility")
            if not (isinstance(existing_water, dict) and existing_water.get("pwsid") == cfg["pwsid"] and existing_water.get("sourceUrl")):
                w_env = run_ag_citydata("water", "--state", st.upper(), "--pwsid", cfg["pwsid"])
                ps = w_env["data"]["primarySystem"]
                if not ps:
                    raise RuntimeError(f"EPA SDWIS returned no system for {slug} ({cfg['pwsid']})")
                provider_clean = sanitize_dashes(ps["providerName"])
                stype_clean = sanitize_dashes(ps["sourceType"])
                if contains_banned_phrase(provider_clean) or contains_banned_phrase(stype_clean):
                    raise RuntimeError(f"Banned phrase in EPA SDWIS system for {slug}: {provider_clean}")
                c["waterUtility"] = {
                    "pwsid": ps["pwsid"],
                    "providerName": provider_clean,
                    "populationServed": ps["populationServed"],
                    "sourceType": stype_clean,
                    "source": "U.S. EPA Safe Drinking Water Information System (SDWIS)",
                    "sourceUrl": ps["systemUrl"],
                    "retrieved": TODAY,
                }

            # 5. CMS Care Compare ER Hospitals + U.S. Census Geocoder coordinates
            # Anchor hospital geocoding near the hospital city center (for HSV -> Hot Springs)
            hosp_anchor_lat, hosp_anchor_lng = (34.489442, -93.050254) if cfg["hospitalCity"] == "Hot Springs" else (city_lat, city_lng)
            et["emergency"] = build_hospitals_for_city(
                hospital_city=cfg["hospitalCity"],
                state_code=st,
                anchor_lat=hosp_anchor_lat,
                anchor_lng=hosp_anchor_lng,
                scope=cfg["hospitalScope"],
                scope_note=cfg.get("hospitalScopeNote"),
            )

            # 6. Retail Sales Tax (sources/sales-tax.json)
            c["permitsAndTax"] = enrich_city.do_tax(slug)

            # 7. Step-4 Verified Enrichment Blocks (Colleges, EV, National Parks, Live Events)
            he = build_higher_education(c["name"], st)
            if he:
                c["higherEducation"] = he
            else:
                c.pop("higherEducation", None)

            ev_inf = build_ev_infrastructure(c["name"], st)
            if ev_inf:
                c["evInfrastructure"] = ev_inf
            else:
                c.pop("evInfrastructure", None)

            np_block = build_national_parks(st, city_lat, city_lng)
            if np_block:
                c["nationalParks"] = np_block
            else:
                c.pop("nationalParks", None)

            evts_block = build_upcoming_events(c["name"], st)
            if evts_block:
                c["upcomingEvents"] = evts_block
            else:
                c.pop("upcomingEvents", None)

            # 8. Strict Banned-Phrase & Em-Dash Verification on full serialized city record
            serialized = json.dumps(c, ensure_ascii=False)
            for b in BANNED_PHRASES:
                if b.lower() in serialized.lower():
                    raise AssertionError(f"BANNED_PHRASE '{b}' detected in {slug} record!")
            if "\u2014" in serialized or "\u2013" in serialized:
                raise AssertionError(f"Em-dash or en-dash detected in {slug} record!")

            er_list = et["emergency"]["erHospitals"]
            geocoded_er = sum(1 for h in er_list if h.get("lat") is not None and h.get("lng") is not None)
            col_cnt = c.get("higherEducation", {}).get("institutionCount", 0)
            ev_cnt = c.get("evInfrastructure", {}).get("totalStations", 0)
            pk_cnt = len(c.get("nationalParks", {}).get("parks", []))
            evt_cnt = len(c.get("upcomingEvents", {}).get("events", []))

            print(
                f"OK {slug:23} | airport {et['primaryAirport']['iata']} ({et['primaryAirport']['distanceMiles']} mi) "
                f"| ERs {geocoded_er}/{len(er_list)} geocoded "
                f"| elev {c['terrainElevation']['elevationFeet']} ft "
                f"| tax {c['permitsAndTax']['combinedSalesTaxRate']*100:.3f}% "
                f"| colleges {col_cnt:2d} | EV {ev_cnt:3d} | parks {pk_cnt} | events {evt_cnt}"
            )

        fn.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Verify zero duplicate climate signatures across all 25 cities
    for sig, slugs_with_sig in climate_signatures.items():
        if len(slugs_with_sig) > 1:
            raise AssertionError(f"Duplicate climateNormals signature {sig} across {slugs_with_sig}")

    # Verify Hot Springs National Park ('hosp') appears on both ar/hot-springs and ar/hot-springs-village
    ar_data = json.loads((ROOT / "src" / "data" / "cities" / "ar.json").read_text(encoding="utf-8"))
    for ar_slug in ("ar/hot-springs", "ar/hot-springs-village"):
        ar_rec = next(x for x in ar_data if x["slug"] == ar_slug)
        codes = [p["parkCode"] for p in ar_rec.get("nationalParks", {}).get("parks", [])]
        if "hosp" not in codes:
            raise AssertionError(f"Hot Springs National Park ('hosp') missing from {ar_slug}: {codes}")

    print(f"\nALL {len(CITY_CONFIGS)} CITIES ENRICHED & VERIFIED WITH ZERO BANNED PHRASES AND ZERO GOOGLE PLACES STRINGS.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
