# VERIFICAÇÃO — relatório do agente do PC (12/11/2026)

Relatório recebido: levantamento de REA no PC + Drive, alerta do SSD D: desconectado, tabela de arquivos e suspeita de que as evidências dos zips não estariam sendo mineradas. Verificado daqui (Drive + repositório + mineração dos zips). **Só leitura no Drive** — nenhum arquivo do Drive foi alterado; os zips baixados foram para `google_drive/` (fora do git).

## Afirmação por afirmação

| Afirmação do relatório | Veredito | Prova |
|---|---|---|
| `evidence_cli` (9,2 GB) no D: (desconectado) + cópia no Drive como `evidence_cli.zip` (1,57 GB) | **CONFIRMADO (Drive)** | `evidence_cli.zip` = **1.573.464.689 B** na pasta de evidências (`1umlPYMEHvA8isobTP53NwVY-diL3NCPp`); o D: não é verificável daqui |
| `captures/` (0,9 GB, inclui `current_670`) + `captures.zip` (200 MB) | **CONFIRMADO** | `captures.zip` = **200.014.367 B** (mesmo número dos stage reports) |
| `scripts/` + `scripts.zip` (63 MB) | **CONFIRMADO + MINERADO** | `scripts.zip` = **62.725.625 B**; baixado e extraído: **911 arquivos = exatamente a contagem do manifesto** |
| `screenshots/` e `verify_data/` em zips | **CONFIRMADO** | `screenshots.zip` (25.876.463 B) e `verify_data.zip` (1.252 B) |
| 10 bundles de sessão (lote3–lote12, ~474 MB) em `captures\current_670`; **só lote12 e lote10 soltos** | **CONFIRMADO** | No Drive soltos: `rea_session_bundle_lote10.json` (2.080.733 B) e `lote12.json` (68.343.826 B) — mais nada. O `MANIFEST_SHA256.csv` lista **10**: lote3, lote5, **lote5b**, lote6–12 (**não existe lote4**); soma = 474 MiB ✓ (o "474 MB" do relatório é MiB) |
| "pelo manifesto estariam dentro de `captures.zip`, mas não confirmei" | **CONFIRMADO AGORA** | Os 10 bundles constam no manifesto (caminho `captures/current_670/…` + bytes + sha256), e `captures.zip` é a cópia compactada de `captures/` — logo os 8 ausentes estão lá dentro |
| `MANIFEST_SHA256.csv` (4.264 arquivos, com hash) no PC e no Drive | **CONFIRMADO** | Local: 4.264 linhas + cabeçalho. Drive: 833.618 B = local 829.353 B + 1 CR por linha (CRLF) — mesmo conteúdo |
| `C:\w\reatest` não está no Drive | **CONFIRMADO** | Busca `name contains 'reatest'`: 0 resultados |
| Pastas das entregas (entrega_3…18, ordem_12, ordem_13) todas no Drive | **CONFIRMADO COM RESSALVA** | entrega_3, 6, 7, 8, 9, 10–18 localizadas (3 e 7 em `mesa_de_operacao`; 6, 8, 9 na raiz; 10–18 em "entregaveis"); **entrega_4 e entrega_5 não existem como pasta** — existem como entregas compactadas (`E4-f9391dc-delivery.zip`, `Pippet-E5-entrega-1a82ea3.zip`) + relatórios E4/E5 |
| Conferência 3.209 arquivos, 9 de `notes/` de fora | **COERENTE** | Manifesto tem 3.200 nas 5 pastas (captures 1.959 + scripts 911 + notes 292 + screenshots 37 + verify_data 1); 3.200 + 9 = 3.209 ✓ |
| 11 cópias do `rea_session_bundle_lote12.json` (~717 MB) em pastas de rodadas | **NÃO VERIFICÁVEL DAQUI** (é no PC; no Drive há 1 cópia solta e no repositório 1 cópia) | 11 × 65 MiB ≈ 717 MB fecha a conta. Apagar é decisão do usuário — não apaguei nada |
| SSD D: desconectado | **NÃO VERIFICÁVEL DAQUI** — confiar no relatório e reconectar | |

## A suspeita central: "está minerando o que já está nos zips?"

**Resposta: sim, e esta verificação prova nos dois sentidos.**

1. **Já era minerado** (antes deste relatório): `telas_internas_A.zip` (25 capturas internas) e `screenshots.zip` (39) foram abertos e extraídos — deles saíram as respostas do `REVISAO_REA.md` (Link account = TikTok/Facebook Page/Instagram Reels; dropdowns do compositor; drawer de avatar; foto falante etapa 1). O `lote12` também foi minerado (registro REA + árvores de acessibilidade + 2 screenshots).
2. **Minerado AGORA, a pedido**: `scripts.zip` (911 bundles JS) — e ele **confirmou a suspeita**: havia evidência não extraída. Novidades que fecham ou afinam lacunas:
   - **Porta de idade (pergunta 3) — CONTRATO COMPLETO:** chunk `async__global-age-gate`; `POST /lv/v1/sc/age_gate/log_in_age_check` (headers `store-country-code`, `uid`, `sign`/`device-time`/`sign-ver`/`pf`/`appvr`/`tdid`; corpo `{}`); `check_result`: **2 = kick_out** → tela **"Can't access Pippit" / "You can't access Pippit due to age restrictions in your country or region." / botão "Sign Out"**; **1 = needs_ui**; resto = passed. (Só a tela de `needs_ui` segue sem captura.)
   - **Widget de ajuda (pergunta 19) — CONTRATO:** iframe `https://kefu-im.bytedance.com/im/summon_falcon/prod/index.html` (`appId`, `channel`, `entrance`, `sign_token`, `inst_id`); variante `https://summon.bytedance.com/hibot/web`; help center `https://helpdesk.bytedance.com/sites/standalone/helpcenter_web/home` (`biz_id`, `app_id`…). Ponte: `initParam`, `changeTheme`, `openExternalFeedback`.
   - **SSE (pergunta 5) — URLs:** `GET /api/biz/v1/agent/subscribe_run?run_id=…` e `/api/biz/v1/agent/subscribe_thread?thread_id=…` (junto de submitRun/cancelRun/listUserHistory/deleteThread/updateThread).
   - **Omni (pergunta 4) — mapa real dos endpoints** (26 só de omni/digital_human): `get_tone_list {count,cursor}`, `get_hot_audio_list {count,cursor}`, `batch_delete_digital {img_list}`, `text_to_speech`, `audio_to_text`, `create_task_web`, `try_task`, `retry_task`, `before_create_limit_check`, `image_object_detect`, `get_img_list`, `recommend_by_tag`, `filter_config`, `create_training_task`, `upload_sign`… envelope `{ret:"0", errmsg, logId, data}`.
   - **Presets de áudio (pergunta 1) — AFINADO:** o contrato do preset é `formFields {audioModel, …parameters}` → `modelKey` + parâmetros, com o campo de preferência **`tone`** (cenas observadas nos bundles: **conversation, narration, voiceover, chat, Customer service, Storytelling**); `preferenceInfo` envia `tone` sempre. Os **nomes** dos presets da Home vêm do catálogo em runtime (`preset_catalog_unavailable` sem ele) — seguem sem literal.
   - **Inspiration (pergunta 2) — AFINADO:** itens são capabilities com `inspiration_id`/`group_id`/`tpl_id` (`capabilityId`, `creativeTemplate.templateId`), `POST /api/biz/v1/common/transfer_material {scene:"showcase", id?, asset_id, workspace_id}`. Feed em si segue sem captura.
3. **O que NÃO se minera daqui:** `captures.zip` (200 MB) e `evidence_cli.zip` (1,57 GB) passam do limite de transferência do conector do Drive (**100 MiB** — o mesmo limite registrado nos relatórios antigos). Para cruzar as 271 linhas com esses dois, o caminho é: **dividi-los no PC em volumes ≤ 90 MB** (ou reconectar o D: e o agente do PC faz o cruzamento lá). O `captures.zip` é o que provavelmente tem as capturas CDP (`captures/auth/…`, `autoroute/*.har`) que hoje só existem localmente.

## Correções de interpretação do relatório

- **"271 de 423 linhas estão 'inventadas' (não implementadas)"** — leitura errada: "inventada" = linha do catálogo cujo **conteúdo foi criado pela reconstrução sem observação** (não é sinônimo de "não implementada" — há linhas implementadas e inventadas ao mesmo tempo). E o fato de o relatório da Arena "pedir capturas" não prova falta de mineração: as capturas **existentes** já foram usadas (itens 1 e 2 acima); o que falta são capturas que **não existem** em lugar nenhum (inspiration feed, menu "…" dos avatares, telas de `needs_ui`).
- **"zips que não consegui abrir daqui"** — daqui eles abrem (foram abertos 4: telas_internas_A, screenshots, scripts, verify_data/lote10). O gargalo não é o zip, é o tamanho: >100 MiB o conector não transfere.

## Pendências (decisão do usuário)

1. **SSD D:** reconectar para o agente do PC cruzar `evidence_cli` (9,2 GB) com as 271 linhas — ou me enviar `captures.zip`/`evidence_cli.zip` divididos em volumes ≤ 90 MB que eu cruzo daqui.
2. **11 cópias do lote12 (~717 MB)**: listar e apagar é decisão sua; nada foi apagado.
3. O cruzamento das **271 linhas** com `scripts.zip` **já começou** (itens 2 acima); o restante depende de `captures.zip`/`evidence_cli.zip`.
