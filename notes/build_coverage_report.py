# Gera PIPPIT_COVERAGE_REPORT.md a partir de FEATURE_INVENTORY.md + texto de analise. Cobertura COMPROVADA = so o que tem evidencia citada.
# Estrutura (pedido do usuario, 21/10/2026): 1 identificadas, 2 totalmente investigadas, 3 parciais, 4 bloqueios, 5 desconhecidos, 6 evidencias, 7 suficiente p/ implementar, 8 nao reproduzivel com fidelidade comprovada.
import re, collections
rows = []
for l in open(r'C:\w\PiperLine\FEATURE_INVENTORY.md', encoding='utf-8'):
    if l.startswith('| ') and not l.startswith('| área') and not l.startswith('|---'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c) >= 5: rows.append(c)
st = collections.Counter(r[2] for r in rows); area = collections.Counter(r[0] for r in rows)
PEND = r'não (lid|abert|clic|investig|observ|reproduz)|por abrir|desconhecid|DESCONHECID|NÃO|pendente|não capturad|Falta'
pend = [r for r in rows if re.search(PEND, r[4]) and r[2] != 'bloqueada']
blq = [r for r in rows if r[2] == 'bloqueada']
conc = [r for r in rows if r[2] in ('investigada', 'implementada', 'verificada (teste automatizado)') and r not in pend]
o = []
o.append('# Relatório consolidado de cobertura do Pippit (21/10/2026, após a geração real Auto Route)\n')
o.append('Fonte única do inventário: `FEATURE_INVENTORY.md` (gerado por `notes/build_inventory.py`). Este relatório NÃO declara equivalência nem cobertura integral: só o que tem evidência citada. O inventário é um piso, não o limite da plataforma. REA `verify_reconstruction` NÃO produziu aprovação: ver "Verificação formal" no fim deste relatório.\n')
o.append('## 1. Todas as funcionalidades identificadas\n')
o.append(f'**{len(rows)} funcionalidades** (58 no início de 21/10; nenhuma removida). Por estado: ' + ', '.join(f'{k} {v}' for k, v in st.most_common()) + '. Por área: ' + ', '.join(f'{k} {v}' for k, v in area.most_common()) + '. A lista completa, com evidência e observação por linha, está em `FEATURE_INVENTORY.md`.\n')
o.append('Módulos achados só no código (sem tela observada): TitleBarAgentConnect, TitleBarExportTask, global-age-gate, us-ban-notify, pwa-installer, dev-panel, help-center, argus-builder-strategy; domínios de API sem alcance a partir das páginas: inspiration, remix_tools, ad_maker, workspace, template (`PIPPIT_API_CATALOG.md`, 645 endpoints / 250 bundles, 0 falhas de parse).\n')
o.append('## 2. Funcionalidades completamente investigadas (no nível de interface/contrato observado)\n')
o.append(f'Critério: estado investigada/implementada/verificada **e** sem pendência declarada na observação. {len(conc)} linhas. NÃO significa comportamento de serviço comprovado além do que a evidência cita.\n')
for r in conc: o.append(f'- **{r[0]}** — {r[1][:120]}')
o.append('\n## 3. Funcionalidades parcialmente investigadas\n')
o.append(f'{len(pend)} linhas com pendência declarada (o que falta está no campo observação):\n')
for r in pend: o.append(f'- **{r[0]}** — {r[1][:110]} — {r[4][:240]}')
o.append('\n## 4. Bloqueios por plano ou permissão\n')
o.append('Plano Free da conta de teste; nenhum paywall foi contornado.\n')
for r in blq: o.append(f'- **{r[0]}** — {r[1][:100]} — {r[4][:220]}')
o.append('- **Paywall por modelo (client-side, antes de qualquer requisição)**: GPT Image 2 (6 créditos), Seedream 5.0 Pro (10), Seedance 2.0 Mini Trial (28 por 4 s) → modal "Go Starter now for unlimited use…" (`captures/audit/rea`, `PIPPIT_CAPTURE_STATUS.md`). **Exceção observada: Auto Route** (resolve para `MiniMax-H3-trial`, 12 créditos `LimitFree`, `paywall:null` em `batch_check_withhold_deduct`) executou normalmente.')
o.append('- Compras, assinaturas, publicação/OAuth, exclusões e envio de conteúdo pessoal: fora do escopo autorizado.\n')
o.append('## 5. Comportamentos ainda desconhecidos\n')
o.append('- **SSE ao vivo**: blocos incrementais de `agent/subscribe_run` (e de `subscribe_thread`/`sse_asset` durante a geração), `enable_chunk_stream`, `stream_cursor`. Lidos só por replay de estado (ver §6); `subscribe_run` nunca lido.\n'
         '- **Estados de run**: observados 1 (submetido) e 4 (falhou); concluído/cancelado/fila desconhecidos. `get_run` nunca visto num run bem-sucedido; `cancel_run` não observado.\n'
         '- **Ligação run ↔ `generation_task_list`**: as respostas lidas não mostraram a tarefa do run (campos `id, task_type, status, result, meta, error_code, error_msg` conhecidos, mas sem correspondência comprovada). Códigos de erro além de 99999 e regras de moderação/fila (`get_user_queue_info`).\n'
         '- **Créditos**: débito no envio observado (125→113); estorno em falha por validação (sem débito), expiração, `vip_credit`/`purchase_credit`, `consume_types` além de `LimitFree`, preços de outros modelos fora do plano Free.\n'
         '- **Modelo/roteamento**: como o Auto Route escolhe o modelo (observado só `MiniMax-H3-trial` para vídeo curto) e como o agente de "Agent mode" planeja workflows.\n'
         '- Corpos/respostas de quase todos os demais endpoints dos 645 (apenas 53 leituras + os do protocolo de geração foram observados); conteúdo servido pelo servidor (Hook, Visual style, Ad formats, templates, skills da loja, notificações).\n'
         '- Condição de exibição de TitleBarAgentConnect/ExportTask, age-gate, us-ban-notify e domínios sem alcance (inspiration, remix_tools, ad_maker); opções internas de Settings (não clicadas); fluxos "Create skill".\n')
o.append('## 6. Evidências que sustentam as conclusões\n')
o.append('| Conclusão | Evidência |\n|---|---|\n'
'| Interface e opções de cada tela | `captures/auth/cdp/t_*` (controlador v2, `report.json`), `captures/audit/rea/*` (cenários REA, ids `ev_…` no inventário e em `PIPPIT_CAPTURE_STATUS.md`) |\n'
'| Código do app (250 scripts) e catálogo de 645 endpoints / 333 esquemas de corpo / alcance página→endpoint | `scripts/auth_bundles/` (sha256 em `notes/auth_bundles_log.tsv`), `evidence_cli/auth_bundles/INDEX.md` (REA), `PIPPIT_API_CATALOG.md`, `notes/auth_api_calls.json`, `notes/auth_sdk_schemas.json`, `notes/auth_module_graph.json` |\n'
'| 53 leituras observadas em 8 páginas (método, caminho, status) | `captures/audit/rea/net_home.json` (ev_f0dca9be…ea44), `notes/observed_calls.json`, `notes/observed_contracts.json` |\n'
'| Protocolo de geração: `batch_check_withhold_deduct` → `create_creative_project` → `submit_run` → SSE → polling (`user_credit`, `generation_task_list`) → resultado | HARs `captures/auth/autoroute/send2.har` (sha256 92d8671a…), `send3.har` (35c6843f…), `erro_canvas.har`, `ok_canvas.har` (322b420f…); REA `inspect-web-network-capture` ev_68227c58…, ev_a5e0ff66…, ev_e3cb04c6…; detalhes em `PIPPIT_API_CATALOG.md` (seções "Protocolo de geração direta observado", "Contratos observados", "Conteúdo dos fluxos SSE") |\n'
'| `get_run`/`get_thread`: estado 4 e `fail_reason.detail` ("prompt ≥ 15 caracteres") | `erro_canvas.har` (entradas get_run/get_thread), `sse_erro_sse.json` |\n'
'| Débito 125→113 no envio, `LimitFree`, 12 créditos | `send3.har` (`user_credit` antes/depois do `submit_run`), UI (screenshots `captures/auth/cdp/t_autoroute_*`) |\n'
'| Estado do nó: `generation.state.status` failed/succeeded, canvas como asset JSON com patches | `sse_erro_sse.json`, `sse_ok_sse.json` (replay via CDP `Network.streamResourceContent`; **não** é o fluxo ao vivo) |\n'
'| Resultado de vídeo (768×1344, 4467 ms, mp4) | `ok_canvas.har` (`mget_asset_info`, `list_project_file`, `asset/query`) |\n'
'| Paywall do plano Free nos modelos pagos | `captures/audit/rea` (cenários de envio bloqueados no cliente, 0 créditos), `PIPPIT_CAPTURE_STATUS.md` |\n'
'| Reconstrução local funciona e é coerente com o observado | testes `local_reconstruction/test/*.test.mjs` (e2e, ui, parity 26/26 rótulos…) — autoridade menor que `verify_reconstruction` |\n'
'| Integridade dos artefatos | `MANIFEST_SHA256.csv` (`notes/build_manifest.py`) |\n')
o.append('Ferramenta: o `capture_browser_scenario` do REA via MCP estoura o orçamento de eventos (~1900) no carregamento do app; por isso a rede do protocolo foi registrada pelo controlador (`notes/cdp_ui.mjs`, recurso `netlog` → HAR 1.2 sem cabeçalhos/cookies, parâmetros de assinatura removidos) e analisada pelo REA CLI. Dados dos HARs contêm ids da conta de teste (locais).\n')
o.append('## 7. O que já temos de suficiente para implementar\n')
o.append('Com evidência observada (não presumida):\n'
'- **Shell e telas já implementadas/verificadas** (home, sidebar, histórico, Marketing, Canvas, Avatares, Ativos, Editor com export, Skills, Notificações, Planos/créditos, Estúdio 3D etc. — ver inventário, estados IMP/VER).\n'
'- **Composer de geração**: modos Agent/Video/Image/Audio, seletor de modelos, custos exibidos, duração/resolução/proporção, Auto Route com padrão 9:16·4 s·768P e custo "12 (72 riscado)".\n'
'- **Contrato HTTP local de geração direta** (para um servidor local que simule o serviço): envelope `{ret, errmsg, log_id/svr_time, data}`; `batch_check_withhold_deduct` (corpo e resposta, `credits_amount`, `consume_types`, `paywall`); `create_creative_project`; `submit_run` (corpo completo: `agent_name`, `tool_name`, `param{prompt,ratio,resolution,model,duration_sec,…}`, `run_extra.babi_param/client_extra`, `concurrency_control`; resposta `run{state:1,…}`); `get_run`/`get_thread` (`scopes`); `generation_task_list`; `user_credit`; `asset/*` (namespace, batch_patch, mget_asset_info, list_project_file, query); formato de patches `AssetJsonUpdate` do canvas.\n'
'- **Regras observadas**: prompt de vídeo ≥ 15 caracteres (falha `code 99999` com `detail`), débito no envio, sem débito em falha de validação, estados de nó `failed`/`succeeded`, canvas reaberto sem `directGenerationIntent` não reenvia.\n'
'- **Paywall por plano**: comportamento client-side nos modelos pagos e `paywall` do servidor `null` quando o item é `LimitFree` (suficiente para simular planos locais).\n'
'- Catálogo de 645 endpoints com chaves de corpo estáticas como andaime para mocks adicionais (marcados como "estático", não validado em execução).\n')
o.append('## 8. O que ainda não pode ser reproduzido com fidelidade comprovada\n')
o.append('- A **geração em si** (saída do modelo, tempos/filas, progresso) — só é possível simular localmente; a duração observada foi ~84 s para 4 s de vídeo.\n'
'- O **fluxo SSE ao vivo** de `subscribe_run`/`subscribe_thread`/`sse_asset` durante a execução (blocos incrementais, cursor, chunking) e `cancel_run`.\n'
'- **Todos os estados de run** além de 1 e 4, erros além de 99999 e a correspondência run↔task em `generation_task_list`.\n'
'- **Fluxos de planos pagos** (Seedance 2.5, GPT Image 2, Seedream sem paywall, vídeo/voz em avatar, ferramentas de IA do gerador, exportações/IA do editor), **publicação e OAuth** (TikTok/Facebook/Instagram), compras e assinaturas.\n'
'- **Conteúdo do servidor** (listas de Hook/Visual style/Ad formats, templates, skills da loja, notificações, galeria) e o **planejamento do Agent mode**.\n'
'- **Equivalência formal**: não comprovada. A comparação passiva REA da Home (original × local) deu `changed` (DOM, acessibilidade, storage) e `unknown` nas demais dimensões; `verify_reconstruction` não pôde ser alimentado com a evidência (ver "Verificação formal").\n'
'- Qualquer item da §3 e §5 além do que as evidências da §6 sustentam.\n')
o.append('## Cobertura real para autorizar a retomada da implementação\n')
o.append(f'- **Comprovada**: {len(conc)} de {len(rows)} funcionalidades sem pendência declarada; {len(pend)} parciais; {len(blq)} bloqueadas por plano/permissão. Contrato de rede da geração direta (1 modelo: Auto Route/MiniMax-H3-trial) capturado de ponta a ponta, com exceção do SSE ao vivo.\n'
'- **Sugestão** (a decidir pelo usuário): retomar a implementação funcional na ordem: (1) servidor local de geração direta fiel ao contrato observado (check → projeto → submit_run → estados → assets/canvas patches → débito); (2) canvas como asset JSON com patches; (3) validações (≥15 caracteres) e erros com `fail_reason`; (4) planos/paywall; (5) pendências da §3 sem custo. Não afirmar equivalência enquanto a verificação formal estiver pendente.\n')
o.append('## Verificação formal (REA, 21/10/2026)\n')
o.append('- Capturas passivas da Home: original (aba logada do Pippit, CDP 9222) e reconstrução local (`http://127.0.0.1:5180/#/home`, Chrome próprio CDP 9333, perfil `C:\\w\\verify_chrome`), ambas 1440×900, via `rea inspect-web-page` (evidências ev_bbe0a4d5…, ev_952ea874…; `captures/verify/inspect_*_home.json`).\n'
'- `rea compare-web-captures` (evidência ev_f2a0a9a2…cc9d9; `captures/verify/compare_home.json`): **overall_status = changed**; DOM changed (2), acessibilidade changed (1), storage changed (1); scripts, resources, rede, metadata e WebMCP = **unknown** (capturas com cobertura limitada ou filtrada por política).\n'
'- `verify_reconstruction` (MCP) recusou a evidência da CLI ("Missing comparison Evidence": MCP e CLI não compartilham o repositório de evidências); alimentar `compare_web_captures` do MCP exigiria colar inline ~300 KB (DOM 206 KB + acessibilidade 111 KB) do original, não feito. Não existe comando `verify-reconstruction` na CLI. **Resultado: nenhuma alegação verificada; o resultado observável é "diferente".**\n'
'- **Alegação estreita (interação, 21/10)**: "abrir o menu de modo de criação na Home não navega". Cenários REA gravados nos dois lados (original `ev_ca4707f4…`, local `ev_fe944f7e…`, 3 passos alinhados por step_id, URL normalizada por regras literais) e comparados com `compare_web_captures` (`ev_04b0abf9…`): **overall_status = unknown** — (1) a seção `events` ficou `missing` nos dois lados (mesmo pedindo `page-errors`), (2) `capture_context_mismatch` inevitável porque a origem do cenário difere (`https://www.pippit.ai` × `http://127.0.0.1:5180`). Na tentativa de selecionar "Video" no menu do original o seletor foi ambíguo (2 itens contêm "Video") e a captura falhou; não repetida.\n'
'- **`verify_reconstruction` não aceita comparações web**: com `ev_04b0abf9…` devolveu "Comparison Evidence identity or authority disagrees" para `behavioral/interaction` e `structural-artifact/overall` (esses tipos exigem comparações de processo/artefato/função, não `rea.web-capture-diff`). **Conclusão: para esta reconstrução web o REA só oferece `compare_web_captures` (resultado `changed`/`unknown`), nunca uma aprovação formal; qualquer afirmação de equivalência continua proibida.**\n'
'- Esperado: a reconstrução é funcional/estrutural, não um clone DOM; a Home local omite a galeria da comunidade e usa componentes próprios. Para uma verificação formal útil faltam alegações comportamentais estreitas (ex.: sequência de requisições da geração direta) com cenários REA gravados dos dois lados e normalização declarada.\n')
open(r'C:\w\PiperLine\PIPPIT_COVERAGE_REPORT.md', 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print(len(rows), 'linhas;', len(pend), 'parciais;', len(blq), 'bloqueadas;', len(conc), 'sem pendência')
