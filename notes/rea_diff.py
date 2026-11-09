# Diff de acessibilidade por passo.
#   python rea_diff.py <nome>                 -> resultado REA salvo em captures/audit/rea/<nome>.json (linhas novas por passo)
#   python rea_diff.py cdp <tarefa>           -> relatorio do controlador (captures/auth/cdp/<tarefa>/report.json): passos, status, linhas novas, falhas
#   python rea_diff.py files <antes> <depois> -> compara dois arquivos de arvore de acessibilidade (.a11y.txt)
import json, sys, os
def show(lines, limit=60, indent='    '):
    if len(lines) < limit:
        for l in lines: print(indent, l[:170])
mode = sys.argv[1]
if mode == 'cdp':
    d = os.path.join(r'C:\w\PiperLine\captures\auth\cdp', sys.argv[2])
    rep = json.load(open(os.path.join(d, 'report.json'), encoding='utf-8'))
    ok = sum(1 for r in rep if r['status'] == 'ok')
    print(f'{sys.argv[2]}: {ok}/{len(rep)} passos ok; falhas: ' + (', '.join(f"[{r['i']}]{r['step']}" for r in rep if r['status'] != 'ok') or 'nenhuma'))
    for r in rep:
        c = r.get('click') or {}
        print('--', r['i'], r['step'], r['status'], f"{r.get('ms')}ms", '| metodo:', c.get('method'), '| verificado:', c.get('verified'), '| novas:', r.get('new_count', 0), (r.get('error') or c.get('error') or '')[:100])
        show(r.get('new_lines', [])[:40], 41)
elif mode == 'files':
    a = set(open(sys.argv[2], encoding='utf-8').read().split('\n')); b = open(sys.argv[3], encoding='utf-8').read().split('\n')
    new = [l for l in b if l not in a]; gone = [l for l in a if l not in set(b)]
    print('novas:', len(new), '| removidas:', len(gone)); show(new, 80); print('-- removidas'); show(gone, 40)
else:
    d = json.load(open('C:/w/PiperLine/captures/audit/rea/' + mode + '.json', encoding='utf-8'))
    n = d['normalized_result']; print('evidence_id', d['evidence_id'])
    prev = set()
    for s in n['steps']:
        a = s['artifacts'].get('accessibility', {})
        st = s['status'] + (' ' + (s.get('error') or '')[:90].replace(chr(10), ' ') if s['status'] != 'completed' else '')
        if a.get('state') != 'captured':
            print('--', s['step_id'], st); continue
        lines = [l for l in a['value']['text'].split(chr(10))]
        new = [l for l in lines if l not in prev]
        print('--', s['step_id'], st, '| novas:', len(new))
        if s['step_id'] not in ('scenario_start', 'w0'): show(new)
        prev = set(lines)
