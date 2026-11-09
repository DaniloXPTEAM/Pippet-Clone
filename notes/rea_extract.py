# Extrai evidence_id, passos, texto de acessibilidade e screenshot de um resultado de capture_browser_scenario salvo pelo MCP.
import json, sys, base64, re, os
src, name = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf-8'))
out = 'C:/w/PiperLine/captures/audit/rea'
json.dump(d, open(f'{out}/{name}.json', 'w', encoding='utf-8'))
n = d['normalized_result']; print('evidence_id', d['evidence_id']); print('steps', [(s.get('step_id'), s.get('status')) for s in n.get('steps', [])])
def walk(o, depth=0):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('text', 'name') and isinstance(v, str) and v.strip(): yield v.strip()
            yield from walk(v, depth + 1)
    elif isinstance(o, list):
        for x in o: yield from walk(x, depth + 1)
txt = []
for s in n.get('steps', []):
    for a in s.get('artifacts', []) if isinstance(s.get('artifacts'), list) else []: pass
seen = []; [seen.append(t) for t in walk(n.get('final_capture', n)) if t not in seen]
open(f'{out}/{name}.txt', 'w', encoding='utf-8').write('\n'.join(seen))
print(len(seen), 'textos'); print(list(n.keys()))
