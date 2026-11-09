# Lote 4 (pelo REA CLI): recaptura das pendencias do PIPPIT_CAPTURE_STATUS.md. Somente abrir menus/paineis; nada e enviado/gerado/publicado.
import sys
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
URL = 'https://www.pippit.ai/avatar-and-voice'
CANVAS = 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260'
def safe(fn, name):
    try: fn()
    except Exception as e: print(f'[{name}] ERRO', repr(e)[:200], flush=True)
def tile(label, text, anc):
    s = S(label, URL); s.wait(8000)
    s.click_css(f'xpath=(//*[contains(normalize-space(text()),"{text}")])[1]/ancestor::div[{anc}]', 'tile').wait(6000)
    s.run(timeout=500)
def avatar_tiles():
    for anc in (1, 2, 3):
        safe(lambda anc=anc: tile(f'b4_photo_tile_a{anc}', 'usos gratuitos', anc), f'photo{anc}')
    for anc in (1, 2, 3):
        safe(lambda anc=anc: tile(f'b4_video_tile_a{anc}', '1999', anc), f'video{anc}')
    for anc in (1, 2):
        safe(lambda anc=anc: tile(f'b4_voice_tile_a{anc}', 'Criar nova', anc), f'voice{anc}')
def canvas_add_menu():
    s = S('b4_canvas_add_menu', CANVAS); s.wait(9000).click_role('button', 'Adicionar n\u00f3', 'add').wait(3000)
    s.run(timeout=500)
def skill_details():
    s = S('b4_skill_details', 'https://www.pippit.ai/skill'); s.wait(9000)
    s.click_css('[role=tabpanel] button:has-text("Detalhes") >> nth=1', 'det').wait(4000)
    s.run(timeout=500)
def asset_details():
    s = S('b4_asset_details', 'https://www.pippit.ai/asset-management-material'); s.wait(8000)
    s.click_css('[role=tabpanel] button:has-text("Detalhes") >> nth=0', 'det').wait(4000)
    s.run(timeout=500)
def history_more():
    s = S('b4_history_more', 'https://www.pippit.ai/home'); s.wait(8000)
    s.click_css('button:has-text("Mais") >> nth=2', 'hm').wait(3000)
    s.run(timeout=500)
def story_canvas():
    u = 'https://www.pippit.ai/story-studio/detail/canvas?projectId=1208679231236&canvasId=1209426944004&blueprintSource=novel_canvas_independent_entry&entrance_from=novel_page_canvas&overviewPippitAssetId=1208716699652'
    s = S('b4_story_canvas', u); s.wait(12000); s.run(timeout=500)
if __name__ == '__main__':
    for f in (story_canvas, canvas_add_menu, skill_details, asset_details, history_more, avatar_tiles):
        safe(f, f.__name__)
