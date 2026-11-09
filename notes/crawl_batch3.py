# Lote 3 (pelo REA CLI): fluxos de criacao de avatar/voz (somente abrir; nada e enviado) e detalhes de avatares existentes.
import sys
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
URL = 'https://www.pippit.ai/avatar-and-voice'
def safe(fn, name):
    try: fn()
    except Exception as e: print(f'[{name}] ERRO', repr(e)[:200])
def plus_in_section(title):
    # botao "+" do primeiro cartao da secao cujo titulo e `title`
    return f'xpath=(//*[normalize-space(text())="{title}"]/following::button[.//*[local-name()="svg"] or normalize-space(.)=""])[1]'
def photo_create():
    s = S('b3_photo_avatar_create', URL); s.wait(8000)
    s.click_css(plus_in_section('Foto em avatar'), 'plus').wait(6000)
    s.run(timeout=500)
def video_create():
    s = S('b3_video_avatar_create', URL); s.wait(8000)
    s.click_css(plus_in_section('V\u00eddeo em avatar'), 'plus').wait(6000)
    s.run(timeout=500)
def voice_create():
    s = S('b3_voice_create', URL); s.wait(8000)
    s.click_css(plus_in_section('Vozes personalizadas'), 'plus').wait(6000)
    s.run(timeout=500)
def existing_avatar():
    s = S('b3_existing_avatar', URL); s.wait(8000)
    s.click_css('xpath=(//*[normalize-space(text())="Crys"])[1]', 'crys').wait(6000)
    s.run(timeout=500)
def sample_avatar():
    s = S('b3_sample_avatar', URL); s.wait(8000)
    s.click_css('xpath=(//*[normalize-space(text())="Malcolm"])[1]', 'sample').wait(6000)
    s.run(timeout=500)
def editor_create_own():
    s = S('b3_editor_create_own', 'https://www.pippit.ai/editor?tab_name=video_generator&sub_tab=video&edit_type=edit')
    s.wait(8000).click_role('menuitem', 'Avatares', 'av').wait(3000).click_role('button', 'Criar o seu', 'own').wait(6000)
    s.run(timeout=500)
if __name__ == '__main__':
    for f in (photo_create, video_create, voice_create, existing_avatar, sample_avatar, editor_create_own):
        safe(f, f.__name__)
