import json, glob, os, collections, io
d = r"C:\w\PiperLine\notes\ast_inventory"
allv = collections.defaultdict(lambda: collections.defaultdict(set))
for p in glob.glob(os.path.join(d, "*.js.json")):
    j = json.load(open(p, encoding="utf-8")); f = j["arquivo"].split("\\")[-1]
    for k in ("urls", "dominios", "caminhos_api", "fetch", "xhr_open", "chamadas_http", "beacon", "websocket", "rotas_path", "storage", "eventos", "globais_window"):
        for v in j[k]: allv[k][v].add(f.split(".")[0][:18])
out = io.open(os.path.join(d, "_consolidado.txt"), "w", encoding="utf-8")
def sec(k, lim=200):
    out.write(f"\n===== {k} ({len(allv[k])}) =====\n")
    for v in sorted(allv[k])[:lim]: out.write(f"  {v}   <- {', '.join(sorted(allv[k][v]))[:70]}\n")
for k in ("dominios", "fetch", "xhr_open", "chamadas_http", "beacon", "websocket", "caminhos_api", "rotas_path", "storage", "eventos", "globais_window"): sec(k)
out.close(); print("ok")
