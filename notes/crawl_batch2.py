# Lote 2 (pelo REA CLI): estudios, skills, ativos, configuracoes. Somente abrir paineis/menus; nada e confirmado, gerado, publicado ou vinculado.
import sys
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
def safe(fn, name):
    try: fn()
    except Exception as e: print(f'[{name}] ERRO', repr(e)[:200])

def marketing():
    s = S('b2_marketing', 'https://www.pippit.ai/marketing-agent')
    s.wait(9000)
    for nm in ['Produto', 'Personagem', 'Formatos de an\u00fancio', 'Gancho', 'Estilo visual']:
        s.click_role('button', nm, 'm').wait(2500).esc().wait(800)
    s.run(timeout=600)
def story():
    s = S('b2_story', 'https://www.pippit.ai/story-studio/list?tab_name=home')
    s.wait(9000)
    s.click_role('button', 'Rotei' + 'rista de IA', 'story').wait(4000)
    s.goto('https://www.pippit.ai/story-studio/list?tab_name=home').wait(8000)
    s.click_role('button', 'Tela criativa', 'story').wait(5000)
    s.goto('https://www.pippit.ai/story-studio/list?tab_name=home').wait(8000)
    s.click_role('button', 'Colar roteiro', 'story').wait(3000)
    s.run(timeout=600)
def skills():
    s = S('b2_skills', 'https://www.pippit.ai/skill')
    s.wait(9000)
    s.click_role('button', 'Criar skill', 'skill').wait(5000)
    s.goto('https://www.pippit.ai/skill').wait(8000)
    s.click_css('button:has-text("Detalhes") >> nth=1', 'skill').wait(4000)
    s.goto('https://www.pippit.ai/skill').wait(8000)
    s.click_role('tab', 'Drama curto', 'skilltab').wait(3000).click_role('tab', 'Marketing Publicidade', 'skilltab').wait(3000)
    s.click_role('tab', 'Cinema e televis\u00e3o profissionais', 'skilltab').wait(3000)
    s.run(timeout=600)
def assets():
    s = S('b2_assets', 'https://www.pippit.ai/asset-management-material')
    s.wait(8000)
    s.click_role('button', 'Adicionar', 'add').wait(3000).esc().wait(800)
    s.click_role('button', 'Ordenar', 'ord').wait(3000).esc().wait(800)
    s.click_role('button', 'Ajustar visualiza\u00e7\u00e3o', 'view').wait(3000).esc().wait(800)
    s.click_css('button:has-text("Detalhes") >> nth=2', 'det').wait(4000)
    s.run(timeout=600)
def composer():
    s = S('b2_composer', 'https://www.pippit.ai/home')
    s.wait(8000)
    s.click_role('button', 'Marcar', 'mark').wait(3000).esc().wait(800)
    s.click_role('button', 'Carregar material de refer\u00eancia', 'ref').wait(3000).esc().wait(800)
    s.click_role('button', 'Modelos e prefer\u00eancias', 'mod').wait(2500)
    s.click_css('[role=dialog] button:has-text("Mostrar mais propor\u00e7\u00f5es")', 'ratio').wait(2500)
    s.esc().wait(800)
    s.click_role('tab', 'Marketing', 'tab').wait(3000).click_role('tab', 'Hist\u00f3rias', 'tab').wait(3000)
    s.run(timeout=600)
def settings_menus():
    s = S('b2_settings', 'https://www.pippit.ai/home')
    s.wait(7000)
    s.click_role('button', 'Abrir menu da conta', 'acc').click_css('[role=menuitem]:has-text("Configura\u00e7\u00f5es")', 'cfg').click_css('[role=menuitem]:has-text("Idioma")', 'lang').wait(3000)
    s.goto('https://www.pippit.ai/home').wait(6000)
    s.click_role('button', 'Abrir menu da conta', 'acc').click_css('[role=menuitem]:has-text("Configura\u00e7\u00f5es")', 'cfg').click_css('[role=menuitem]:has-text("Apar\u00eancia")', 'theme').wait(3000)
    s.goto('https://www.pippit.ai/home').wait(6000)
    s.click_role('button', 'Abrir menu da conta', 'acc').click_css('[role=menuitem]:has-text("Mais")', 'more').click_css('[role=menuitem]:has-text("CLI")', 'cli').wait(5000)
    s.run(timeout=700)
def history_menus():
    s = S('b2_history', 'https://www.pippit.ai/home')
    s.wait(7000)
    s.click_css('button[aria-haspopup]:has-text("Mais") >> nth=0', 'hmore').wait(3000)
    s.run(timeout=400)
if __name__ == '__main__':
    for f in (marketing, story, skills, assets, composer, settings_menus, history_menus):
        safe(f, f.__name__)
