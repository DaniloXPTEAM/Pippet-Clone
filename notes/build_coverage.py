# Cobertura por script: raw x inventario AST x evidence_cli x documentos. Gera notes/COVERAGE_BY_SCRIPT.csv
import os, json, hashlib, csv, collections
ROOT = 'C:/w/PiperLine'
os.chdir(ROOT)
src = open('notes/run_cli_all.py', encoding='utf-8').read()
head = src.split("OUT = r'")[0].replace('import subprocess, time, os, re, sys, json', 'import os')
ns = {}
exec(head, ns)
jobs = ns['jobs']
def rd(p):
    return {l.split('\t')[0]: l.rstrip('\n').split('\t') for l in open(p, encoding='utf-8')}
logw = rd('evidence_cli/_run_log.tsv')
logp = rd('evidence_cli/pecas/_run_log_pecas.tsv')
docs = {f: open(f, encoding='utf-8').read() for f in ['README.md', 'PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md', 'OPPORTUNITY_IMPLEMENTATION_BLUEPRINT.md', 'evidence_cli/INDEX.md', 'notes/REA_GRAFO_STATUS.md']}
urls = set(open('notes/urls_estaticas_publicas.txt', encoding='utf-8').read().split())
rawroot = os.path.abspath('scripts/raw')
rows = []
for root, srcp, name in jobs:
    raw = os.path.join(root, srcp.replace('/', os.sep))
    ok = os.path.exists(raw)
    rel = os.path.relpath(raw, rawroot).replace(os.sep, '/')
    host, path = rel.split('/', 1)
    url = 'https://%s/%s' % (host, path)
    base = os.path.basename(raw)
    sha = hashlib.sha256(open(raw, 'rb').read()).hexdigest() if ok else ''
    size = os.path.getsize(raw) if ok else 0
    a_ok = os.path.exists('notes/ast_inventory/%s.json' % base)
    ev_whole = 'evidence_cli/%s.json' % name
    whole_ok = os.path.exists(ev_whole) and name in logw and logw[name][5] == '0' and logw[name][6] == '0'
    pcs = sorted(k for k in logp if k.startswith(name + '__'))
    if whole_ok:
        ev, cls, nodes, npc = ev_whole, 'completo (arquivo inteiro)', int(logw[name][4]), 0
    elif pcs and all(logp[k][5] == '0' and logp[k][6] == '0' for k in pcs):
        ev, cls, nodes, npc = 'evidence_cli/pecas/%s__*.json' % name, 'completo em pecas', sum(int(logp[k][4]) for k in pcs), len(pcs)
    else:
        ev, cls, nodes, npc = '', 'SEM EVIDENCIA COMPLETA', 0, 0
    stem = base.rsplit('.', 2)[0] if base.count('.') >= 2 else base
    mention = [os.path.basename(f) for f, t in docs.items() if base in t or name in t or (stem in t and len(stem) > 6)]
    rows.append([name, base, rel, 'sim' if ok else 'NAO', size, sha, url, 'sim' if url in urls else 'nao', 'sim' if a_ok else 'NAO', ev, cls, npc, nodes, ';'.join(mention)])
with open('notes/COVERAGE_BY_SCRIPT.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['id', 'arquivo', 'caminho_em_scripts_raw', 'existe_em_raw', 'bytes', 'sha256', 'url_de_origem', 'url_na_lista_publica', 'inventario_ast', 'evidencia', 'classe', 'n_pecas', 'nos_rea', 'mencionado_em'])
    w.writerows(rows)
print(len(rows), 'scripts; sem raw:', [r[0] for r in rows if r[3] != 'sim'])
print(collections.Counter(r[10] for r in rows))
print('sem inventario AST:', [r[0] for r in rows if r[8] != 'sim'])
print('URL fora da lista:', [r[0] for r in rows if r[7] != 'sim'])
print('sem mencao nos docs:', [r[0] for r in rows if not r[13]])
print('mencionado em 1 doc so:', [(r[0], r[13]) for r in rows if r[13] and ';' not in r[13]])
