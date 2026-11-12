# Progresso — rodada 6 (2026-11-09)

**Estado: RODADA 6 PRONTA.** Suíte **114 OK / 2 SKIP / 0 FAIL (116)**; inventário **82/120 = 68,3%**; 6 commits locais; nenhum push; nenhuma chave em arquivo, commit, log, resposta ou tela.

| # | item | resultado | teste | commit |
|---|---|---|---|---|
| 1 | Legendas automáticas e corte por transcrição | Cloudflare `@cf/openai/whisper` (16 kHz mono, trechos de 25 s, tempos por palavra, SRT em Ativos); whisper.cpp local quando há modelo; 501 com motivo sem credencial | `cloudflare_transcribe` | `364ae1d` |
| 2 | LLM do agente na pilha de texto | FreeLLMAPI → Omni → NVIDIA → NovAI por padrão, timeout ≥ 60 s, Ollama opcional, erro claro quando todos falham | `router_llm` | `22df495` |
| 3 | Tela única de provedores | 7 provedores, estado com motivo/horário, pilha por tipo, envs esperadas, Testar por provedor, vídeo só com confirmação (428 sem `confirm`), só `hasKey` | `providers_panel` (rotas + Chromium) | `e09cce0` |
| 4 | Fluxo ponta a ponta com provedores falsos | composer → plano → imagem → vídeo (fila) → voz → editor → exportação, 8 etapas nomeadas, MP4 real no fim | `flow_e2e_providers` | `2d9533a` |
| 5 | Infra | deps em `.deps` fora da árvore; `recuperar_ambiente.sh` recupera e roda a suíte em 1 comando | execução real do script (log em `entrega_6/`) | `932a953` |
| 6 | Inventário reavaliado | 9 bloqueadas + 13 parciais revistas; legendas/corte → verificada; Geração por IA e Criação inteligente → parcial; 82/120 = 68,3% | `FEATURE_INVENTORY.md` | este commit |

## O que continua bloqueado (com motivo)

- **Lip-sync / vídeo em avatar**: nenhum provedor gratuito de lip-sync disponível ou observado.
- **Clonagem de voz**: voz sintética existe (melotts), clonagem não.
- **OAuth (TikTok/Meta/YouTube), publicação/agendamento e análise social**: dependem de app OAuth e de esquema não observado.
- **Login com Google/TikTok/Facebook**: provedores de identidade do Pippit; a instalação é de usuário único.
- **Compra/assinatura real**: pagamentos fora do escopo autorizado.

## Como rodar

```bash
./local_reconstruction/recuperar_ambiente.sh      # 1 comando: deps + toolchain + suíte
node local_reconstruction/app/server.mjs          # app em http://127.0.0.1:5180
```

## Entrega

Bundle do Git + `STATUS.md`, este progresso, `FEATURE_INVENTORY.md`, `PASSO_A_PASSO_CLAUDE.md` e os logs da suíte na pasta do Drive `1FKoC6t1gcXjI4zSc4vqC_M_dx_bMDZT6`.
