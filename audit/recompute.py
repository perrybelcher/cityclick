#!/usr/bin/env python3
"""Independent recompute: re-derive each city's headline numbers straight from the raw Census files
(data/census) and check that the LIVE page shows exactly those numbers. Does not read src/data.
Exit 1 on any mismatch. Usage: python3 audit/recompute.py [--base https://cityclick.com]"""
import csv, sys, re, urllib.request, os, json
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data','census')+'/'
base=sys.argv[sys.argv.index('--base')+1] if '--base' in sys.argv else 'https://cityclick.com'
CITIES={'tx/austin':('1600000US4805000','48','Austin city'),'ar/hot-springs-village':('1600000US0533482','05',None),
 'id/boise':('1600000US1608830','16','Boise City city'),'fl/tampa':('1600000US1271000','12','Tampa city'),
 'az/scottsdale':('1600000US0465000','04','Scottsdale city'),'tn/nashville':('1600000US4752006','47','Nashville-Davidson metropolitan government (balance)'),
 'ok/oklahoma-city':('1600000US4055000','40','Oklahoma City city')}
def tab(t):
    d={}
    for l in open(D+f'23_{t}.dat'):
        p=l.rstrip('\n').split('|')
        if len(p)>1: d[p[0]]=p[1]
    return d
T={k:tab(k) for k in['b01003','b19013','b19301','b25077','b25064','b01002','b25103']}
pe={}
for r in csv.DictReader(open(D+'popest.csv',encoding='latin1')):
    if r['SUMLEV']=='162': pe[(r['STATE'],r['NAME'])]=r
get=lambda u: urllib.request.urlopen(urllib.request.Request(base+u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode('utf-8','ignore')
txt=lambda h: re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>',' ',h,flags=re.S)))
fails=0; checks=0
for slug,(gid,fips,pn) in CITIES.items():
    t=txt(get('/'+slug+'/')).replace('&#39;',"'").replace('&amp;','&')
    mhi=int(T['b19013'][gid]); pci=int(T['b19301'][gid]); hv=int(T['b25077'][gid]); rent=int(T['b25064'][gid]); age=float(T['b01002'][gid]); tax=float(T['b25103'][gid])
    r=pe.get((fips,pn)) if pn else None
    pop=int(r['POPESTIMATE2023']) if r else int(T['b01003'][gid])
    want={'population':f'{pop:,}','median income':f'${mhi:,}','per-capita income':f'${pci:,}','median home value':f'${hv:,}','median gross rent':f'${rent:,}','median age':f'{age:g} Years','property tax rate':f'{tax/hv*100:.2f}%'}
    if r: want['pop change since 2020']=f"{(pop/int(r['ESTIMATESBASE2020'])-1)*100:+.1f}%".replace('+-','-')
    miss=[]
    for k,v in want.items():
        checks+=1
        if v not in t: miss.append(f'{k} expected {v}'); fails+=1
    print(f'{"FAIL" if miss else "ok  "} {slug:24} {len(want)-len(miss)}/{len(want)} match', ('| '+'; '.join(miss)) if miss else '')
print(f'\nRECOMPUTE: {checks-fails}/{checks} checks matched on {base}')
sys.exit(1 if fails else 0)
