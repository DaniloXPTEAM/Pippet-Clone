# Telemetria e monitoramento observados (Pippit, navegação pública anônima)

Fontes: capturas do REA (`captures/scenario_*`), código recuperado (`scripts/raw/.../landing_page/static/js/771.5a26a240f4.js`, saída do REA em `evidence_cli/`). Tudo abaixo foi observado; o que não foi, está marcado **DESCONHECIDO**.

## 1. Correção de premissa: `event/report` é GET, não POST
Em todas as capturas (`scenario_video-agent`, `_bodies`, `_run2`) a chamada é **`GET https://edit-api-sg.capcut.com/lv/v1/event/report?...`** (`resource_type: fetch`). O único **POST** do domínio de produto é `POST https://www.pippit.ai/lv/v1/user/web/user_info`. Há 1 evento `event/report` por carregamento de página de ferramenta (aparece 2-3 vezes na lista por request/response/ capture-ended). Não apareceu em `landing`/`pricing`/`template-studio` nas capturas atuais.

## 2. `GET /lv/v1/event/report` (page view)
**Duas variantes do mesmo cliente existem no código recuperado** (conferido contra a captura): (a) **cms_consumer** (`main.e32a6083.js`, `handleReportPv`; é a observada em `/tools/video-agent`): NÃO envia `user_agent`, lança erro interno se não houver `web_id` (engolido), sessão inicia se primeira visita ou `document.referrer` não contém o hostname, host de relatório = `window.__locationInfo.domain.web_domain` com fallback para uma constante (`ti.KR`, valor DESCONHECIDO), transporte `fetch(url,{referrerPolicy:"unsafe-url",credentials:"include"})`, `catch(e){}`. (b) **landing** (`771.5a26a240f4.js`, descrita abaixo): envia também `user_agent` e usa host do cookie/config. Os detalhes abaixo são da variante (b); a lista de parâmetros da (a) é a mesma menos `user_agent` (ordem conferida com a captura).
- **Quando**: no primeiro carregamento de página, depois que o consentimento de cookies permite (`consent === "skipped"` **ou** `firstPartyAnalytics` verdadeiro; assinatura em `initInClient`: `cookie.consent$ ... subscribe(() => allowCookie())`) e depois de `init()` resolver os parâmetros de canal. Nunca para bots (`env.isSpider` pula o fetch).
- **Quem**: classe `RuntimeUserTrackingClient.reportPageView(e)` (771). Transporte injetado: `fetchReportPV(url)` = `fetch(url, { referrerPolicy: "unsafe-url", credentials: "include" })`. Retorno não é lido.
- **Host**: `getReportHost()` = `config.domain.web_domain` (observado: `edit-api-sg.capcut.com`). Se vazio, **não envia**.
- **Web ID**: `getWebID()` = identificador global do runtime, senão cookie `_tea_web_id`, senão `context.services.request.webId`. Se vazio, **não envia**. (O valor é identificador de sessão; não registrado aqui.)
- **Parâmetros de query (nome = valor/derivação), na ordem de envio**:
  `is_pwa=0`, `pwa_from=not_pwa`, `open_from_pwa=0`, `web_id`, `event_name=user_page_view`, `os_name=unknown`, `app_version=` (vazio), `is_first_visit_page` (`1`/`0`; booleano do dado, senão cookie/`getIsFirstVisitPage`), `is_session_start_page` (`1` se primeira visita, ou se o referrer for de outro host), `browser=` (vazio), `referrer`, `user_agent`, `branch=master`, opcionalmente `<nome do cookie de locale>=<código>` (via `getPageViewLocale`), `custom={"session_start_url":...,"channel_from":...}` (só se um dos dois existir), `seo_info=<JSON do canal sem session_start_url/channel_from>`.
  Observado (video-agent): `is_first_visit_page=0`, `is_session_start_page=1`, `custom={"session_start_url":"https://www.pippit.ai/pt-br/tools/video-agent","channel_from":"ut"}`, `seo_info={"channel_level1":"Direct","channel_level2":"enter_url","channel_level3":"","channel_level4":"","branch":"master"}`.
- **Cabeçalhos observados (só nomes; REA não retém valores)**: `accept-language`, `appid`, `referer`, `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`, `store-country-code-src`, `user-agent`.
- **Resposta**: HTTP 200 observado nas duas capturas com corpo (`_bodies`, `_run2`). **Corpo: DESCONHECIDO** (o evento do REA não guarda o corpo desta resposta; o código não o lê).
- **Erros**: `try { ... } catch {}` — qualquer erro (URL, fetch) é engolido silenciosamente; sem retry, sem fila, sem fallback. Na captura 1 o pedido ficou `request-unfinished` por `capture-ended` (a captura terminou antes da resposta), sem efeito no app.
- **Relação com funcionalidades**: nenhuma lógica de produto depende da resposta; alimenta analytics de canal/aquisição (UTM/`channel_level1..4`).

## 3. Outros mecanismos de telemetria observados (requisições não-asset)
| host | requisição | observação |
|---|---|---|
| `mon-sg.capcutapi.com`, `mon.tiktokv.com` | `GET /monitor_web/settings/browser-settings`; `POST /monitor_browser/collect/batch/` (xhr, ping, fetch) e `/collect/batch/security/` | SDK Slardar (monitoramento de erros/desempenho/segurança); corpos DESCONHECIDOS |
| `mcs-normal-sg.capcutapi.com` | `POST /list` | coleta de eventos (MCS/Tea); corpo DESCONHECIDO |
| `vmweb-normal-sg.capcutapi.com` | `POST /service/2/abtest_config/` | configuração de testes A/B; resposta/regras DESCONHECIDAS |
| `www.pippit.ai` | `GET /api/v1/web-cookie-privacy/config` | configuração do banner de consentimento (condiciona o disparo do page view) |
| `www.pippit.ai` | `POST /lv/v1/user/web/user_info` | única chamada de conta/produto anônima; corpo/resposta anônimos não retidos |
| `analytics.google.com`, `stats.g.doubleclick.net` | `POST /g/collect` | Google Analytics 4 / DoubleClick (via `gtag`/`gtm`, recuperados e analisados) |
| `bat.bing.com` | `POST /actionp/0` | Bing UET |
| `f.clarity.ms`, `m.clarity.ms` | `POST /collect` | Microsoft Clarity |
- Scripts correspondentes presentes e analisados pelo REA: `gtm.js`, `gtag.js`, `clarity.js`, `bat.js`, Slardar (browser.*, plugins), `tiktok-cookie-banner`, `uifid-fingerprint-init`, `user-tracking-*.js` (kep), `771` (landing).
- **Fluxo de falha geral**: nos pedidos de monitoramento não observamos retry; códigos de erro e política de lote **DESCONHECIDOS** sem os corpos.

## 4. Limites do que se pode afirmar
- Corpos de requisição POST de monitoramento e todas as respostas não-JSON não são retidos pelo REA; seu conteúdo é DESCONHECIDO.
- Eventos além de `user_page_view` (cliques, geração, exportação) só existem após autenticação/uso; **não observados**.
