import json, re
p = r"C:\w\PiperLine\scripts\raw\sf16-sg.tiktokcdn.com\obj\eden-sg\bvfllz_vlkpc_nb\ljhwZthlaukjlkulzlp\seeyoujs\i18n\63042_224744\pt-BR.89180.json"
d = json.load(open(p, encoding="utf-8"))
def show(prefixes, n=12, w=90):
    for pre in prefixes:
        ks = [k for k in d if k.startswith(pre)]
        print(f"\n## {pre}* ({len(ks)})")
        for k in ks[:n]: print(f"  {k[len(pre):][:46]:46s} | {str(d[k]).replace(chr(10),' ')[:w]}")
show(["web_signin_", "Pippit_login", "Pippit_signup_", "pippit_signin"], n=14)
show(["cc4b_freeplan_", "cc4b_starterplan_", "Pippit_subscribe_"], n=8)
show(["Pippit_aigc", "web_aigc_", "Pippit_compliance_", "Pippit_termaudit_", "Pippit_sandbox_"], n=4)
# provedores de login mencionados
txt = " ".join(str(v) for k, v in d.items() if "signin" in k.lower() or "login" in k.lower())
print("\nProvedores citados em textos de login:", sorted(set(re.findall(r"Google|Facebook|TikTok|Apple|CapCut|Email|e-mail|Telefone|LinkedIn|Microsoft", txt, re.I)))[:12])
