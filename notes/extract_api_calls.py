# Extracao estatica das chamadas de rede dos bundles do app logado: metodo HTTP, caminho, metodo-wrapper e dica de corpo (por pareamento de parenteses).
# Saida: notes/auth_api_calls.json. NAO executa codigo; sao pistas estaticas, nao prova de comportamento.
import os, re, json, collections
SRC = r'C:\w\PiperLine\scripts\auth_bundles'
paths = [l.split()[0] for l in open(r'C:\w\PiperLine\notes\auth_api_paths.txt', encoding='utf-8') if l.strip()]
pathset = set(paths)
lit = re.compile(r'(["\'`])(/(?:api|lv|commerce|mweb|agent|nest)[A-Za-z0-9_/\-\.]{3,90})\1')
wrap = re.compile(r'(?:async\s+([A-Za-z0-9_$]+)\s*\(|([A-Za-z0-9_$]+)\s*[:=]\s*async\s*(?:function\s*)?\()')
meth = re.compile(r'\.(post|get|put|delete|patch|request)\s*\(\s*$|method\s*:\s*["\'](POST|GET|PUT|DELETE|PATCH)["\']', re.I)
def args_after(s, i, limit=260):
    depth = 1; j = i
    while j < len(s) and j - i < limit:
        ch = s[j]
        if ch in '([{': depth += 1
        elif ch in ')]}':
            depth -= 1
            if depth == 0: break
        j += 1
    return s[i:j]
calls = collections.defaultdict(lambda: {'method': set(), 'wrappers': set(), 'args': set(), 'files': set()})
for f in sorted(os.listdir(SRC)):
    s = open(os.path.join(SRC, f), encoding='utf-8', errors='ignore').read()
    for m in lit.finditer(s):
        p = m.group(2)
        if p not in pathset: continue
        pre = s[max(0, m.start() - 160):m.start()]
        mm = None
        for x in meth.finditer(pre): mm = x
        c = calls[p]; c['files'].add(f)
        if mm: c['method'].add((mm.group(1) or mm.group(2)).upper())
        w = None
        for x in wrap.finditer(s[max(0, m.start() - 700):m.start()]): w = x
        if w: c['wrappers'].add(w.group(1) or w.group(2))
        a = args_after(s, m.end()).strip()
        if a.startswith(','): c['args'].add(a[1:].strip()[:140])
out = {p: {k: sorted(v) for k, v in c.items()} for p, c in calls.items()}
json.dump(out, open(r'C:\w\PiperLine\notes\auth_api_calls.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
mc = collections.Counter(m for c in out.values() for m in c['method'])
print(len(out), 'caminhos achados;', 'com metodo:', sum(1 for c in out.values() if c['method']), dict(mc), '| com corpo:', sum(1 for c in out.values() if c['args']))
