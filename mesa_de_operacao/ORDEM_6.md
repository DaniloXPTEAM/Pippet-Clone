# ORDEM 6 — relatório final

## Parte 1 — restauração cumulativa
1. O ZIP exato `Pippet-Clone-A-correcao-visual.zip` não foi localizado; extraído/comparado o snapshot cumulativo `PiperLine_export_settings_674da6f.zip`, ignorando `.git`, `captures/` e `google_drive/`.
   Diferenças foram conciliadas sem tratar o snapshot como histórico Git autêntico; nenhum ZIP, bundle, chave, `captures/` ou `google_drive/` entrou nos commits.
2. App/src: `a106a39` (`Restore cumulative app and router implementation`); testes/evidências: `f616916` (`Restore cumulative regression tests and evidence`).
   Docs/inventário: `164033e` (`Restore cumulative status and feature inventory`); em cada commit foram verificados os paths staged e rodado o teste integral.
3. Critério Parte 1 atendido: 68 aprovados, 2 skips explícitos, zero falhas (70 testes).
   `pageview` e `parity` são skips apenas por capturas ausentes; Chromium e FFmpeg usados nos testes foram obtidos fora do repositório.
4. Bundle da Parte 1: `ORDEM_6_part1.bundle`; log: `ORDEM_6_part1_git_log.txt`, ambos nesta pasta.
   Bundle contém a branch até o commit `164033e`; não foi feito push.

## Parte 2 — B e C
B. Nós Vídeo/Imagem/Áudio/Texto encaminham `Gerar` ao roteador gratuito; quatro testes de UI e teste de rota usam provedor falso; bloqueio sem provedor não cobra nem cria resultado fictício.
   Commit `017e106`; inventário `implementada (provedor configurável)`. Geração real depende de provedor e não foi testada.

C1. Marketing > Ad formats: busca, as cinco categorias requeridas, Expand/Collapse e Select no chip; conteúdo específico continua `UNOBSERVED`.
   Commit `96f2c12`; UI test `marketing_ad_formats_ui.test.mjs`; inventário parcial porque descrições completas e mapeamento por categoria não foram evidenciados.
C2. Marketing > Visual style: busca e catálogo de 20 estilos em cinco categorias, seleção exercitada.
   Commit `29e0906`; UI test `marketing_visual_style_ui.test.mjs`; previews/descrições não foram inventados.
C3. Canvas existente aceita a rota query-compatible, mostra Return to previous page / título editável / Saved e não reenvia geração ao reabrir.
   Commit `06c6133`; UI test `canvas_existing_project_ui.test.mjs` usa geração fake uma vez e confirma uma chamada.
C4. Conta > More lista CLI, Feature wishlist e Customer service; Settings > Language lista os 18 idiomas observados.
   Commit `f780905`; UI test `account_more_language_ui.test.mjs`; destinos externos permanecem `UNOBSERVED`.
C5. Barra de título oferece painéis Agent connection e Export tasks, com placeholders `UNOBSERVED` e sem chamadas externas.
   Commit `313e235`; UI test `titlebar_panels_ui.test.mjs`; conteúdo/estado real dos painéis não foi observado.

Suíte integral final (após C5): **78 aprovados, 2 skips explícitos, 0 falhas (80 testes)**.
Skips: `pageview` e `parity`, por artefatos de captura ausentes; sem push.

## Itens da ORDEM 6 ainda não prontos
| Linha | Estado | Evidência? | Lacuna restante |
|---|---|---:|---|
| Marketing > Ad formats — conteúdo individual | Parcial | Sim, telas/lista; não para descrições/mapeamento | Descrições completas, previews e associação cartão→categoria continuam UNOBSERVED. |
| Conta > More — destinos | Parcial | Sim, rótulos | Conteúdo/ações reais dos destinos CLI, Feature wishlist e Customer service não capturados. |
| Barra de título — export-task e agent-connect | Parcial | Sim, metadados estáticos dos componentes | Conteúdo, estados e comportamento dos painéis originais nunca observados; placeholders locais não os alegam. |
| Geração real dos nós | Provedor configurável; execução real pendente | Testes fake: sim; provedor real: não | Configurar e testar um provedor gratuito real; operação de vídeo retorna metadados do job, não mídia final. |
