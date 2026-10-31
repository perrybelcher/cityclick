#!/usr/bin/env python3
"""Synchronize src/data/index-manifest.json deterministically from src/data/cities/{state}.json.

Ensures 100% parity between city records and index-manifest entries for:
  - name, stateCode, stateName
  - population, popChange2020to2023Pct, medianHouseholdIncome
  - medianHomeValue, medianGrossRent, effectivePropertyTaxRatePct
  - combinedSalesTaxRate
  - timeZone (from executiveTravel.timeZoneAbbr — never a hardcoded default)
  - topUnderservedNaics (up to 3 lowest saturationIndex underserved trade labels)
  - certified (True strictly for the 7 certified flagship slugs)

Purges fabricated V1 fleet fields (reportedRetailRentSqFtYr, overallViability,
purchasingPower, growthMomentum, popGrowth5YrPct) from all rebuilt cities.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
CITIES_DIR = ROOT / "src" / "data" / "cities"
MANIFEST_PATH = ROOT / "src" / "data" / "index-manifest.json"

CERTIFIED_SLUGS = {
    "tx/austin",
    "ar/hot-springs-village",
    "ar/hot-springs",
    "id/boise",
    "fl/tampa",
    "az/scottsdale",
    "tn/nashville",
}

REBUILT_SLUGS = CERTIFIED_SLUGS | {"ok/oklahoma-city"}

FABRICATED_V1_MANIFEST_KEYS = (
    "reportedRetailRentSqFtYr",
    "overallViability",
    "purchasingPower",
    "growthMomentum",
    "popGrowth5YrPct",
)


def load_all_city_records() -> Dict[str, Dict[str, Any]]:
    records: Dict[str, Dict[str, Any]] = {}
    for p in sorted(CITIES_DIR.glob("*.json")):
        arr = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(arr, list):
            continue
        for c in arr:
            if isinstance(c, dict) and c.get("slug"):
                records[str(c["slug"])] = c
    return records


def compute_top_underserved(industries: List[Dict[str, Any]]) -> List[str]:
    underserved = [
        ind
        for ind in industries
        if isinstance(ind, dict) and ind.get("status") == "underserved" and ind.get("label")
    ]
    underserved.sort(key=lambda x: (x.get("saturationIndex", 9999), x.get("per10kResidents", 9999)))
    return [str(ind["label"]) for ind in underserved[:3]]


def main() -> int:
    city_map = load_all_city_records()
    manifest: List[Dict[str, Any]] = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    seen_slugs: set[str] = set()
    updated_rebuilt = 0

    for entry in manifest:
        slug = str(entry.get("slug") or "")
        seen_slugs.add(slug)
        c = city_map.get(slug)
        is_certified = slug in CERTIFIED_SLUGS
        entry["certified"] = is_certified

        if not c:
            continue

        demo = c.get("demographics") or {}
        htax = c.get("housingAndTaxes") or {}
        ptax = c.get("permitsAndTax") or {}
        et = c.get("executiveTravel") or {}

        entry["name"] = c["name"]
        entry["stateCode"] = c["stateCode"]
        entry["stateName"] = c["stateName"]

        if demo.get("population") is not None:
            entry["population"] = demo["population"]
        if demo.get("medianHouseholdIncome") is not None:
            entry["medianHouseholdIncome"] = demo["medianHouseholdIncome"]

        hv = htax.get("medianHomeValue") if htax.get("medianHomeValue") is not None else demo.get("medianHomeValue")
        if hv is not None:
            entry["medianHomeValue"] = hv

        rent = htax.get("medianGrossRent") if htax.get("medianGrossRent") is not None else demo.get("medianGrossRent")
        if rent is not None:
            entry["medianGrossRent"] = rent

        if htax.get("effectivePropertyTaxRatePct") is not None:
            entry["effectivePropertyTaxRatePct"] = htax["effectivePropertyTaxRatePct"]

        if ptax.get("combinedSalesTaxRate") is not None:
            entry["combinedSalesTaxRate"] = ptax["combinedSalesTaxRate"]

        tz_abbr = et.get("timeZoneAbbr")
        if tz_abbr:
            entry["timeZone"] = tz_abbr

        is_rebuilt = (slug in REBUILT_SLUGS) or bool(htax)
        if is_rebuilt:
            entry["popChange2020to2023Pct"] = demo.get("popChange2020to2023Pct")
            entry["topUnderservedNaics"] = compute_top_underserved(c.get("industries") or [])
            for bad_k in FABRICATED_V1_MANIFEST_KEYS:
                entry.pop(bad_k, None)
            updated_rebuilt += 1

    # Ensure any certified/rebuilt city missing from manifest is inserted cleanly
    for slug in sorted(REBUILT_SLUGS - seen_slugs):
        c = city_map.get(slug)
        if not c:
            continue
        demo = c.get("demographics") or {}
        htax = c.get("housingAndTaxes") or {}
        ptax = c.get("permitsAndTax") or {}
        et = c.get("executiveTravel") or {}
        new_entry: Dict[str, Any] = {
            "slug": slug,
            "name": c["name"],
            "stateCode": c["stateCode"],
            "stateName": c["stateName"],
            "population": demo.get("population"),
            "popChange2020to2023Pct": demo.get("popChange2020to2023Pct"),
            "medianHouseholdIncome": demo.get("medianHouseholdIncome"),
            "medianHomeValue": htax.get("medianHomeValue") or demo.get("medianHomeValue"),
            "medianGrossRent": htax.get("medianGrossRent") or demo.get("medianGrossRent"),
            "effectivePropertyTaxRatePct": htax.get("effectivePropertyTaxRatePct"),
            "combinedSalesTaxRate": ptax.get("combinedSalesTaxRate"),
            "topUnderservedNaics": compute_top_underserved(c.get("industries") or []),
            "certified": slug in CERTIFIED_SLUGS,
        }
        if et.get("timeZoneAbbr"):
            new_entry["timeZone"] = et["timeZoneAbbr"]
        manifest.append(new_entry)
        updated_rebuilt += 1

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Synchronized {len(manifest)} manifest entries ({updated_rebuilt} rebuilt cities, {len(CERTIFIED_SLUGS)} certified flagships).")
    for e in manifest:
        if e["slug"] in REBUILT_SLUGS:
            print(f"  {e['slug']:24} certified={str(e['certified']):5} pop={e['population']:>7,} MHI=${e['medianHouseholdIncome']:>7,} tax={e.get('combinedSalesTaxRate')} tz={e.get('timeZone')} underserved={e.get('topUnderservedNaics')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
