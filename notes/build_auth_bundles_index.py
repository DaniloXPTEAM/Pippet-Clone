# Resume as analises REA de scripts/auth_bundles -> evidence_cli/auth_bundles/INDEX.md (por arquivo: modulos, achados, falhas de parse, tamanho).
import os, json, csv
D = r'C:\w\PiperLine\evidence_cli\auth_bundles'
rows = []; tot = {'modules': 0, 'findings': 0, 'parse_failures': 0, 'ast': 0}; bad = []
for f in sorted(os.listdir(D)):
    if not f.endswith('.js.json'): continue
    p = os.path.join(D, f)
    if os.path.getsize(p) == 0: bad.append((f, 'vazio/em andamento')); continue
    try:
        d = json.load(open(p, encoding='utf-8'))
        n = d['data']['normalized_result']; st = n['statistics']
        trunc = json.dumps(n['semantic_graph'].get('coverage', {}))
        rows.append((f[:-5], st.get('modules', 0), st.get('findings', 0), st.get('parse_failures', 0), st.get('visited_ast_nodes', 0), os.path.getsize(p), 'truncated' in trunc.lower() and '"truncated": true' in trunc.lower()))
        tot['modules'] += st.get('modules', 0); tot['findings'] += st.get('findings', 0); tot['parse_failures'] += st.get('parse_failures', 0); tot['ast'] += st.get('visited_ast_nodes', 0)
    except Exception as e: bad.append((f, str(e)[:80]))
out = ['# Análise estática REA dos bundles do app logado\n', f'Arquivos analisados com resultado: {len(rows)} de 250. Pendentes/erros: {len(bad)} {bad[:5]}.\n', f"Totais: módulos {tot['modules']}, achados {tot['findings']}, falhas de parse {tot['parse_failures']}, nós de AST visitados {tot['ast']}.\n", 'Cada arquivo foi analisado individualmente (`--source-path`) no contexto da pasta; relações entre arquivos NÃO são resolvidas (limitação declarada pelo REA). Autoridade: shipped-artifact, confiança: derived.\n', '\n| arquivo | módulos | achados | falhas parse | nós AST | bytes saída |\n|---|---|---|---|---|---|']
for r in rows: out.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |')
open(os.path.join(D, 'INDEX.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(len(rows), 'ok;', len(bad), 'pendentes;', tot)
