# Ativos de rede vistos nas 3 capturas (captures/*.json) x copias locais em scripts/raw.
# Gera notes/MISSING_NETWORK_ASSETS.csv e .md. Nao faz nenhuma requisicao de rede.
import os, json, csv, collections, sys
from urllib.parse import urlsplit
os.chdir('C:/w/PiperLine')
RAW = os.path.abspath('scripts/raw')
DOWNLOADED = {}   # preenchido manualmente depois: url_sem_query -> (ok, detalhe)
if os.path.exists('notes/_download_results.json'):
    DOWNLOADED = json.load(open('notes/_download_results.json', encoding='utf-8'))
CAPS = {'scenario_multi_pages': 'captures/scenario_multi_pages.json',
        'scenario_template-studio': 'captures/scenario_template-studio.json',
        'scenario_video-agent': 'captures/scenario_video-agent.json'}
TELEMETRY_HOSTS = ('google', 'doubleclick', 'googletagmanager', 'clarity.ms', 'bing.com', 'byteoversea', 'bytedance', 'tiktok', 'snssdk', 'mon-', 'mcs', 'analytics', 'facebook', 'appsflyer', 'onelink', 'fpcdn')
def local_path(host, path):
    p = os.path.join(RAW, host, path.lstrip('/').replace('/', os.sep))
    return p if os.path.exists(p) else None
assets = {}   # (url_sem_query) -> dict
for cap, f in CAPS.items():
    d = json.load(open(f, encoding='utf-8'))['normalized_result']
    steps = {s['step_index']: s for s in d['steps']}
    for e in d['events']['items']:
        if e.get('kind') not in ('request', 'response', 'request-finished', 'request-failed'): continue
        u = e['url']['url']; sp = urlsplit(u)
        key = '%s://%s%s' % (sp.scheme, sp.netloc, sp.path)
        a = assets.setdefault(key, dict(url=key, host=sp.netloc, path=sp.path, tipo=set(), metodos=set(), status=set(), falhas=set(), paginas=set(), caps=set(), query=set()))
        a['tipo'].add(e.get('resource_type') or '?'); a['metodos'].add(e.get('method') or '?')
        if e.get('status'): a['status'].add(e['status'])
        if e.get('failure'): a['falhas'].add(e['failure'])
        a['query'].update(e['url'].get('query_parameter_names') or [])
        st = steps.get(e.get('step_index'))
        if st: a['paginas'].add(st['after_url']['url'].split('?')[0])
        a['caps'].add(cap)
rows = []
for key, a in sorted(assets.items()):
    local = local_path(a['host'], a['path'])
    tipo = '/'.join(sorted(a['tipo']))
    telem = any(t in a['host'] for t in TELEMETRY_HOSTS) and not a['host'].startswith('sf16-')
    if local: situ, mot = 'preservado', 'copia em scripts/raw'
    elif key in DOWNLOADED:
        ok, det = DOWNLOADED[key]; situ = 'preservado (baixado nesta etapa)' if ok else 'nao preservado'; mot = det
    elif a['falhas'] and not a['status']: situ, mot = 'nao carregou', 'a requisicao falhou no navegador (%s); nao ha resposta para preservar' % ','.join(sorted(a['falhas']))
    elif tipo.startswith('document'): situ, mot = 'nao preservado', 'documento HTML dinamico; estrutura registrada em notes/pages/*.json e screenshots, nao o HTML bruto'
    elif telem or a['metodos'] - {'GET'}: situ, mot = 'nao aplicavel', 'endpoint de telemetria/analise ou requisicao nao-GET; nao e arquivo estatico, nao foi chamado de novo'
    else: situ, mot = 'nao preservado', 'fora do conjunto coletado (a coleta salvou so JS, CSS, traducoes e manifest); nao testado se ainda esta acessivel'
    rows.append([key, a['host'], tipo, 'desconhecido (os eventos de rede nao trazem tamanho)', ' | '.join(sorted(a['paginas']))[:300], ','.join(sorted(a['caps'])), situ, 'nao tentado' if situ.startswith('nao preservado') else ('sim' if situ.startswith('preservado') else '-'), mot, ','.join(sorted(a['query']))[:120]])
with open('notes/MISSING_NETWORK_ASSETS.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['url_sem_query', 'dominio', 'tipo', 'tamanho', 'pagina(s)_onde_apareceu', 'captura', 'situacao', 'baixavel?', 'motivo', 'nomes_dos_parametros_de_query']); w.writerows(rows)
c = collections.Counter(r[6] for r in rows)
print(len(rows), 'URLs unicas (sem query)'); print(c)
ct = collections.Counter((r[6], r[2].split('/')[0]) for r in rows if r[6] in ('nao preservado',))
print(ct.most_common(12))
print('hosts fora do preservado:', collections.Counter(r[1] for r in rows if r[6] == 'nao preservado').most_common(8))
