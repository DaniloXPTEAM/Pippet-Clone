import json, glob, re, os, sys, unicodedata
def norm(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',s)).strip().lower()
docs=''.join(open(f,encoding='utf-8',errors='ignore').read() for f in glob.glob('PIPPIT_*.md')+['FEATURE_INVENTORY.md','README.md'])
docs=norm(docs)
ev=''
for f in glob.glob('captures/auth/**/*.txt',recursive=True)+glob.glob('captures/auth/**/*.json',recursive=True):
    try:
        if os.path.getsize(f)<3_000_000: ev+=open(f,encoding='utf-8',errors='ignore').read()
    except: pass
ev=norm(ev)
rows=[]
for f in sorted(glob.glob('captures/audit/*.json')):
    d=json.load(open(f,encoding='utf-8')); page=os.path.basename(f)[:-5]
    labs=set()
    for k in ('buttons','clickables'):
        for x in d.get(k,[]): labs.add(x[1])
    for l in d.get('links',[]): labs.add(l[0])
    for h in d.get('headings',[]): labs.add(h)
    for lab in sorted(labs):
        n=norm(lab)
        if len(n)<3 or re.fullmatch(r'[\d:/. ]+',n): continue
        inD=n in docs; inE=n in ev
        if not inD: rows.append((page,lab,'em evidência, não documentado' if inE else 'NÃO CAPTURADO'))
out=sys.argv[1] if len(sys.argv)>1 else 'captures/audit/_diff.md'
with open(out,'w',encoding='utf-8') as o:
    for r in rows: o.write(f'{r[0]} | {r[1]} | {r[2]}\n')
print(len(rows),'itens sem documentação;',sum(1 for r in rows if r[2]=='NÃO CAPTURADO'),'sem evidência')
