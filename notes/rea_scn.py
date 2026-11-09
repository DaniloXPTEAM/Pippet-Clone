# Driver de capturas pelo REA CLI (processo independente do MCP, saida em disco, sem limite de tamanho do MCP).
# Uso (modulo): from rea_scn import S; s = S('rotulo', 'https://www.pippit.ai/home'); s.wait(3000); s.click_role('button','X'); s.run()
# Grava captures/auth/scenario_<rotulo>.json (evidencia REA completa) e captures/auth/<rotulo>/<passo>.txt (acessibilidade, e-mails mascarados).
import json, os, re, subprocess, sys, time
ROOT = r'C:\w\PiperLine'
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
import urllib.request
def _rea_tab():
    # aba propria do REA (nao mexe nas abas do usuario): reutiliza a registrada, senao cria uma nova via CDP
    f = os.path.join(ROOT, 'notes', '_rea_tab.txt')
    try:
        tid = open(f).read().strip()
        lst = json.load(urllib.request.urlopen('http://127.0.0.1:9222/json/list', timeout=5))
        if any(x['id'] == tid for x in lst): return tid
    except Exception: pass
    req = urllib.request.Request('http://127.0.0.1:9222/json/new?https://www.pippit.ai/home', method='PUT')
    tid = json.load(urllib.request.urlopen(req, timeout=10))['id']
    open(f, 'w').write(tid); time.sleep(6); return tid
TARGET = _rea_tab()
ENV = {"locale": "pt-BR", "timezone": "America/Sao_Paulo", "viewport": {"width": 1440, "height": 900, "device_scale_factor": 1},
       "color_scheme": "light", "reduced_motion": "no-preference", "service_workers": "allow"}

def _loc_role(role, name): return {"kind": "role", "role": role, "name": name}
def _loc_css(sel): return {"kind": "css", "selector": sel}

class S:
    def __init__(self, label, url, query=None, bodies=True, acc_each=True, screenshot_end=True, events=("network", "page-errors", "popups")):
        self.label, self.url, self.query = label, url, query or []
        self.steps = []; self.bodies = bodies; self.acc_each = acc_each; self.screenshot_end = screenshot_end; self.events = list(events)
        self.n = 0
    def _id(self, name):
        self.n += 1; return f"{name}{self.n:02d}"
    def wait(self, ms, name='w'): self.steps.append({"step_id": self._id(name), "action": "wait_for_timeout", "duration_ms": ms}); return self
    def goto(self, url, name='g', wait_until='load'):
        base, _, q = url.partition('?')
        query = [{"name": k, "value": {"source": "literal", "value": v}} for k, v in (p.split('=', 1) for p in q.split('&') if p)] if q else []
        self.steps.append({"step_id": self._id(name), "action": "goto", "destination": {"url": base, "query": query}, "wait_until": wait_until}); return self
    def click(self, loc, name='c', timeout=8000):
        self.steps.append({"step_id": self._id(name), "action": "click", "locator": loc, "timeout_ms": timeout}); return self
    def click_role(self, role, nm, name='c', timeout=8000): return self.click(_loc_role(role, nm), name, timeout)
    def click_css(self, sel, name='c', timeout=8000): return self.click(_loc_css(sel), name, timeout)
    def press(self, loc, key, name='k'):
        self.steps.append({"step_id": self._id(name), "action": "press", "locator": loc, "key": key, "timeout_ms": 5000}); return self
    def esc(self): return self.press(_loc_css('body'), 'Escape', 'esc')
    def spec(self):
        q = []
        for p in self.query: q.append(p)
        cap = {"after_each_step": (["url", "accessibility"] if self.acc_each else ["url"]),
               "at_end": (["url", "screenshot"] if self.screenshot_end else ["url"]), "events": self.events,
               "network": {"request_body": self.bodies, "response_body": self.bodies, "header_values": False}}
        base, _, qs = self.url.partition('?')
        query = [{"name": k, "value": {"source": "literal", "value": v}} for k, v in (p.split('=', 1) for p in qs.split('&') if p)] if qs else []
        return {"browser": {"mode": "connect", "cdp_endpoint": "http://127.0.0.1:9222", "target_id": TARGET},
                "start_url": {"url": base, "query": query}, "actions": self.steps, "capture": cap, "environment": ENV}
    def run(self, timeout=600):
        os.chdir(ROOT); os.makedirs('captures/auth/_specs', exist_ok=True)
        sp = f'captures/auth/_specs/{self.label}.json'; json.dump(self.spec(), open(sp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        out = f'captures/auth/scenario_{self.label}.json'; t = time.time()
        with open(out, 'wb') as fo, open(f'captures/auth/_specs/{self.label}.err', 'wb') as fe:
            rc = subprocess.call(['node', 'scripts/rea.mjs', 'capture-browser-scenario', os.path.join(ROOT, sp), '--full-output', '--format', 'json'], cwd=PKG, stdout=fo, stderr=fe, timeout=timeout)
        print(f'[{self.label}] rc={rc} {round(time.time()-t)}s {os.path.getsize(out)} bytes')
        return summarize(self.label)

def summarize(label, show_steps=True):
    os.chdir(ROOT)
    d = json.load(open(f'captures/auth/scenario_{label}.json', encoding='utf-8'))
    d = d.get('normalized_result') or d.get('data', {}).get('normalized_result') or d
    if 'steps' not in d: print('sem steps; chaves:', list(d)[:8]); print(json.dumps(d)[:600]); return None
    os.makedirs(f'captures/auth/{label}', exist_ok=True)
    for s in d['steps']:
        err = (s.get('error') or '')[:110].replace('\n', ' ')
        if show_steps: print(f"  {s['step_id']:<14}{s['status']:<10}{s['after_url']['url'][:95]}  {err}")
        a = s['artifacts'].get('accessibility', {})
        if a.get('state') == 'captured':
            t = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '<email>', a['value']['text'])
            open(f"captures/auth/{label}/{s['step_id']}.txt", 'w', encoding='utf-8').write(t)
    return d
