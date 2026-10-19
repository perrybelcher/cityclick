#!/usr/bin/env python3
"""Independent recompute #2: re-query EXTERNAL sources (EPA SDWIS, Open-Meteo, Google Places) and a separately
typed sales-tax table, then check the LIVE page shows the same values. Does not read src/data.
Usage: python3 audit/recompute_extra.py [--base https://cityclick.com]  (exit 1 on any mismatch)"""
import sys, re, json, urllib.request, statistics, collections
base=sys.argv[sys.argv.index('--base')+1] if '--base' in sys.argv else 'https://cityclick.com'
env={}
for l in open('/opt/data/secrets/google-maps.env'):
    if '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip('"\'')
GK=list(env.values())[0]
# slug: (lat,lng, EPA city, state, hospital query, airport query, iata, combined sales tax % (independent copy; source in comment))
C={'tx/austin':(30.2672,-97.7431,'AUSTIN','TX','Dell Seton Medical Center at the University of Texas Austin','Austin-Bergstrom International Airport','AUS',8.25),      # comptroller.texas.gov city-rates.pdf
 'id/boise':(43.600229,-116.231656,'BOISE','ID',"St. Luke's Boise Medical Center 190 E Bannock St",'Boise Airport','BOI',6.00),                                  # tax.idaho.gov 6% state, no local
 'fl/tampa':(27.966262,-82.477618,'TAMPA','FL','Tampa General Hospital','Tampa International Airport','TPA',7.50),                                              # floridarevenue.com 6% + Hillsborough 1.5%
 'az/scottsdale':(33.684272,-111.861448,'SCOTTSDALE','AZ','HonorHealth Scottsdale Osborn Medical Center','Phoenix Sky Harbor International Airport','PHX',8.00), # scottsdaleaz.gov/taxes/resources 5.6+0.7+1.7
 'tn/nashville':(36.1718,-86.785002,'NASHVILLE','TN','Vanderbilt University Medical Center','Nashville International Airport','BNA',9.75),                  # tn.gov Notice 24-11, 7% + 2.75%
 'ok/oklahoma-city':(35.4676,-97.5164,'OKLAHOMA CITY','OK','OU Health University of Oklahoma Medical Center','Will Rogers International Airport','OKC',8.625),   # okc.gov taxes 4.5 + 4.125
 'ar/hot-springs-village':(34.658069,-92.968643,'HOT SPRINGS VILLAGE','AR','CHI St. Vincent Hot Springs','Bill and Hillary Clinton National Airport','LIT',8.00)}  # avalara/garland county
J=lambda u,t=60: json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=t))
def place(q):
    r=urllib.request.Request('https://places.googleapis.com/v1/places:searchText',data=json.dumps({'textQuery':q}).encode(),headers={'Content-Type':'application/json','X-Goog-Api-Key':GK,'X-Goog-FieldMask':'places.displayName,places.formattedAddress'})
    return json.load(urllib.request.urlopen(r,timeout=30))['places'][0]
page=lambda s: re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>',' ',urllib.request.urlopen(urllib.request.Request(base+'/'+s+'/',headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode('utf-8','ignore'),flags=re.S))).replace('&#39;',"'").replace('&amp;','&')
fails=0; total=0
for s,(lat,lng,cn,st,hq,aq,iata,tax) in C.items():
    t=page(s); miss=[]
    def chk(label,val):
        global total,fails; total+=1
        if val not in t: miss.append(f'{label} expected "{val}"'); fails+=1
    # water: biggest active community system for the city, live from EPA
    ws=J(f"https://data.epa.gov/efservice/WATER_SYSTEM/CITY_NAME/{cn.replace(' ','%20')}/STATE_CODE/{st}/PWS_TYPE_CODE/CWS/PWS_ACTIVITY_CODE/A/JSON")
    w=max([x for x in ws if x.get('population_served_count')],key=lambda x:x['population_served_count'])
    chk('water PWSID',w['pwsid']); chk('water people',f"{w['population_served_count']:,}")
    # hospital + airport names from Places
    h=place(hq); chk('hospital',h['displayName']['text'].replace('&','&') if h['displayName']['text'] in t else h['displayName']['text'].split(' (')[0])
    a=place(aq); chk('airport',a['displayName']['text']); chk('IATA',f'({iata})')
    # sales tax
    chk('sales tax',f'{tax:.2f}%' if tax*1000%10==0 else f'{tax:g}%')
    # climate from Open-Meteo archive
    u=(f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto")
    d=J(u,90)['daily']
    jul=statistics.mean(x for dt,x in zip(d['time'],d['temperature_2m_max']) if dt[5:7]=='07' and x is not None)
    jan=statistics.mean(x for dt,x in zip(d['time'],d['temperature_2m_min']) if dt[5:7]=='01' and x is not None)
    yr=collections.defaultdict(float)
    for dt,p in zip(d['time'],d['precipitation_sum']):
        if p is not None: yr[dt[:4]]+=p
    chk('July high',f'{round(jul)}°F'); chk('Jan low',f'{round(jan)}°F'); chk('rain',f'{round(statistics.mean(yr.values()),1)} Inches')
    print(f'{"FAIL" if miss else "ok  "} {s:24}', ('| '+'; '.join(miss)) if miss else '')
print(f'\nRECOMPUTE-EXTRA: {total-fails}/{total} matched on {base}'); sys.exit(1 if fails else 0)
