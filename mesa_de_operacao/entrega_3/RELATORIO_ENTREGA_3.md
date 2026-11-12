# RELATÓRIO — ENTREGA 3

Data: 2026-11-10 13:25 UTC · Branch: `arena/a14d8a49-pippet-clone` · **sem push**
Base da entrega: `1443745` · HEAD do bundle: commit documental final (conferir com `git bundle list-heads mesa_de_operacao/entrega_3/progresso_2.bundle`); último commit de código: `3b747f4`; relatório/estado: `6ed4203` + o commit deste ajuste

## 1. Chromium (parte 1)

`mesa_de_operacao/ambiente_chromium.md` **não existe neste checkout** (nenhum arquivo com esse nome). Usei o método equivalente já registrado em `ARENA_STATUS.md:14` / `README.md:202`, que é o mesmo descrito na ordem:

1. `@sparticuz/chromium@153.0.0` do npm registry em `/tmp/piperline-tools`.
2. `bin/chromium.br` descomprimido (brotli) para `/tmp/chromium` → **Chromium 153.0.8010.0**.
3. `bin/al2023.tar.br` descomprimido e extraído para `/tmp/al2023/lib` (`libnspr4`, `libnss3`, `libnssutil3`, `libsmime3`…).
4. `ldd /tmp/chromium` com `LD_LIBRARY_PATH=/tmp/al2023/lib` → **0 bibliotecas faltando**; não houve necessidade de `apt-get download`/`dpkg -x`.
5. `playwright@1.65.0` instalado com `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` em `local_reconstruction/node_modules` (`--no-save --no-package-lock`, sem tocar em manifesto/lock).
6. FFmpeg/ffprobe recriados em `/tmp/ffbin` (wheel `imageio-ffmpeg` → ffmpeg 9.0.2; `ffprobe-static`) e apontados por `PIPPIT_FFMPEG`/`PIPPIT_FFPROBE`.

Ambiente final das execuções:

```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium
LD_LIBRARY_PATH=/tmp/al2023/lib
PIPPIT_FFMPEG=/tmp/ffbin/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2
PIPPIT_FFPROBE=/tmp/ffbin/node_modules/ffprobe-static/bin/linux/x64/ffprobe
PIPPIT_LLM=off
```

### Tentativas documentadas (3 + confirmação)

| # | O que foi feito | Resultado |
|---|---|---|
| 1 | Chromium/libs/Playwright instalados e suíte completa | 81 aprovados, 2 skips, **1 falha** (`canvas_existing_project_ui`, timeout 30s) — UI **executada** |
| 2 | Repetição integral sem mudanças | 81 / 2 / **1 falha** (mesmo teste) → não é sorte de execução |
| 3 | Diagnóstico: o teste passa sozinho e em subconjuntos; a espera usava polling padrão (RAF) sobre o mesmo origin, sufocando o pool de conexões. Troca para `polling:500`, teto 60s, e endurecimento das esperas pós-reabertura | **84 aprovados, 2 skips, 0 falhas (86)** |
| 4 (confirmação) | Suíte completa novamente após os 2 itens novos | **84 aprovados, 2 skips, 0 falhas (86)** |

**Testes de UI executados: SIM.** Nenhum teste de UI ficou em skip — os 40 que antes pulavam por falta de Playwright agora rodam (`ui` 25/25 no filtro, `publishing`, `talkingphoto_ui`, `canvas_*`, `node_generation_*_ui`, `fidelity*`, etc.).

**Skips restantes (2, não são UI):** `pageview` (`captures/scenario_video-agent_bodies.json` ausente) e `parity` (`captures/auth/cdp/oauth_redirect/2_pagina_0.txt` e `captures/auth/cdp/editor_right_panel/5_1_Básico.txt` ausentes). São evidências fora do checkout, não falhas de ambiente.

### Correções de teste feitas nesta entrega (sem afrouxar asserção)

- `canvas_existing_project_ui`: polling 500ms / 60s nas esperas de geração e de reabertura (a asserção de título e a de “reabrir não reenvia geração” continuam iguais). Antes: falhava 3 de 4 execuções completas.
- `talkingphoto_ui`: a falha de duração passou a imprimir o valor medido (asserção 2.9–3.1 s mantida). Falhou 1 vez sob carga; passou isolada e nas execuções finais.

## 2. Suíte final

`mesa_de_operacao/entrega_3/suite_final.txt` (saída completa): **84 aprovados, 2 skips explícitos, 0 falhas (86)**.

## 3. Itens de menor custo implementados (2, um por commit)

| Linha da TABELA | Item | Commit | Teste | Evidência |
|---|---|---|---|---|
| 87 | Marketing: Hook — itens por categoria | `3e2a7b2` | `marketing_hooks_ui` (5 categorias + All, 40 ganchos 9/9/7/7/8, busca, Select fecha e cria chip, chip removível) | Drive `PiperLine_marketing_hooks_stage_report.md` + REA `ev_7b82c3d1…6e71` |
| 47 | Canvas: biblioteca de estilos, compartilhar tela, minimapa, atalhos, zoom | `5f341c5` | `canvas_toolbar_ui` (94 estilos, escolha persistida no projeto, aviso `UNOBSERVED` do efeito na geração, minimapa abrir/fechar, menu de zoom 50%/100%, botão Compartilhar tela) | Drive `PiperLine_canvas_visual_stage_report.md` + REA `ev_ae60525e…3513` |

Estados registrados na tabela: 87 permanece `parcial (teste UI)` (cartões/prévias/descrições reais não estão no checkout); 47 sobe de `investigada` para `parcial (teste UI)` (atalhos de teclado e contrato real de compartilhar tela seguem não observados). Nenhuma linha foi promovida a “implementada”/“verificada”.

## 4. Hashes

```
3b747f4 Harden two UI waits for the Chromium suite
5f341c5 Verify canvas toolbar tools in the UI
3e2a7b2 Verify marketing hooks categories in the UI
4f8923a Stabilize canvas reopen poll under full-suite load
9358f2b Document not-ready inventory lines and progress
4cbd44c Test canvas chat history route
f634421 Test observed 15-character video prompt validation
8c02cd3 Add observed help-center route and panel
a733f41 Add provider smoke script with fake-server test
1443745 (base) Document final B/C status and coverage
```

## 5. Arquivos entregues em `mesa_de_operacao/entrega_3/`

- `progresso_2.bundle` — `git bundle create … 1443745..HEAD`, verificado com `git bundle verify` (requer o ref base `1443745…`).
- `log.txt` — `git log --oneline -12` + `git status --short`.
- `suite_final.txt` — saída completa da suíte (84/2/0).
- `estado_progresso_2.zip` — 16 arquivos alterados desde `1443745`, 124 KB; **sem** `captures/`, `google_drive/`, `.git`, `node_modules`, ZIP/bundle, chaves e **sem** `test/ui-shots/` (PNGs regravados pela própria suíte, que também ficaram fora dos commits).
- `RELATORIO_ENTREGA_3.md` — este relatório.

## 6. O que não foi feito

- **Push**: proibido; tudo em commits locais + bundle.
- **Chaves/créditos**: nenhuma chave real, nenhuma chamada a NVIDIA/Gemini/Ollama/Pippit.
- **`mesa_de_operacao/ambiente_chromium.md`**: não existia; o método foi reconstruído a partir do registro em `ARENA_STATUS.md`/`README.md` (equivalente ao pedido).
- **Screenshots `test/ui-shots/*.png`**: regravados pela suíte, deixados fora do commit e do ZIP de propósito (artefato, não código).
- **Linhas 47/87**: continuam `parcial` porque o conteúdo do serviço (cartões, prévias, descrições, contrato de compartilhar) não está no checkout — não foi inventado.
