# Progresso — voz local por padrão + linhas 132, 88 e 47 (2026-11-09)

## 1) Voz local (SAPI) como padrão, provedor como opção

| Onde | Antes | Agora |
| --- | --- | --- |
| Nó de Áudio do Canvas | só com `settings.provider = local-ffmpeg`; sem isso, 409 | **SAPI por padrão** (sem configurar nada); provedor do usuário é opção (`voiceSource:"cloud"`) |
| Foto falante (prévia local) | SAPI só quando não havia clipe enviado | mesma regra centralizada: SAPI padrão, provedor como opção/fallback |
| Modo Áudio do composer | não gerava ("nada será gerado por este seletor") | gera WAV com SAPI (0 crédito), cria o nó de Áudio no Canvas |
| Narração do agente (`synth`) | provedor do usuário tinha prioridade | **SAPI primeiro**; provedor só quando não há SAPI |

Regra única em `app/lib/voice.mjs`: `resolveVoiceEngine({ requested, sapiAvailable, cloudConfigured })` → `sapi` | `cloud` | `null`.
Pedir uma voz inexistente **não** cai para a outra em silêncio; sem SAPI e sem provedor, a resposta é bloqueio explícito (nada gerado, nada cobrado).
`GET /api/tts-voices` passou a devolver `sapiAvailable`, `defaultEngine`, `engines[]` e `reason`.

## 2) Linhas escolhidas (menor custo com evidência no Drive)

Critério: entre as linhas com **evidência no Drive** (47, 65, 74, 87, 88, 90, 132), as que ainda tinham trabalho real de código e teste — as demais já estavam entregues e só restava `UNOBSERVED`.

| linha | custo | entrega | teste | commit |
| --- | --- | --- | --- | --- |
| **132** modo Áudio do composer | médio | `GET /api/composer/audio-mode`; `POST /api/local-runs {mode:"audio"}` gera com SAPI e cria nó no Canvas | `composer_audio_mode`, `audio_mode_ui` (atualizado) | `cde77d7` |
| **88** Expand/Select dos formatos | pequeno | `GET /api/marketing/ad-formats`: 8 nomes, Expand/Collapse, Select, descrições/categorias `UNOBSERVED` (0/8), frase capturada exibida **sem dono** | `marketing_ad_formats_route`, `marketing_ad_formats_ui` (atualizado) | `91aa266` |
| **47** atalhos e Compartilhar tela | pequeno | `GET /api/canvas/shortcuts`: 20 atalhos classificados (**11 locais**, **9 não implementados**); diálogo ⌨ marca cada linha; Compartilhar tela local com contrato `UNOBSERVED` | `canvas_shortcuts_route`, `canvas_shortcuts_ui` (prova que Ctrl + altera o zoom) | `4ef6b59` |

As três continuam **`parcial`**: o que falta nelas é captura/observação humana (presets de áudio, descrições reais por cartão, atalhos do Pippit, contrato do compartilhamento de tela) — nada foi inventado.

## 3) Intermitência de `canvas_existing_project_ui` — causa encontrada e corrigida

- Sintoma: espera de 60 s pelo evento `pippit:title-saved` (~1 em 4 execuções), com `#ttl` ainda em “Canvas original”.
- Instrumentação: em uma execução falha, o `fill` **não** gerou nenhum evento `input` no documento (0 capturados) e o `change` chegou num elemento novo — ou seja, um re-render completo trocou o `<input>` entre os dois passos.
- Origem: o fim da geração do nó (`#gg`) chama `pageProject()`, que reconstrói `#main` inteiro; se isso acontece durante a edição, o texto digitado é perdido.
- Correção: (a) `pageProject` **não** redesenha a página enquanto o título está em edição (só atualiza nós/arestas); (b) o estado de edição passou a ser **por projeto** (`TITLE_EDIT`), não do elemento, sobrevivendo a re-renders.
- Medição: **3 falhas em 8** execuções antes → **0 em 14** depois (14/14 isoladas) e **0 em 2 suítes completas**. Commit `3ea9b2d`.

## 4) Evidência da rodada

- Suíte completa: **`104 passaram, 2 skip explícito, 0 falharam (de 106)`**, duas vezes seguidas.
- Skips legítimos: `pageview` e `parity` (evidência fora do checkout).
- Nenhuma chave em arquivo/log; provedores falsos em 127.0.0.1 nos testes de voz/Omni.

## 5) Inventário e percentual

- Fórmula mantida: (linhas `implementada*` + `verificada*`) / linhas reproduzíveis.
- Resultado recalculado: **81 / 120 = 67,5%**.
- O resumo anterior dizia 77/119 = 64,7%: era um número **desatualizado** em relação às próprias linhas da tabela (120 reproduzíveis hoje). Esta rodada **não** move o numerador — 47, 88 e 132 seguem `parcial`.

## 6) PENDENTE / UNOBSERVED

- Vídeo e voz do **Omni** seguem PENDING até o usuário informar o combo; a voz local SAPI não depende disso.
- Linhas 47/88/132: itens `UNOBSERVED` listados acima continuam sem captura; nada foi simulado.
