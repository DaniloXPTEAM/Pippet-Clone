import json, os, re, collections
root = r"C:\w\PiperLine\scripts\raw"
def find(sub):
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if f == sub: return os.path.join(dp, f)
p = find("pt-BR.89180.json"); d = json.load(open(p, encoding="utf-8"))
print("tipo:", type(d).__name__, "| chaves topo:", len(d))
keys = list(d.keys())
print("primeiras chaves:", keys[:12])
# prefixos de namespaces
def pref(k):
    m = re.split(r"[._:]", k); return m[0]
c = collections.Counter(pref(k) for k in keys)
print("\nnamespaces (prefixo, nº de chaves):")
for k, n in c.most_common(60): print(f"  {n:4d}  {k}")
