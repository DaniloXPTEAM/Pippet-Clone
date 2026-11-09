import json, sys, csv, collections
from urllib.parse import urlparse
d = json.load(open(r"C:\w\PiperLine\captures\scenario_multi_pages.json", encoding="utf-8"))["normalized_result"]
items = d["events"]["items"]
steps = {s["step_index"]: s["step_id"] for s in d["steps"]}
reqs = {}; resp = {}
for i in items:
    k = i.get("kind"); t = i.get("transaction_id")
    if k == "request": reqs[t] = i
    elif k == "response": resp[t] = i
rows = []
for t, r in reqs.items():
    u = r["url"]["url"]; p = urlparse(u)
    rows.append({"etapa": steps.get(r.get("step_index"), r.get("step_index")), "dominio": p.netloc, "caminho": p.path, "query_param_names": ",".join(r["url"].get("query_parameter_names", [])),
                 "metodo": r["method"], "tipo": r["resource_type"], "status": resp.get(t, {}).get("status"), "url_completa": u.split("?")[0]})
with open(r"C:\w\PiperLine\notes\network_catalog.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print("linhas:", len(rows))
print("por etapa:", dict(collections.Counter(r["etapa"] for r in rows)))
# lista para baixar: scripts, css, manifest, json (fetch GET)
want = []
for r in rows:
    if r["tipo"] in ("script", "stylesheet", "manifest") or (r["tipo"] == "fetch" and r["metodo"] == "GET"):
        want.append(r["url_completa"])
want = list(dict.fromkeys(want))
open(r"C:\w\PiperLine\notes\urls_estaticas_publicas.txt", "w", encoding="utf-8").write("\n".join(want))
print("urls estáticas únicas:", len(want))
for u in want: print(" ", u)
print("\nFETCH/PING/OTHER:")
for r in rows:
    if r["tipo"] in ("fetch","ping","other","manifest"): print(" ", r["etapa"], r["metodo"], r["tipo"], r["dominio"], r["caminho"][:110], r["status"])
print("\nHOSTS por etapa:")
for e in dict.fromkeys(r["etapa"] for r in rows):
    print(" ", e, collections.Counter(r["dominio"] for r in rows if r["etapa"] == e).most_common(6))
