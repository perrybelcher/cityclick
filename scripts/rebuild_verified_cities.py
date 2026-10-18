#!/usr/bin/env python3
"""Rebuild demographics, housing, industries for the certified cities from Census bulk files ONLY.
Sources (no API key needed):
  ACS 2023 5-yr table-based SF (B01003,B19013,B19301,B25077,B25064,B01002,B25103) - www2.census.gov
  Census ZIP Business Patterns 2022 (zbp22detail) ; Population Estimates sub-est2023
Rule: a value that cannot be computed from these files is left out (blank beats wrong)."""
import csv, json, zipfile, collections, datetime, sys
A=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','data','census')+'/'
NOW=datetime.date.today().isoformat()
CITIES={'tx/austin':('tx','Austin','TX','1600000US4805000','48','Austin city'),
 'id/boise':('id','Boise','ID','1600000US1608830','16','Boise City city'),
 'fl/tampa':('fl','Tampa','FL','1600000US1271000','12','Tampa city'),
 'az/scottsdale':('az','Scottsdale','AZ','1600000US0465000','04','Scottsdale city'),
 'tn/nashville':('tn','NASHVILLE','TN','1600000US4752006','47','Nashville-Davidson metropolitan government (balance)'),
 'ok/oklahoma-city':('ok','OKLAHOMA CITY','OK','1600000US4055000','40','Oklahoma City city'),
 'ar/hot-springs-village':('ar','HOT SPRINGS VILLAGE','AR','1600000US0533482','05','Hot Springs Village')}
def load(t):
    d={}
    for l in open(f'{A}23_{t}.dat'):
        p=l.rstrip('\n').split('|')
        if len(p)>1: d[p[0]]=p[1]
    return d
T={k:load(k) for k in ['b01003','b19013','b19301','b25077','b25064','b01002','b25103']}
num=lambda v:(None if v in(None,'','.','-','N') else float(v))
pop_est={}
for r in csv.DictReader(open(A+'popest.csv',encoding='latin1')):
    if r['SUMLEV']=='162': pop_est[(r['STATE'],r['NAME'])]=r
defs=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'naics_defs.json')))
codes={d['naicsCode'] for d in defs}
zbp=zipfile.ZipFile(A+'zbp22.zip').open('zbp22detail.txt').read().decode('latin1').splitlines()
est=collections.defaultdict(lambda:collections.defaultdict(int)); us=collections.defaultdict(int); zcity=collections.defaultdict(set); ztot=collections.defaultdict(int)
want={(c[1].upper(),c[2]) for c in CITIES.values()}
for r in csv.DictReader(zbp):
    n=r['naics']; e=int(r['est'])
    if n in codes: us[n]+=e
    k=(r['city'].upper(),r['stabbr'])
    if k in want:
        if n=='------': zcity[k].add(r['zip']); ztot[(k,r['zip'])]=e
        if n in codes: est[(k,r['zip'])][n]+=e
USPOP=num(T['b01003']['0100000US'])
print('US pop',USPOP)
for slug,(st,nm,ab,gid,fips,pname) in CITIES.items():
    fn=f'src/data/cities/{st}.json'; data=json.load(open(fn)); c=[x for x in data if x['slug']==slug][0]
    d=c['demographics']
    r=pop_est.get((fips,pname))
    if r is None and slug.startswith('ar/'): r=None
    pop=int(r['POPESTIMATE2023']) if r else int(num(T['b01003'][gid]))
    base=int(r['ESTIMATESBASE2020']) if r else None
    ACSP={'sourceName':'US Census Bureau ACS 5-Year Estimates 2023 (Table-Based Summary File)','sourceUrl':'https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/','datasetVintage':'ACS-2023-5YR','verifiedAt':NOW,'granularity':'place'}
    for k in ['popGrowth5YrPct','daytimeWorkerPop','daytimePopSurgePct','daytimePopulation']: d.pop(k,None)
    d.update({'population':pop,'medianHouseholdIncome':int(num(T['b19013'][gid])),'perCapitaIncome':int(num(T['b19301'][gid])),'medianAge':num(T['b01002'][gid]),
              'medianGrossRent':int(num(T['b25064'][gid])),'medianHomeValue':int(num(T['b25077'][gid])),'provenance':ACSP})
    if base: d['popChange2020to2023Pct']=round((pop/base-1)*100,1); d['popChangeBasis']='Census Population Estimates, April 2020 base to July 2023'
    else: d.pop('popChange2020to2023Pct',None)
    tax=num(T['b25103'][gid]); hv=num(T['b25077'][gid])
    c['housingAndTaxes']={'medianHomeValue':int(hv),'medianGrossRent':int(num(T['b25064'][gid])),
        'medianRealEstateTaxPaid':int(tax) if tax else None,
        'effectivePropertyTaxRatePct': round(tax/hv*100,2) if tax and hv else None,
        'countyName':c.get('countyName'),'source':'ACS 2023 5-yr: B25077 median home value, B25064 median gross rent, B25103 median real estate taxes paid. Effective rate = B25103 / B25077.',
        'sourceUrl':ACSP['sourceUrl']}
    key=(nm.upper(),ab); zips=sorted(zcity[key])
    # ZCTA population for the same ZIPs -> same-universe density
    zp={z:num(T['b01003'].get('860Z200US'+z)) for z in zips}
    use=[z for z in zips if zp[z] and zp[z]>0]
    zpop=sum(zp[z] for z in use)
    c['primaryZips']=sorted(use,key=lambda z:-ztot[(key,z)])[:12]
    inds=[]
    for df in defs:
        n=df['naicsCode']; e=sum(est[(key,z)].get(n,0) for z in use)
        usd=us[n]/USPOP*10000
        p10=e/zpop*10000
        idx=round(p10/usd*100) if usd else None
        status='underserved' if idx<80 else ('saturated' if idx>120 else 'balanced')
        expected=usd*zpop/10000
        if usd<0.3 or expected<10:   # benchmark too small / category dominated by non-employer shops: blank beats wrong
            continue
        inds.append({**df,'establishments':e,'per10kResidents':round(p10,2),'usAvgPer10k':round(usd,2),'saturationIndex':idx,'status':status,
          'provenance':{'sourceName':'US Census Bureau ZIP Code Business Patterns 2022','sourceUrl':'https://www2.census.gov/programs-surveys/cbp/datasets/2022/zbp22detail.zip','datasetVintage':'ZBP-2022','verifiedAt':NOW,'granularity':'zip_aggregated',
            'evidenceQuote':f'{e} employer establishments (NAICS {n}) across {len(use)} ZIP codes whose USPS city is {nm.title()}, {ab}; density uses ACS 2023 ZCTA population of those ZIPs ({int(zpop):,}). National benchmark = all US ZIP rows / US population.'}})
    c['industries']=inds
    c.setdefault('marketSignals',{}).pop('reportedRetailRentSqFtYr',None)
    for k in('reportedIndustrialRentSqFtYr','topSearchedNaics30d','verifiedLocalProsCount','camExpenseSqFtYr','commercialElectricityCentsKwh'): c['marketSignals'].pop(k,None)
    json.dump(data,open(fn,'w'),indent=2)
    sc=collections.Counter(i['status'] for i in inds)
    print(f"{slug:24} pop {pop:>7,} MHI {d['medianHouseholdIncome']:>7,} home {int(hv):>7,} tax {c['housingAndTaxes']['effectivePropertyTaxRatePct']}% chg {d.get('popChange2020to2023Pct')} zips {len(use)} zpop {int(zpop):,} {dict(sc)}")
