# ENTREGA — rodada r20 (2026-11-12)

Comando do usuário (resumo): "Tudo gratuito e sem bloqueio… não é para ser bloqueado… igual ao Pippit… preço você não deve inserir no meu produto… somente em outro que eu desenvolvi no futuro." O paywall de Áudio exigido no adendo r19 estava **errado** e foi desfeito.

## Os 5 itens (na ordem) + o que mais foi feito

1. **Paywall do Áudio desfeito (`d7f7a44`)** — envio em Áudio GERA por padrão (provedor gratuito embutido; fallback `PIPPIT_TTS`); sem provedor → motivo + botão de configuração, **nunca** a tela de planos. Sem paywall por plano/modelo: vídeo/imagem em canvas sem limite (rótulo "Ilimitado"); modelo nomeado sem engine local = motivo claro + saída; sem diálogos "recurso Starter"/"Assine o Starter agora" (avatar); `getPlanAccess`/`canUseVideoAvatar` sem limites. Testes: canvas_avatar, directgen, directgen_ui, e2e (seção avatar), composer_audio_mode, subscribe_modal_ui (reescrito).
2. **Modal de planos sem cobrança (`1896d36`)** — sem R$ e sem "Subscribe": "No momento gratuitamente — em breve" + botões desabilitados; "Plano atual — acesso a tudo"; créditos só informativos ("nada é debitado"); link "Regras de uso e cobrança" removido; estrutura de pagamento fica no código, DESLIGADA (fora da UI; gateway 501; `POST /api/billing/checkout` devolve `charged:false` e não troca plano). Testes: `plans_modal_ui` (renomeado de subscribe_modal_ui), credits, plans, billing_structure, billing_flow, pricing_faq_ui.
3. **Preços/paywall só no adendo (`994cd50`)** — `mesa_de_operacao/entrega_19/ADENDO_R19.md` marcado com banner de correção r20 + 4 marcações "observado no original, não reproduzido por decisão do usuário"; FEATURE_INVENTORY sem os valores de preço (só referência ao adendo).
4. **Varredura + teste de prova (`8663fa4`)** — `mesa_de_operacao/entrega_20/SEM_PAYWALL_R20.md`: Upgrade = 0; 409 por plano = 0; "Subscribe/Assine" só em 3 comentários-evidência; `is_allowed` = espelho que nunca bloqueia; estrutura `LimitFree`/checkout desligada; **gate real achado e inativado**: `checkModelAccess` (workflow.mjs — upsell "Assinar agora" por modelo). Teste de prova `sem_paywall_ui.test.mjs`: usuário novo gera vídeo (local-ffmpeg), imagem (provedor falso HTTP 1×1) e áudio (`PIPPIT_TTS=fake`) sem ver tela de planos; gatilhos antigos (modelo nomeado, avatar) mostram motivo, nunca planos.
5. **Os 2 testes fora da lista ALL (`fc316e5`)** — eram `e2e_live` e `llm_live`: **opcionais e ao vivo** (usam o Ollama REAL; `e2e_live` ainda dispara uma fase B em segundo processo e é lento). **Decisão: INCLUIR no run-all com skip explícito** — nada sai por remoção e bloqueio vira pendência com caminho; sem Ollama os dois imprimem `SKIP <nome>: <motivo>` e saem com exit 0 (`llm_live` nos dois caminhos; `e2e_live` com sonda HTTP de 3 s no 127.0.0.1:11434 antes da fase A). Com Ollama real, `e2e_live` pode estourar os 290 s de paciência do run-all (aceito; roda sozinho via `node test/e2e_live.test.mjs`). Atualizado também o `test/run-all.mjs` para 151 entradas.
   Ajuste de testes da semântica r20 (`c810bab`): 5 arquivos (plans_modal_ui, pricing_faq_ui, billing_structure, ui, sem_paywall_ui) — asserts antigos de preço/assinatura/limite trocados pelos novos comportamentos (decisão do usuário).
6. **Esta entrega** — docs + bundle + zips + SHA256SUMS.

## Placar da suíte (r20)
`node local_reconstruction/test/run-all.mjs` (Linux/sandbox): **147 passaram / 4 skip explícito / 0 falharam (de 151)**.
- Skips: `pageview`, `parity` (evidência local não incluída no checkout); `e2e_live`, `llm_live` (Ollama real indisponível — motivo impresso por cada teste).
- Windows: baseline r19 = 146/2/0 de 148 (validado por captura — `VALIDACAO_WINDOWS_R19.md`). Windows r20 = **PENDÊNCIA com caminho** (rodar a suíte no Windows).
- Réguas inalteradas: 113/122 = 92,6%; 152/423 = 35,9%.

## Observações de integridade
- Preços e paywall do Pippit ficam **só** em `entrega_19/ADENDO_R19.md`, marcados como "não reproduzido por decisão do usuário".
- `PIPPIT_TTS=fake` = modo de teste que grava um WAV PCM curto para o pipeline de áudio não quebrar sem engine de voz (como `NOVAI_ALLOW_INSECURE_ASSETS`); rótulos inalterados.
- Cadeia: 76 commits (bundle `entrega_19_bundle_corrigido.git`) + 8 desta rodada = **84 commits**; bundle desta entrega prova `8e07b84` como ancestral.
