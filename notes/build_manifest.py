# MANIFEST_SHA256.csv: caminho, tamanho, sha256, origem de cada arquivo da pasta (exceto notes/node_modules e o proprio manifesto).
import os, hashlib, csv, sys, collections
ROOT = 'C:/w/PiperLine'
os.chdir(ROOT)
SKIP_DIRS = {'node_modules', '__pycache__'}
def origin(rel):
    p = rel
    if p.startswith('scripts/raw/'):
        host, path = p[len('scripts/raw/'):].split('/', 1)
        return 'download publico de https://%s/%s' % (host, path)
    if p.startswith('scripts/export/'): return 'REA export_web_scripts (copia de arquivo publico pequeno)'
    if p.startswith('scripts/recovered/get/'): return 'GET publico da URL exata observada pelo REA (log: notes/get_log.tsv, get_log_retry.tsv)'
    if p.startswith('scripts/recovered/'): return 'REA export_web_scripts / capture_browser_scenario (captura com corpos)'
    if p.startswith('scripts/split_rec/'): return 'derivado de scripts/recovered por notes/split_bundle.mjs e split_iife_body.mjs'
    if p.startswith('scripts/stage_short/'): return 'copia de scripts/recovered com caminho curto (o node nao abre caminhos longos)'
    if p.startswith('scripts/split/'): return 'derivado de scripts/raw/ por notes/split_*.mjs (pecas por modulo/instrucao)'
    if p.startswith('screenshots/'): return 'captura de tela de pagina publica (Chrome headless); nome = pagina_viewport'
    if p.startswith('captures/'): return 'REA capture_browser_scenario (navegacao publica sem login)'
    if p.startswith('evidence_cli/_truncados_NAO_USAR/'): return 'REA CLI rea-agents 6.5.0 sobre o script inteiro; grafo semantico TRUNCADO (grafo da aplicacao completo em 3 deles)'
    if p.startswith('evidence_cli/pecas/'):
        return 'REA CLI rea-agents 6.5.0 sobre uma peca de scripts/split/' if p.endswith('.json') else 'gerado por notes/build_piece_xref.mjs e scripts Python'
    if p.startswith('evidence_cli/'): return 'REA CLI rea-agents 6.5.0 (grafo completo do script) ou log/indice gerado'
    if p.startswith('notes/ast_inventory/'): return 'leitura por AST (acorn 8.19) de scripts/raw/ via notes/ast_inventory.mjs'
    if p == 'rea_evidence_bundle_5.json': return 'REA export_evidence_bundle (sessao MCP, cumulativa)'
    if p.endswith('.md') and '/' not in p: return 'texto autoral (relatorio/indice)'
    if p.startswith('notes/'): return 'gerado/escrito nesta auditoria (scripts de apoio, catalogos, notas)'
    return 'desconhecida'
rows = []
dups = collections.defaultdict(list)
for dp, dn, fn in os.walk('.'):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    for f in fn:
        rel = os.path.join(dp, f)[2:].replace(os.sep, '/')
        if rel == 'MANIFEST_SHA256.csv': continue
        if rel.startswith('notes/_') and (rel.endswith('.out') or rel.endswith('.sh')): continue   # logs temporarios de execucao (nao fazem parte do snapshot)
        h = hashlib.sha256(); LP = chr(92) * 2 + '?' + chr(92) + os.path.abspath(rel)
        with open(LP, 'rb') as fh:
            for chunk in iter(lambda: fh.read(8 * 1024 * 1024), b''):
                h.update(chunk)
        sz = os.path.getsize(LP)
        rows.append([rel, sz, h.hexdigest(), origin(rel)])
        if sz > 0: dups[h.hexdigest()].append(rel)
rows.sort()
with open('MANIFEST_SHA256.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['caminho', 'bytes', 'sha256', 'origem']); w.writerows(rows)
dupl = {h: v for h, v in dups.items() if len(v) > 1}
import json
json.dump({h: v for h, v in dupl.items()}, open('notes/_duplicates_by_hash.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(rows), 'arquivos;', sum(r[1] for r in rows), 'bytes;', len(dupl), 'grupos de duplicados')
