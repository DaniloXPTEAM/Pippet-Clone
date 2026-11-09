import json
p = r"C:\w\PiperLine\scripts\raw\sf16-sg.tiktokcdn.com\obj\eden-sg\bvfllz_vlkpc_nb\ljhwZthlaukjlkulzlp\seeyoujs\i18n\63042_224744\pt-BR.89180.json"
d = json.load(open(p, encoding="utf-8"))
def show(prefixes, n=14, w=95):
    for pre in prefixes:
        ks = [k for k in d if k.startswith(pre)]
        print(f"\n## {pre}* ({len(ks)})")
        for k in ks[:n]: print(f"  {k[len(pre):][:48]:48s} | {str(d[k]).replace(chr(10),' ')[:w]}")
show(["Pippit_queue_", "Pippit_creditrecord", "Pippit_agent_button_", "Pippit_videoagent_", "Pippit_imageagent_", "Pippit_imageeditor_", "Pippit_export", "Pippit_xyqcanvas"], n=10)
show(["Pippit_anyinput_"], n=14)
show(["Pippit_talkingphoto_", "Pippit_productshowcase_"], n=9)
show(["web_posttt_", "web_postfb_", "web_toolsIntergration", "web_storage_", "web_timing_"], n=7)
show(["cc4b_rebrand_", "cc4b_referral_", "cc4b_freeplan_"], n=6)
show(["Pippit_aigc", "web_aigc_", "Pippit_compliance_", "Pippit_termaudit_"], n=5)
