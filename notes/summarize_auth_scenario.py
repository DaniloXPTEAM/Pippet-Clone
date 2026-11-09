# Resume uma captura autenticada: passos, URL final de cada passo, endpoints novos por passo e texto visivel por passo (e-mails mascarados).
import json,re,sys
from urllib.parse import urlsplit
d=json.load(open(sys.argv[1],encoding='utf-8'))['normalized_result']
steps={s['step_index']:s for s in d['steps']}
seen=set(); newep={}
for e in d['events']['items']:
    if e['kind']!='request' or e.get('resource_type') not in('fetch','xhr'): continue
    sp=urlsplit(e['url']['url'])
    if 'pippit.ai' not in sp.netloc: continue
    k=(e['method'],sp.path)
    if k not in seen: seen.add(k); newep.setdefault(steps[e['step_index']]['step_id'],[]).append(k)
for s in d['steps']:
    print('##',s['step_id'],s['status'],s['after_url']['url'][:100],(s.get('error') or '')[:120].replace('\n',' '))
    for k in newep.get(s['step_id'],[]): print('   +',*k)
    a=s['artifacts'].get('accessibility',{})
    if a.get('state')=='captured' and not s['step_id'].startswith(('go_home','settle')) :
        t=re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+','<email>',a['value']['text'])
        open(f"captures/auth/step_{s['step_id']}.txt",'w',encoding='utf-8').write(t)
