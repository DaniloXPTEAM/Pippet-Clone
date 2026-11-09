# Imprime, por passo, apenas o conteudo do dialogo (a partir de "- dialog") do resultado salvo em captures/audit/rea/<nome>.json. Uso: python rea_dialog.py <nome> [passos...]
import json, sys
d = json.load(open('C:/w/PiperLine/captures/audit/rea/' + sys.argv[1] + '.json', encoding='utf-8'))
n = d['normalized_result']; want = sys.argv[2:]
print('evidence_id', d['evidence_id'])
for s in n['steps']:
    if want and s['step_id'] not in want: continue
    a = s['artifacts'].get('accessibility', {})
    st = s['status'] + (' ' + (s.get('error') or '')[:100].replace(chr(10), ' ') if s['status'] != 'completed' else '')
    if a.get('state') != 'captured': print('--', s['step_id'], st); continue
    t = a['value']['text']; i = t.find('  - dialog')
    items = []
    for l in (t[i:].split(chr(10)) if i >= 0 else []):
        l = l.strip()
        if l.startswith('- button "Select '): items.append(l[len('- button "Select '):].split('"')[0])
    print('--', s['step_id'], st, '| itens:', len(items), '|', '; '.join(items)[:900])
