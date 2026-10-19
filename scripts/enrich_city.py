#!/usr/bin/env python3
"""enrich_city.py <slug> [--only water,climate,hospital,airport,tax] [--pwsid ID] [--hospital NAME] [--iata CODE] [--write]

Adds SOURCED facts to ONE city record that already exists in src/data/cities/{state}.json.
  climate  : Open-Meteo archive, 2015-2024 averages (automatic, no ambiguity)
  water    : EPA SDWIS community water system. Automatic ONLY if unambiguous; otherwise STOP and pass --pwsid after a human confirms.
  airport  : needs --iata. Verified against OurAirports (public domain). Distance = straight line from the Census Gazetteer city center.
  hospital : needs --hospital NAME. Verified against CMS Care Compare (federal hospital list: name, address, ER services). Without a name it LISTS candidates and STOPs.
  Google Places is NOT used (daily quota; replication must not depend on one key).
  tax      : copied from sources/sales-tax.json if an entry exists; otherwise reported as a GAP and nothing is written.
Dry run by default; --write saves. Exit codes: 0 ok, 2 bad input, 3 gap / needs human confirmation, 4 verification failure.
RULE: never guess. Ambiguity or a missing source => STOP with a code and write nothing for that part."""
import sys, os, json, math, time, csv, argparse, datetime, statistics, collections
import urllib.request, urllib.error

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TODAY = datetime.date.today().isoformat()


class Stop(Exception):
    def __init__(self, code, tag, msg):
        super().__init__(msg); self.code, self.tag, self.msg = code, tag, msg


def retry(fn, n=5):
    for i in range(n):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503) or i == n - 1:
                raise
            time.sleep(8 * (i + 1))


def J(u, t=90):
    return retry(lambda: json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=t)))


def gkey():
    env = {}
    for l in open('/opt/data/secrets/google-maps.env'):
        if '=' in l:
            k, v = l.strip().split('=', 1); env[k] = v.strip('"\'')
    return list(env.values())[0]


def places(q, bias=None, fields='places.displayName,places.formattedAddress,places.location,places.businessStatus,places.types'):
    body = {'textQuery': q}
    if bias:
        body['locationBias'] = {'circle': {'center': {'latitude': bias[0], 'longitude': bias[1]}, 'radius': 30000.0}}
    req = urllib.request.Request('https://places.googleapis.com/v1/places:searchText', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': gkey(), 'X-Goog-FieldMask': fields})
    time.sleep(1.5)
    return retry(lambda: json.load(urllib.request.urlopen(req, timeout=30))).get('places', [])


def hav(a, b, c, d):
    R = 3958.8
    p1, p2 = math.radians(a), math.radians(c)
    x = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def load(slug):
    st = slug.split('/')[0]
    fn = os.path.join(ROOT, 'src', 'data', 'cities', f'{st}.json')
    data = json.load(open(fn))
    c = next((x for x in data if x['slug'] == slug), None)
    if c is None:
        raise Stop(2, 'UNKNOWN_CITY', f'{slug} not in {fn}')
    return fn, data, c


def city_center(c):
    """Census Gazetteer internal point (official, no API key, no quota)."""
    import zipfile
    p = os.path.join(ROOT, 'data', 'census', '2023_Gaz_place_national.zip')
    z = zipfile.ZipFile(p)
    rows = z.read(z.namelist()[0]).decode('latin1').splitlines()
    geoid = c['cityId']
    for l in rows[1:]:
        f = l.split('\t')
        if f[1] == geoid:
            la, ln = float(f[10]), float(f[11].strip())
            if hav(la, ln, c['lat'], c['lng']) > 60:
                raise Stop(4, 'GEOGRAPHY_MISMATCH', f'Gazetteer point {la},{ln} is >60 mi from record {c["lat"]},{c["lng"]}')
            return la, ln
    raise Stop(3, 'CITY_CENTER_UNRESOLVED', f'GEOID {geoid} not in the Census Gazetteer file')


def do_climate(c):
    u = (f"https://archive-api.open-meteo.com/v1/archive?latitude={c['lat']}&longitude={c['lng']}&start_date=2015-01-01&end_date=2024-12-31"
         "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto")
    d = J(u)['daily']
    jul = statistics.mean(x for t, x in zip(d['time'], d['temperature_2m_max']) if t[5:7] == '07' and x is not None)
    jan = statistics.mean(x for t, x in zip(d['time'], d['temperature_2m_min']) if t[5:7] == '01' and x is not None)
    yr = collections.defaultdict(float)
    for t, p in zip(d['time'], d['precipitation_sum']):
        if p is not None:
            yr[t[:4]] += p
    return {'peakSummerHighF': round(jul), 'winterLowF': round(jan), 'annualRainfallInches': round(statistics.mean(yr.values()), 1),
            'sourceName': f'Open-Meteo Historical Weather API (ERA5 reanalysis), 2015-2024 average, retrieved {TODAY}',
            'sourceUrl': 'https://open-meteo.com/en/docs/historical-weather-api'}


def do_water(c, pwsid):
    if pwsid:
        r = J(f'https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/{pwsid}/JSON')
        if not r:
            raise Stop(4, 'SOURCE_UNVERIFIED', f'EPA has no system {pwsid}')
        w = r[0]
        if w.get('state_code') != c['stateCode'].upper() or w.get('pws_activity_code') != 'A':
            raise Stop(4, 'GEOGRAPHY_MISMATCH', f'{pwsid} is {w.get("state_code")} / activity {w.get("pws_activity_code")}')
    else:
        url = ("https://data.epa.gov/efservice/WATER_SYSTEM/CITY_NAME/%s/STATE_CODE/%s/PWS_TYPE_CODE/CWS/PWS_ACTIVITY_CODE/A/JSON"
               % (c['name'].upper().replace(' ', '%20'), c['stateCode'].upper()))
        cand = sorted([x for x in J(url) if x.get('population_served_count')], key=lambda x: -x['population_served_count'])
        if not cand:
            raise Stop(3, 'WATER_NO_MATCH', 'no active community system with this city name; pass --pwsid after a human confirms')
        top = cand[0]
        if len(cand) > 1 and cand[1]['population_served_count'] >= 0.5 * top['population_served_count']:
            raise Stop(3, 'WATER_AMBIGUOUS', 'two large systems: ' + '; '.join(f"{x['pwsid']} {x['pws_name']} ({x['population_served_count']:,})" for x in cand[:3]) + ' -> confirm and pass --pwsid')
        pop = c.get('demographics', {}).get('population', 0)
        if pop and top['population_served_count'] < 0.5 * pop:
            raise Stop(3, 'WATER_UNCONFIRMED', f"largest system serves {top['population_served_count']:,}, under half of city pop {pop:,}; confirm and pass --pwsid")
        w = top
    return {'pwsid': w['pwsid'], 'providerName': w['pws_name'].title().replace(' Of ', ' of ').replace('Hcwr', 'HCWR'),
            'populationServed': w['population_served_count'], 'sourceType': 'surface water' if w['gw_sw_code'] == 'SW' else 'groundwater',
            'source': 'U.S. EPA Safe Drinking Water Information System (SDWIS)',
            'sourceUrl': f"https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/{w['pwsid']}/JSON", 'retrieved': TODAY}


def ourairports():
    p = os.path.join(ROOT, 'data', 'cache', 'ourairports.csv')
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        raw = urllib.request.urlopen(urllib.request.Request('https://davidmegginson.github.io/ourairports-data/airports.csv', headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read()
        open(p, 'wb').write(raw)
    return list(csv.DictReader(open(p, encoding='utf-8')))


def do_airport(c, iata, center):
    if not iata:
        raise Stop(3, 'AIRPORT_UNCONFIRMED', 'pass --iata CODE (a human/researcher picks the primary commercial airport)')
    m = [r for r in ourairports() if r['iata_code'] == iata.upper() and r['scheduled_service'] == 'yes']
    if len(m) != 1:
        raise Stop(4, 'SOURCE_UNVERIFIED', f'OurAirports has {len(m)} scheduled-service rows for {iata}')
    a = m[0]
    alat, alng = float(a['latitude_deg']), float(a['longitude_deg'])
    dist = round(hav(center[0], center[1], alat, alng), 1)
    if dist > 150:
        raise Stop(4, 'OUT_OF_BOUNDS', f'{dist} miles from the city center; wrong airport?')
    return {'name': a['name'], 'iata': iata.upper(), 'distanceMiles': dist, 'transitToDowntown': None,
            'source': 'OurAirports (public domain) for name, IATA code and coordinates; distance is straight-line from the U.S. Census Gazetteer city center point',
            'sourceUrl': 'https://ourairports.com/data/', 'cityCenterMethod': 'Census Gazetteer internal point', 'retrieved': TODAY}


def cms_hospitals(state):
    base = 'https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0'
    out, off = [], 0
    while True:
        u = f"{base}?limit=500&offset={off}&conditions[0][property]=state&conditions[0][value]={state}"
        r = J(u).get('results', [])
        out += r
        if len(r) < 500:
            return out
        off += 500


def do_hospital(c, name, center):
    st = c['stateCode'].upper()
    allh = cms_hospitals(st)
    cityname = c['name'].upper()
    local = [h for h in allh if h.get('citytown', '').upper() == cityname and h.get('emergency_services') == 'Yes']
    if not name:
        lst = [f"{h['facility_name']} ({h['hospital_type']}, {h['address']})" for h in local[:10]]
        raise Stop(3, 'HOSPITAL_UNCONFIRMED', 'pass --hospital NAME exactly as in CMS. ER hospitals in the city: ' + ('; '.join(lst) or 'NONE listed under this city name (may be in a neighbor city; confirm by hand)'))
    hit = [h for h in allh if name.upper() in h['facility_name'].upper()]
    if len(hit) != 1:
        raise Stop(3 if hit else 4, 'HOSPITAL_AMBIGUOUS' if hit else 'SOURCE_UNVERIFIED', f'{len(hit)} CMS rows match "{name}": ' + '; '.join(h['facility_name'] for h in hit[:5]))
    h = hit[0]
    if h.get('emergency_services') != 'Yes':
        raise Stop(4, 'SOURCE_UNVERIFIED', f'{h["facility_name"]} is not listed with emergency services in CMS')
    return {'nearestTraumaHospital': h['facility_name'].title().replace(' Of ', ' of ').replace(' At ', ' at ').replace(' And ', ' and '),
            'hospitalAddress': f"{h['address'].title()}, {h['citytown'].title()}, {h['state']} {h['zip_code']}",
            'cmsFacilityId': h['facility_id'], 'emergencyServices': True,
            'source': f"CMS Care Compare hospital general information (federal), retrieved {TODAY}; listed as having emergency services. Trauma designation not claimed."}


def do_tax(slug):
    t = json.load(open(os.path.join(ROOT, 'sources', 'sales-tax.json'))).get(slug)
    if not t:
        raise Stop(3, 'TAX_NO_SOURCE', f'no entry for {slug} in sources/sales-tax.json; add one WITH a source URL (never copy a state default)')
    return {'stateTaxRate': t['state'], 'localTaxRate': t['local'], 'combinedSalesTaxRate': round(t['state'] + t['local'], 5),
            'provenance': {'sourceName': t['source'], 'sourceUrl': t['url'], 'datasetVintage': t['asOf'][:4], 'verifiedAt': t['asOf'], 'granularity': 'place'}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('--only', default='water,climate,hospital,airport,tax')
    ap.add_argument('--pwsid'); ap.add_argument('--hospital'); ap.add_argument('--iata'); ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    try:
        fn, data, c = load(a.slug)
    except Stop as e:
        print(f'STOP {e.tag}: {e.msg}'); sys.exit(e.code)
    parts = [p.strip() for p in a.only.split(',') if p.strip()]
    worst = 0; center = None
    for part in parts:
        try:
            if part in ('airport',) and center is None:
                center = city_center(c)
            v = {'climate': lambda: do_climate(c), 'water': lambda: do_water(c, a.pwsid), 'airport': lambda: do_airport(c, a.iata, center),
                 'hospital': lambda: do_hospital(c, a.hospital, None), 'tax': lambda: do_tax(a.slug)}[part]()
            print(f'OK   {part}: {json.dumps(v)[:300]}')
            t = c.setdefault('executiveTravel', {})
            if part == 'climate': c['climateNormals'] = v
            elif part == 'water': c['waterUtility'] = v
            elif part == 'tax': c['permitsAndTax'] = v
            elif part == 'airport': t['primaryAirport'] = v
            elif part == 'hospital':
                e = t.setdefault('emergency', {'emergencyDispatch': '911'}); e.update(v)
        except Stop as e:
            print(f'STOP {part} [{e.tag}]: {e.msg}'); worst = max(worst, e.code)
        except KeyError:
            print(f'STOP {part}: unknown part'); worst = max(worst, 2)
    if a.write and worst == 0:
        json.dump(data, open(fn, 'w'), indent=2); print(f'WROTE {fn}')
    elif a.write:
        print('NOT WRITTEN: at least one part stopped (fix or drop it with --only)')
    sys.exit(worst)


if __name__ == '__main__':
    main()
