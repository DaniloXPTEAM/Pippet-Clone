# Extrai dos bundles os "metodos SDK" do tipo Name(e,t){let r=e||{},i=this.genBaseURL("/path"),a={k:r.k,...};return this.request({url:i,method:"POST",data:a},t)}
# -> notes/auth_sdk_schemas.json : {path: {sdk_method, http, request_keys[], files[]}}. Estatico: chaves do corpo declaradas no codigo, nao validadas em execucao.
import os, re, json, collections
import sys
SRC = sys.argv[1]
pat = re.compile(r'([A-Za-z0-9_$]+)\(([a-z]),([a-z])\)\{(?:let [a-z]=[a-z]\|\|\{\},[a-z]=this\.|let [^;{}]{0,80};|)[^{}]{0,200}?genBaseURL\(\s*["\'`](/[A-Za-z0-9_/\-\.]+)["\'`]\s*\)(?P<body>.{0,1200}?)return this\.request\(\{(?P<req>[^}]{0,200})\}', re.S)
out = collections.defaultdict(lambda: {'sdk_method': set(), 'http': set(), 'request_keys': set(), 'query_keys': set(), 'files': set()})
for f in sorted(os.listdir(SRC)):
    s = open(os.path.join(SRC, f), encoding='utf-8', errors='ignore').read()
    if 'genBaseURL' not in s: continue
    for m in pat.finditer(s):
        path = m.group(4); body = m.group('body'); req = m.group('req')
        o = out[path]; o['sdk_method'].add(m.group(1)); o['files'].add(f)
        h = re.search(r'method:"([A-Z]+)"', req)
        if h: o['http'].add(h.group(1))
        # objeto literal atribuido a uma variavel: x={k:...,k2:...}
        for ob in re.finditer(r'[,;]\s*[a-z]\s*=\s*\{(.{0,700}?)\}(?=[,;]|\s*return)', body, re.S):
            for k in re.findall(r'(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:', ob.group(1)): o['request_keys'].add(k)
res = {p: {k: sorted(v) for k, v in o.items()} for p, o in out.items()}
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(res), 'endpoints com metodo SDK;', 'com chaves de corpo:', sum(1 for o in res.values() if o['request_keys']))
