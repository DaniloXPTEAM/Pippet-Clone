import json, csv, collections, sys
from urllib.parse import urlparse
out = []
for name in ["template-studio", "video-agent"]:
    d = json.load(open(rf"C:\w\PiperLine\captures\scenario_{name}.json", encoding="utf-8"))["normalized_result"]
    items = d["events"]["items"]; reqs = {}; resp = {}
    for i in items:
        if i.get("kind") == "request": reqs[i["transaction_id"]] = i
        elif i.get("kind") == "response": resp[i["transaction_id"]] = i
    print(f"\n=== {name}: eventos {d['events']['retained']} (descartados {d['events']['dropped']}) | requisições {len(reqs)} | completeness {d['completeness']['status']}")
    print(" tipos:", dict(collections.Counter(r["resource_type"] for r in reqs.values())))
    print(" hosts:", collections.Counter(urlparse(r["url"]["url"]).netloc for r in reqs.values()).most_common(10))
    print(" status:", dict(collections.Counter(resp[t]["status"] for t in resp)))
    for t, r in reqs.items():
        p = urlparse(r["url"]["url"])
        out.append({"pagina": name, "dominio": p.netloc, "caminho": p.path, "query_param_names": ",".join(r["url"].get("query_parameter_names", [])), "metodo": r["method"], "tipo": r["resource_type"], "status": resp.get(t, {}).get("status")})
    print(" fetch/xhr/ping/ws:")
    seen = set()
    for t, r in reqs.items():
        if r["resource_type"] in ("fetch", "xhr", "ping", "eventsource", "websocket", "other"):
            p = urlparse(r["url"]["url"]); key = (r["method"], p.netloc, p.path)
            if key in seen: continue
            seen.add(key); print(f"   {r['method']:5s} {r['resource_type']:8s} {p.netloc}{p.path[:100]} -> {resp.get(t, {}).get('status')}")
    print(" scripts novos:", sorted({urlparse(r['url']['url']).path.split('/')[-1] for r in reqs.values() if r['resource_type']=='script'})[:30])
    print(" ws:", len(d["events"]["items"]) and sum(1 for i in items if 'websocket' in str(i.get('kind'))))
with open(r"C:\w\PiperLine\notes\network_catalog_pages.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
print("\nlinhas CSV:", len(out))
