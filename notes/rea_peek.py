# Abre o resultado salvo mais recente do MCP REA (tool-results) e resume. Uso: python rea_peek.py [nome-para-salvar]
import json, os, sys
BS = chr(92)
proj = os.path.expanduser('~') + BS + '.claude' + BS + 'projects'
cands = [BS + BS + '?' + BS + proj + BS + p for p in os.listdir(proj) if 'Local-Claude-Data' in p and '039b86' in p]
best = None
for c in cands:
    for root, dirs, fs in os.walk(c):
        if root.endswith('tool-results'):
            for f in fs:
                if f.startswith('mcp-rea-') and f.endswith('.txt'):
                    p = root + BS + f
                    if best is None or os.path.getmtime(p) > os.path.getmtime(best): best = p
d = json.load(open(best, encoding='utf-8'))
n = d['normalized_result']
print(best.split(BS)[-1]); print('evidence_id', d['evidence_id']); print('chaves', list(n.keys()))
for k, v in n.items():
    print(' ', k, type(v).__name__, len(v) if hasattr(v, '__len__') else v)
if len(sys.argv) > 1:
    out = 'C:/w/PiperLine/captures/audit/rea/' + sys.argv[1] + '.json'
    json.dump(d, open(out, 'w', encoding='utf-8')); print('salvo', out)
