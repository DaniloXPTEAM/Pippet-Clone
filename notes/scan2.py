import re, os, json
root = r"C:\w\PiperLine\scripts\raw"
def find(name):
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if f.startswith(name): return os.path.join(dp, f)
def rd(p): return open(p, encoding="utf-8", errors="replace").read()
for n in ["route-manifest-main", "route-manifest-marketing-studio", "modern-run-window-fn", "modern-inline", "react-inline-csp"]:
    p = find(n); t = rd(p); print(f"\n=== {n} ({len(t)} bytes)\n{t[:900]}")
print("\n=== manifest.json (pippit.ai)"); print(rd(find("manifest.json"))[:1100])
def ver(path_prefix, pats):
    p = find(path_prefix); t = rd(p); out = {}
    for k, rx in pats.items():
        m = re.findall(rx, t); out[k] = list(dict.fromkeys(m))[:4]
    return out
print("\nVERSOES:")
print(" lib-react (landing):", ver("lib-react.ac0", {"v": r'version[:=]\s*"(\d+\.\d+\.\d+[^"]*)"'}))
print(" lib-react (kep):", ver("lib-react.481", {"v": r'version[:=]\s*"(\d+\.\d+\.\d+[^"]*)"'}))
print(" lib-router:", ver("lib-router.e2", {"remix": r'@remix-run/router@?([\d.]+)', "rr": r'react-router(?:-dom)?@?v?([\d.]{5,})'}))
print(" lib-axios:", ver("lib-axios", {"v": r'VERSION\s*=\s*"([\d.]+)"|axios/([\d.]+)'}))
