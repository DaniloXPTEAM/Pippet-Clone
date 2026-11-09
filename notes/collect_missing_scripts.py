# Coleta, so do material ja existente, o que se sabe de cada um dos 63 scripts vistos na rede e nao preservados.
# Saida: notes/_missing_scripts_data.json (insumo de MISSING_SCRIPT_PRIORITY.csv). Nao faz requisicoes de rede.
import os, json, csv, re, glob, collections
from urllib.parse import urlsplit
os.chdir('C:/w/PiperLine')
rows = list(csv.reader(open('notes/MISSING_NETWORK_ASSETS.csv', encoding='utf-8-sig')))[1:]
miss = [r for r in rows if r[6] == 'nao preservado' and r[2] == 'script']
CAPS = {'scenario_multi_pages': 'captures/scenario_multi_pages.json', 'scenario_template-studio': 'captures/scenario_template-studio.json', 'scenario_video-agent': 'captures/scenario_video-agent.json'}
# ordem de carga: primeira requisicao de cada URL, por captura
first = {}; script_rank = {}
for cap, f in CAPS.items():
    d = json.load(open(f, encoding='utf-8'))['normalized_result']
    steps = {s['step_index']: s for s in d['steps']}
    rank = 0
    for e in d['events']['items']:
        if e.get('kind') != 'request' or e.get('resource_type') != 'script': continue
        sp = urlsplit(e['url']['url']); key = '%s://%s%s' % (sp.scheme, sp.netloc, sp.path)
        rank += 1
        if (cap, key) not in first:
            st = steps.get(e.get('step_index'), {})
            first[(cap, key)] = dict(seq=e['sequence'], rank=rank, step=st.get('step_id'), page=st.get('after_url', {}).get('url', '').split('?')[0])
# texto de todos os arquivos locais para procurar referencias aos nomes dos chunks
corpus = {}
for p in glob.glob('scripts/raw/**/*.js', recursive=True) + glob.glob('scripts/raw/**/*.json', recursive=True):
    try: corpus[p] = open(p, encoding='utf-8', errors='ignore').read()
    except Exception: pass
def refs(stem, hashpart):
    hits = []
    for p, t in corpus.items():
        n = 0
        if stem and len(stem) > 3: n += t.count(stem)
        if hashpart: n += t.count(hashpart)
        if n: hits.append((os.path.basename(p), n))
    return hits
out = []
for r in miss:
    url = r[0]; sp = urlsplit(url); path = sp.path; base = os.path.basename(path)
    m = re.match(r'^(.*)\.([0-9a-f]{8,10})\.js$', base)
    stem, h = (m.group(1), m.group(2)) if m else (base[:-3], '')
    chunk_id = stem if re.fullmatch(r'\d+', stem) else ''
    cap_info = [dict(cap=c, **v) for (c, k), v in first.items() if k == url]
    out.append(dict(url=url, host=sp.netloc, path=path, base=base, stem=stem, hash=h, chunk_id=chunk_id,
                    pages=r[4], caps=r[5], first=cap_info,
                    refs_stem=refs(stem if not chunk_id else '', ''), refs_hash=refs('', h)))
json.dump(out, open('notes/_missing_scripts_data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'scripts coletados')
c = collections.Counter(('cms_consumer' if 'cms_consumer' in o['path'] else 'kep' if '/kep/' in o['path'] else 'bedrock' if 'bedrock' in o['path'] else 'sdk/outros') for o in out); print(c)
print('com referencia de nome ou hash em arquivo local:', sum(1 for o in out if o['refs_stem'] or o['refs_hash']))
for o in out:
    if o['refs_stem'] or o['refs_hash']: print(' ', o['base'], [x[0] for x in (o['refs_stem'] + o['refs_hash'])][:3])
