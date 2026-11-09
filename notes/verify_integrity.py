import os, json, hashlib, struct, glob, re, io
R = r"C:\w\PiperLine"
out = io.open(os.path.join(R, "notes", "VERIFICACAO_INTEGRIDADE.txt"), "w", encoding="utf-8")
def P(*a):
    s = " ".join(str(x) for x in a); out.write(s + "\n"); print(s.encode("ascii", "replace").decode())
# 1) JSON validos
bad = []; n = 0
for p in glob.glob(R + r"\**\*.json", recursive=True):
    if "node_modules" in p: continue
    n += 1
    try: json.load(open(p, encoding="utf-8"))
    except Exception as e: bad.append((p.replace(R + "\\", ""), str(e)[:60]))
P("JSON validos:", n - len(bad), "de", n, "| invalidos:", bad)
# 2) PNG validos
pngs = sorted(glob.glob(R + r"\screenshots\*.png")); okp = 0; dims = []
for p in pngs:
    b = open(p, "rb").read(32)
    if b[:8] == b"\x89PNG\r\n\x1a\n" and b[12:16] == b"IHDR":
        w, h = struct.unpack(">II", b[16:24]); okp += 1; dims.append((os.path.basename(p), w, h, os.path.getsize(p) // 1024))
P("PNG validos:", okp, "de", len(pngs))
for d in dims: P("  ", d)
# 3) hashes REA export vs raw
man = json.load(open(R + r"\scripts\export\manifest.json", encoding="utf-8"))
items = man.get("scripts") or man.get("files") or man.get("items") or []
match = mism = missing = 0
rawidx = {}
for dp, dn, fn in os.walk(R + r"\scripts\raw"):
    for f in fn: rawidx.setdefault(f, []).append(os.path.join(dp, f))
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
def walk(o):
    if isinstance(o, dict):
        if "sha256" in o and ("relative_path" in o or "path" in o): yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o, list):
        for v in o: yield from walk(v)
rows = []
for it in walk(man):
    rp = it.get("relative_path") or it.get("path"); exp = it["sha256"]
    full = os.path.join(R, "scripts", "export", "files", rp.replace("/", "\\"))
    ex_ok = os.path.exists(full) and sha(full) == exp
    base = os.path.basename(rp); raw_ok = None
    if base in rawidx: raw_ok = any(sha(x) == exp for x in rawidx[base])
    rows.append((base, ex_ok, raw_ok))
P("manifesto REA: arquivos conferidos:", len(rows), "| hash do export confere:", sum(1 for r in rows if r[1]), "| confere com o baixado em raw/:", sum(1 for r in rows if r[2]), "| difere:", [r[0] for r in rows if r[2] is False], "| sem par em raw/:", [r[0] for r in rows if r[2] is None])
# 4) raw vs lista de URLs
urls = [l.strip() for l in open(R + r"\notes\urls_estaticas_publicas.txt", encoding="utf-8") if l.strip()]
raw_files = sum(len(v) for v in rawidx.values())
P("URLs estaticas na lista:", len(urls), "| arquivos em raw/:", raw_files)
# 5) links entre docs
for md in ("README.md", "PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md", "OPPORTUNITY_IMPLEMENTATION_BLUEPRINT.md"):
    t = open(os.path.join(R, md), encoding="utf-8").read()
    refs = set(re.findall(r"`([A-Za-z0-9_./\\-]+\.(?:md|csv|json|mjs|py|txt))`", t))
    miss = [x for x in refs if not (os.path.exists(os.path.join(R, x)) or os.path.exists(os.path.join(R, "notes", x)))]
    P(md, "-> referencias a arquivos:", len(refs), "| ausentes:", miss)
# 6) numeros do relatorio
t = open(R + r"\PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md", encoding="utf-8").read()
P("CSV rede (landing/pre):", sum(1 for _ in open(R + r"\notes\network_catalog.csv", encoding="utf-8-sig")) - 1, "linhas | CSV paginas:", sum(1 for _ in open(R + r"\notes\network_catalog_pages.csv", encoding="utf-8-sig")) - 1)
pp = open(R + r"\notes\PAGINAS_PUBLICAS.md", encoding="utf-8").read()
P("URLs em PAGINAS_PUBLICAS:", len(set(re.findall(r"`(/[a-z0-9/_.\-A-Z?=&]+)", pp))))
out.close()
