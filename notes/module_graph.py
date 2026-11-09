# Grafo de modulos rspack dos bundles do app logado (estatico): modulo -> {chunk, requires[], endpoints[]} e alcance por pagina.
# Saidas: notes/auth_module_graph.json (resumo) e secao em PIPPIT_API_CATALOG.md (feito por quem chama). Nada e executado.
import os, re, json, collections
SRC = r'C:\w\PiperLine\scripts\auth_bundles'
paths = set(l.split()[0] for l in open(r'C:\w\PiperLine\notes\auth_api_paths.txt', encoding='utf-8') if l.strip())
modstart = re.compile(r'(?<![A-Za-z0-9_$.])(\d{4,7})\(([a-z]),([a-z])(?:,([a-z]))?\)\{')
req = re.compile(r'(?<![A-Za-z0-9_$.])[a-z]\((\d{4,7})\)')
lit = re.compile(r'(["\'`])(/(?:api|lv|commerce|mweb)[A-Za-z0-9_/\-\.]{3,90})\1')
mods = {}
for f in sorted(os.listdir(SRC)):
    s = open(os.path.join(SRC, f), encoding='utf-8', errors='ignore').read()
    ms = list(modstart.finditer(s))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(s)
        body = s[m.end():end]
        mid = m.group(1)
        mods.setdefault(mid, {'chunk': f, 'requires': set(), 'endpoints': set(), 'size': 0})
        d = mods[mid]; d['size'] += len(body)
        d['requires'].update(req.findall(body))
        for x in lit.finditer(body):
            if x.group(2) in paths: d['endpoints'].add(x.group(2))
print(len(mods), 'modulos;', sum(1 for d in mods.values() if d['endpoints']), 'com endpoints')
pages = [f for f in os.listdir(SRC) if re.match(r'async__(AgentChat|AssetManagementMaterialV2|AvatarAndVoice|HomePageV5|MarketingAgent|NestAgentProject|Novel|SchedulePublish|Settings|Skill|SmartCreation|media-publish|customize-digital-human|commerce-customize-digital-human|help-center|home-submit-lifecycle|title-bar-[a-z\-]+)\.', f)]
res = {}
for pf in sorted(pages):
    start = [mid for mid, d in mods.items() if d['chunk'] == pf]
    seen = set(start); fr = list(start); depth = 0
    while fr and depth < 12:
        nx = []
        for mid in fr:
            for r in mods.get(mid, {}).get('requires', ()):
                if r not in seen and r in mods: seen.add(r); nx.append(r)
        fr = nx; depth += 1
    eps = collections.Counter()
    for mid in seen:
        for e in mods[mid]['endpoints']: eps[e] += 1
    res[pf] = {'own_modules': len(start), 'reachable_modules': len(seen), 'reachable_endpoints': sorted(eps), 'chunks_touched': sorted(set(mods[m]['chunk'] for m in seen))[:12]}
json.dump(res, open(r'C:\w\PiperLine\notes\auth_module_graph.json', 'w', encoding='utf-8'), indent=1)
for pf, r in res.items(): print(pf.split('__')[1].split('.')[0], r['own_modules'], r['reachable_modules'], len(r['reachable_endpoints']))
