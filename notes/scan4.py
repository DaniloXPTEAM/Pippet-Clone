import json, os, re, collections
p = r"C:\w\PiperLine\scripts\raw\sf16-sg.tiktokcdn.com\obj\eden-sg\bvfllz_vlkpc_nb\ljhwZthlaukjlkulzlp\seeyoujs\i18n\63042_224744\pt-BR.89180.json"
d = json.load(open(p, encoding="utf-8")); keys = list(d.keys())
def mods(prefix, idx=1, top=45):
    c = collections.Counter()
    for k in keys:
        if k.startswith(prefix):
            parts = k.split("_"); 
            if len(parts) > idx: c[parts[idx]] += 1
    return c.most_common(top)
for pre in ["Pippit_", "pp_", "pippit_", "web_", "cc4b_", "ppseo_"]:
    print(f"\n== módulos em {pre}* ({sum(1 for k in keys if k.startswith(pre))} chaves):")
    print("  ", mods(pre))
# palavras-chave funcionais
kw = ["agent","video","image","avatar","template","project","upload","editor","export","download","publish","schedule","credit","pricing","plan","subscription","brand","script","storyboard","voice","dubbing","translate","library","asset","workspace","team","invite","share","history","draft","music","caption","subtitle","product","ecommerce","tiktok","analytics","affiliate","coupon","payment","refund"]
print("\nCONTAGEM por tema (chaves contendo o termo):")
low = [k.lower() for k in keys]
for w in kw: print(f"  {w:12s} {sum(1 for k in low if w in k)}")
