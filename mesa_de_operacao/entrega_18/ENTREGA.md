# ENTREGA — rodada 18 (ordem substitutiva)

| # | Item da ordem | Onde está | Como conferir |
|---|---|---|---|
| 1 | Revogar "fora do escopo"/"decidido"; bloqueio = pendência com CAMINHO; contagens x/122 e 423 mantidas | `BLOQUEIOS_R18.md` §0 (registro da revogação + caminhos das 9 linhas); `FEATURE_INVENTORY.md` (réguas 113/122 e 152/423, sem régua reduzida) | `git show 3c20390` reverte `5559abb`; grep não acha "decidido"/"fora do escopo" |
| 2a | OAuth TikTok/Facebook/Instagram/YouTube (PKCE/state, callback 127.0.0.1, tokens cifrados, fila, "gerar vídeo → publicar" vs servidor falso) | `src/oauth_social.mjs`, `app/server.mjs`, `.env.example` | `node test/oauth_social.test.mjs` |
| 2b | Marketplace/loja: tela, conexão, importação, envio de vídeo, adaptador plugável | `src/marketplace.mjs`, tela `#/integrations` | `node test/marketplace.test.mjs` |
| 2c | Widget de ajuda local (botão/painel/conversa, respostas locais, sem token de terceiro) | `app/lib/help_widget.mjs`, `app/public/app.js` | `node test/help_widget_ui.test.mjs` |
| 2d | Idade, aviso US, PWA (manifest+sw+ícones), painel dev — por configuração | `app/lib/gates.mjs`, rotas `/api/gates`, `/manifest.webmanifest`, `/sw.js`, `/api/dev-panel` | `node test/gates_pwa.test.mjs` |
| 2e | Chat legado somente leitura (leitor do formato; UNOBSERVED onde faltar) | `app/lib/legacy_chat.mjs`, tela `#/legacy-chat` | `node test/legacy_chat.test.mjs` |
| 2f | Voz personalizada: adaptadores huggingface-space/local-command testados vs servidor falso | `src/voiceclone.mjs`, rotas `/api/voiceclone/*` | `node test/voiceclone_adapters.test.mjs` |
| 2g | Pagamento SÓ ESTRUTURA: checkout/webhook assinado/portal vs servidor falso | `src/billing_flow.mjs`, rotas `/api/billing/flow/*` | `node test/billing_flow.test.mjs` |
| 3 | PERGUNTAS_USUARIO.md só com o que o usuário destrava | `PERGUNTAS_USUARIO.md` (9 linhas) | leitura |
| 4 | Suíte completa + bundle (prova do clone), zip, SHA256SUMS, docs | este pacote | suíte: 140 ok / 2 skip / 0 falhas (de 142); `MANIFESTO.md` traz a prova do `git clone` |

**Diferenças aceitas do Pippit (decisões do usuário):** modelos gratuitos; site gratuito por enquanto; pagamento só estrutura (sem gateway real).

**Regras cumpridas:** credenciais só por variável de ambiente (nomes no `.env.example`); sem segredo em arquivo/resposta; endereços 127.0.0.1; UNOBSERVED nunca vira verificada; um commit por item com teste; SHAs originais preservados; sem push.
