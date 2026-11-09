import json, glob, os
for p in sorted(glob.glob(r"C:\w\PiperLine\notes\pages\*.json")):
    d = json.load(open(p, encoding="utf-8")); n = os.path.basename(p)[:-5]
    print(f"\n## {n} | {d.get('title','')[:70]}")
    print(f"   contagens: {d.get('counts')}")
    print(f"   inputs: {d.get('inputs')}")
    print(f"   botões: {d.get('buttons')[:14]}")
    print(f"   h1/h2: {[h for h in d.get('headings',[]) if h[:2] in ('H1','H2')][:9]}")
