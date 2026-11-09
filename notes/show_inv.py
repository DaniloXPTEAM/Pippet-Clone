import json, glob, os, collections
d = r"C:\w\PiperLine\notes\ast_inventory"
res = json.load(open(os.path.join(d, "_resumo.json"), encoding="utf-8"))
print(f"{'arquivo':46s} {'KB':>5s} {'nós':>8s} {'str':>6s} {'url':>4s} {'dom':>4s} {'api':>4s} {'fetch':>5s} {'xhr':>4s} {'http':>4s} {'rota':>4s} {'stor':>4s} {'ev':>3s} {'glob':>4s} {'mod':>4s}")
for r in sorted(res, key=lambda x: -x.get('nos', 0)):
    print(f"{r['f'][:46]:46s} {r['kb']:5d} {r['nos']:8d} {r['str']:6d} {r['urls']:4d} {r['dom']:4d} {r['api']:4d} {r['fetch']:5d} {r['xhr']:4d} {r['http']:4d} {r['rotas']:4d} {r['stor']:4d} {r['ev']:3d} {r['glob']:4d} {r['mods']:4d}")
allv = collections.defaultdict(set)
for p in glob.glob(os.path.join(d, "*.js.json")):
    j = json.load(open(p, encoding="utf-8")); f = j["arquivo"].split("\\")[-1]
    for k in ("dominios", "caminhos_api", "fetch", "xhr_open", "chamadas_http", "beacon", "websocket", "rotas_path", "storage", "eventos", "globais_window"):
        for v in j[k]: allv[k].add(v)
print("\nTOTAIS ÚNICOS:", {k: len(v) for k, v in allv.items()})
print("\nDOMÍNIOS:", sorted(allv["dominios"])[:70])
print("\nFETCH:", sorted(allv["fetch"])[:40])
print("\nXHR open:", sorted(allv["xhr_open"])[:30])
print("\nHTTP-method calls:", sorted(allv["chamadas_http"])[:40])
print("\nBEACON:", sorted(allv["beacon"])[:15], " WS:", sorted(allv["websocket"])[:10])
