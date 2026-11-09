# Compara o grafo da aplicacao das saidas inteiras truncadas com a soma das pecas, por tipo de no/aresta.
import json, glob, os, collections
os.chdir('C:/w/PiperLine/evidence_cli')
names = ['landing_lib-polyfill', 'kep_lib-polyfill', 'uifid-fingerprint-init', 'landing_771', 'kep_69']
out = {}
def kinds(path):
    d = json.load(open(path, encoding='utf-8'))['data']['normalized_result']
    g = d['graph']
    nk = collections.Counter((x.get('kind') or x.get('type') or '?') for x in g['nodes'])
    ek = collections.Counter((x.get('kind') or x.get('type') or x.get('relation') or '?') for x in g['edges'])
    return nk, ek, d['statistics']['modules'], len(d['semantic_graph']['nodes']), len(d['semantic_graph']['relations'])
for n in names:
    nk, ek, mods, sn, sr = kinds('_truncados_NAO_USAR/%s.json' % n)
    pk = collections.Counter(); pe = collections.Counter(); pm = psn = psr = 0
    for f in sorted(glob.glob('pecas/%s__*.json' % n)):
        a, b, m, s1, s2 = kinds(f); pk.update(a); pe.update(b); pm += m; psn += s1; psr += s2
    out[n] = dict(inteiro=dict(nos=dict(nk), arestas=dict(ek), modulos=mods, sem_nos=sn, sem_rel=sr),
                  pecas=dict(nos=dict(pk), arestas=dict(pe), modulos=pm, sem_nos=psn, sem_rel=psr))
json.dump(out, open('../notes/_truncated_vs_pieces.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok')
