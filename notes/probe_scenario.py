import json, sys, collections
from urllib.parse import urlparse
d = json.load(open(sys.argv[1], encoding="utf-8"))["normalized_result"]
print("duracao_ms:", d["duration_ms"], "| completeness:", d["completeness"])
ev = d["events"]; print("retidos:", ev["retained"], "dropped:", ev["dropped"])
items = ev["items"]
print("tipos:", dict(collections.Counter(i.get("kind") for i in items)))
reqs = [i for i in items if i.get("kind") == "request"]
print("recursos por tipo:", dict(collections.Counter(i.get("resource_type") for i in reqs)))
print("hosts:", collections.Counter(urlparse(i["url"]["url"]).netloc for i in reqs).most_common(15))
print("steps:", [(s["step_id"], s.get("after_url",{}).get("url")) for s in d["steps"]])
# há corpos de resposta?
keys = collections.Counter()
for i in items: keys.update(i.keys())
print("campos de eventos:", dict(keys))
