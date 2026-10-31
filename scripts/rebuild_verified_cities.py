#!/usr/bin/env python3
"""Rebuild demographics, housing, industries, and core Census geography for the certified cities from Census bulk files ONLY.
Sources (no API key needed when bulk cache present; census_env hydrates local cache if needed):
  ACS 2023 5-yr table-based SF (B01003,B19013,B19301,B25077,B25064,B01002,B25103) - www2.census.gov
  Census 2023 Places Gazetteer (2023_Gaz_place_national.zip)
  Census ZIP Business Patterns 2022 (zbp22detail) ; Population Estimates sub-est2023
Rule: a value that cannot be computed from these files is left out (blank beats wrong)."""
import collections
import csv
import datetime
import json
import os
import zipfile

from census_env import resolve_census_dir

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
A = resolve_census_dir(need_acs=True, need_popest=True, need_gazetteer=True, need_zbp=True)
NOW = datetime.date.today().isoformat()
VERIFIED_AT = f"{NOW}T00:00:00Z"

# slug -> (state_file, zbp_usps_city, state_abbr, acs_geoid, state_fips, popest_name, display_name, county_fips, county_name)
CITIES = {
    'tx/austin': (
        'tx', 'AUSTIN', 'TX', '1600000US4805000', '48', 'Austin city',
        'Austin', '48453', 'Travis County',
    ),
    'id/boise': (
        'id', 'BOISE', 'ID', '1600000US1608830', '16', 'Boise City city',
        'Boise', '16001', 'Ada County',
    ),
    'fl/tampa': (
        'fl', 'TAMPA', 'FL', '1600000US1271000', '12', 'Tampa city',
        'Tampa', '12057', 'Hillsborough County',
    ),
    'az/scottsdale': (
        'az', 'SCOTTSDALE', 'AZ', '1600000US0465000', '04', 'Scottsdale city',
        'Scottsdale', '04013', 'Maricopa County',
    ),
    'tn/nashville': (
        'tn', 'NASHVILLE', 'TN', '1600000US4752006', '47', 'Nashville-Davidson metropolitan government (balance)',
        'Nashville', '47037', 'Davidson County',
    ),
    'ok/oklahoma-city': (
        'ok', 'OKLAHOMA CITY', 'OK', '1600000US4055000', '40', 'Oklahoma City city',
        'Oklahoma City', '40109', 'Oklahoma County',
    ),
    'ar/hot-springs-village': (
        'ar', 'HOT SPRINGS VILLAGE', 'AR', '1600000US0533482', '05', None,
        'Hot Springs Village', '05051', 'Garland County',
    ),
    'ar/hot-springs': (
        'ar', 'HOT SPRINGS NATIONAL PARK', 'AR', '1600000US0533400', '05', 'Hot Springs city',
        'Hot Springs', '05051', 'Garland County',
    ),
}


def load_acs(t):
    d = {}
    with open(f'{A}23_{t}.dat', encoding='utf-8') as fh:
        for l in fh:
            p = l.rstrip('\n').split('|')
            if len(p) > 1:
                d[p[0]] = p[1]
    return d


def load_gazetteer():
    gaz = {}
    z = zipfile.ZipFile(f'{A}2023_Gaz_place_national.zip')
    rows = z.read(z.namelist()[0]).decode('latin1').splitlines()
    for l in rows[1:]:
        f = l.split('\t')
        if len(f) >= 12:
            gaz[f[1].strip()] = (round(float(f[10].strip()), 6), round(float(f[11].strip()), 6))
    return gaz


T = {k: load_acs(k) for k in ['b01003', 'b19013', 'b19301', 'b25077', 'b25064', 'b01002', 'b25103']}
GAZ = load_gazetteer()
num = lambda v: (None if v in (None, '', '.', '-', 'N') else float(v))

pop_est = {}
with open(A + 'popest.csv', encoding='latin1') as fh:
    for r in csv.DictReader(fh):
        if r['SUMLEV'] == '162':
            pop_est[(r['STATE'], r['NAME'])] = r

defs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'naics_defs.json'), encoding='utf-8'))
codes = {d['naicsCode'] for d in defs}
zbp = zipfile.ZipFile(A + 'zbp22.zip').open('zbp22detail.txt').read().decode('latin1').splitlines()

est = collections.defaultdict(lambda: collections.defaultdict(int))
us = collections.defaultdict(int)
zcity = collections.defaultdict(set)
ztot = collections.defaultdict(int)
want = {(c[1].upper(), c[2]) for c in CITIES.values()}

for r in csv.DictReader(zbp):
    n = r['naics']
    e = int(r['est'])
    if n in codes:
        us[n] += e
    k = (r['city'].upper(), r['stabbr'])
    if k in want:
        if n == '------':
            zcity[k].add(r['zip'])
            ztot[(k, r['zip'])] = e
        if n in codes:
            est[(k, r['zip'])][n] += e

USPOP = num(T['b01003']['0100000US'])
print('US pop', USPOP)

for slug, (st, nm, ab, gid, fips, pname, display_name, county_fips, county_name) in CITIES.items():
    fn = os.path.join(ROOT, 'src', 'data', 'cities', f'{st}.json')
    with open(fn, encoding='utf-8') as fh:
        data = json.load(fh)
    c = [x for x in data if x['slug'] == slug][0]

    # 1. Core normalized identity & Census 2023 Gazetteer coordinates
    place_geoid = gid.split('US')[1]
    c['cityId'] = place_geoid
    c['name'] = display_name
    c['stateCode'] = st
    c['countyFips'] = county_fips
    c['countyName'] = county_name
    gaz_coords = GAZ.get(place_geoid)
    if slug == 'tx/austin' and c.get('lat') is not None and c.get('lng') is not None:
        pass  # Keep Austin's approved reference coordinates (30.2672, -97.7431)
    elif gaz_coords:
        c['lat'], c['lng'] = gaz_coords

    # 2. Purge fabricated V1 keys cleanly
    for bad_key in ('laborAndEconomy', 'scores', 'topTrafficCorridors'):
        c.pop(bad_key, None)
    c['marketSignals'] = {}

    # 3. Demographics (Census SUB-EST2023 SUMLEV=162 where incorporated; ACS B01003 for unincorporated CDPs)
    d = c.setdefault('demographics', {})
    r = pop_est.get((fips, pname)) if pname else None
    pop = int(r['POPESTIMATE2023']) if r else int(num(T['b01003'][gid]))
    base = int(r['ESTIMATESBASE2020']) if r else None
    ACSP = {
        'sourceName': 'US Census Bureau ACS 5-Year Estimates 2023 (Table-Based Summary File)',
        'sourceUrl': 'https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/',
        'datasetVintage': 'ACS-2023-5YR',
        'verifiedAt': VERIFIED_AT,
        'granularity': 'place',
    }
    for k in ['popGrowth5YrPct', 'daytimeWorkerPop', 'daytimePopSurgePct', 'daytimePopulation']:
        d.pop(k, None)
    d.update({
        'population': pop,
        'medianHouseholdIncome': int(num(T['b19013'][gid])),
        'perCapitaIncome': int(num(T['b19301'][gid])),
        'medianAge': num(T['b01002'][gid]),
        'medianGrossRent': int(num(T['b25064'][gid])),
        'medianHomeValue': int(num(T['b25077'][gid])),
        'provenance': ACSP,
    })
    if base:
        d['popChange2020to2023Pct'] = round((pop / base - 1) * 100, 1)
        d['popChangeBasis'] = 'Census Population Estimates, April 2020 base to July 2023'
    else:
        d.pop('popChange2020to2023Pct', None)
        d.pop('popChangeBasis', None)

    # 4. Housing & effective property tax rate
    tax = num(T['b25103'][gid])
    hv = num(T['b25077'][gid])
    c['housingAndTaxes'] = {
        'medianHomeValue': int(hv),
        'medianGrossRent': int(num(T['b25064'][gid])),
        'medianRealEstateTaxPaid': int(tax) if tax else None,
        'effectivePropertyTaxRatePct': round(tax / hv * 100, 2) if tax and hv else None,
        'countyName': county_name,
        'source': 'ACS 2023 5-yr: B25077 median home value, B25064 median gross rent, B25103 median real estate taxes paid. Effective rate = B25103 / B25077.',
        'sourceUrl': ACSP['sourceUrl'],
    }

    # 5. ZBP 2022 + ACS 2023 ZCTA small-business trade density
    key = (nm.upper(), ab)
    zips = sorted(zcity[key])
    zp = {z: num(T['b01003'].get('860Z200US' + z)) for z in zips}
    use = [z for z in zips if zp[z] and zp[z] > 0]
    zpop = sum(zp[z] for z in use)
    c['primaryZips'] = sorted(use, key=lambda z: -ztot[(key, z)])[:12]

    inds = []
    for df in defs:
        n = df['naicsCode']
        e = sum(est[(key, z)].get(n, 0) for z in use)
        usd = us[n] / USPOP * 10000
        p10 = e / zpop * 10000
        idx = round(p10 / usd * 100) if usd else None
        status = 'underserved' if idx < 80 else ('saturated' if idx > 120 else 'balanced')
        expected = usd * zpop / 10000
        if usd < 0.3 or expected < 2.0:  # suppress statistically tiny micro-trades while preserving mid/small city trades
            continue
        quote = (
            f"{e} employer establishments (NAICS {n}) across {len(use)} ZIP codes whose USPS city is "
            f"{nm.title()}, {ab}; density uses ACS 2023 ZCTA population ({int(zpop):,}). "
            f"National benchmark = all US ZIP rows / US population."
        )[:280]
        inds.append({
            **df,
            'establishments': e,
            'per10kResidents': round(p10, 2),
            'usAvgPer10k': round(usd, 2),
            'saturationIndex': idx,
            'status': status,
            'smallSample': expected < 10,
            'provenance': {
                'sourceName': 'US Census Bureau ZIP Code Business Patterns 2022',
                'sourceUrl': 'https://www2.census.gov/programs-surveys/cbp/datasets/2022/zbp22detail.zip',
                'datasetVintage': 'ZBP-2022',
                'verifiedAt': VERIFIED_AT,
                'granularity': 'zcta_aggregated',
                'evidenceQuote': quote,
            },
        })
    c['industries'] = inds

    with open(fn, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, indent=2)

    sc = collections.Counter(i['status'] for i in inds)
    print(
        f"{slug:24} pop {pop:>7,} MHI {d['medianHouseholdIncome']:>7,} home {int(hv):>7,} "
        f"tax {c['housingAndTaxes']['effectivePropertyTaxRatePct']}% chg {d.get('popChange2020to2023Pct')} "
        f"lat {c.get('lat')} lng {c.get('lng')} zips {len(use)} zpop {int(zpop):,} trades {len(inds)} {dict(sc)}"
    )
