# Junta requisicoes e corpos (network-content) da captura autenticada do REA e grava um arquivo por endpoint do produto.
import json, base64, os, re, sys, collections
from urllib.parse import urlsplit
src = sys.argv[1]; out = sys.argv[2]
os.makedirs(out, exist_ok=True)
_j = json.load(open(src, encoding='utf-8'))
d = (_j.get('data') or _j)['normalized_result'] if 'normalized_result' not in _j else _j['normalized_result']
ev = d['events']['items']
req = {e['transaction_id']: e for e in ev if e['kind'] == 'request'}
resp = {e['transaction_id']: e for e in ev if e['kind'] == 'response'}
bodies = collections.defaultdict(dict)
for e in ev:
    if e['kind'] == 'network-content': bodies[e['transaction_id']][e['phase']] = e['body']
def dec(b):
    if not b or b.get('state') != 'captured': return {'state': (b or {}).get('state', 'absent')}
    raw = base64.b64decode(b['content']) if b.get('encoding') == 'base64' else b['content'].encode()
    try: return {'state': 'captured', 'json': json.loads(raw.decode('utf-8'))}
    except Exception: return {'state': 'captured', 'text': raw[:4000].decode('utf-8', 'replace'), 'bytes': len(raw)}
n = 0
for t, r in req.items():
    u = r['url']['url']; sp = urlsplit(u)
    if r.get('resource_type') not in ('fetch', 'xhr') or 'pippit.ai' not in sp.netloc: continue
    key = re.sub(r'[^A-Za-z0-9]+', '_', r['method'] + sp.path).strip('_')[:120]
    rec = {'method': r['method'], 'url': u, 'query_names': [k for k, _ in __import__('urllib.parse', fromlist=['x']).parse_qsl(sp.query)],
           'request_header_names': r.get('header_names'), 'status': (resp.get(t) or {}).get('status'),
           'request_body': dec(bodies[t].get('request')), 'response_body': dec(bodies[t].get('response'))}
    p = os.path.join(out, key + '.json'); i = 1
    while os.path.exists(p): i += 1; p = os.path.join(out, f'{key}__{i}.json')
    json.dump(rec, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); n += 1
print(n, 'endpoints gravados em', out)
