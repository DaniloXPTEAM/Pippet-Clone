# LEIA_PRIMEIRO_NOVA_SESSAO — rodada 18 (ordem substitutiva)

**Contexto:** "Pippet-Clone" = reconstrução local do Pippit (BytePlus). Regras do projeto: `mesa_de_operacao/entrega_15/LEIA_PRIMEIRO_NOVA_SESSAO.md` (endereços 127.0.0.1; "NÃO provado" quando não medido; nada inventado; UNOBSERVED ≠ verificada; `--force` proibido; respostas curtas).

**Regras vigentes da r18 (ordem substitutiva — SUBSTITUI qualquer ordem r18 anterior):**
- **REGRA PERMANENTE (r20, vale para sempre): NESTE PRODUTO TUDO É GRATUITO E SEM BLOQUEIO.** "Igual ao Pippit" vale para telas, fluxos e funções, NÃO para cobrança: nenhum paywall, nenhum bloqueio por plano ou por modelo, todos os modelos livres (vídeo, imagem, áudio). Preço só existirá no futuro, em OUTRO produto. A estrutura de pagamento fica no código, desligada. Preços e paywall observados no Pippit ficam SÓ nos documentos de evidência, marcados "observado no original, não reproduzido por decisão do usuário". (O adendo r19 que pediu o paywall de Áudio estava ERRADO e foi desfeito na r20.)
- NADA sai do escopo sem autorização do usuário. Bloqueio = pendência com CAMINHO de implementação — nunca remoção.
- Contagens **x/122 (critério antigo)** e **x/423 (catálogo integral)** mantidas, lado a lado; SEM régua de escopo reduzido.
- A ordem anterior de "decisões" (estados "decidido"/"fora do escopo", `DECISOES_R18.md`) foi REVOGADA e desfeita (`3c20390` reverte `5559abb`) — nunca reimplementar esses estados.
- Diferenças aceitas do Pippit: modelos gratuitos; site gratuito por enquanto; pagamento SÓ estrutura.
- Credenciais SÓ por variável de ambiente (nomes em `local_reconstruction/.env.example`); sem chave em arquivo; widget de ajuda local sem token de terceiro.
- Um commit por item, com teste; sem push (push único só no fim do projeto); testes não alteram arquivos versionados.

**Réguas atuais:** 113/122 = 92,6% (38 impl + 75 verif) e 152/423 = 35,9% (85 verif / 67 impl UNOBSERVED / 271 inventadas / 0 bloqueadas). UNOBSERVED nunca vira verificada.

**Placar:** **r20 sandbox Linux = 147 ok / 4 skip / 0 falhas (de 151)** (skips: `pageview`, `parity` = evidência local; `e2e_live`, `llm_live` = Ollama real indisponível — opcionais ao vivo, incluídos no run-all com skip explícito desde a r20). Baselines: r19 Windows (validado por captura — `VALIDACAO_WINDOWS_R19.md`) = 146/2/0 de 148; r18 = 140/2/0 de 142; r17 Windows = 133/2/0 de 135. **Windows r20 = PENDÊNCIA com caminho** (rodar `node local_reconstruction/test/run-all.mjs` no Windows). Comando: `node local_reconstruction/test/run-all.mjs` com `PIPPIT_FFMPEG`, `PIPPIT_FFPROBE` e (para UI) `PIPERLINE_CHROMIUM_EXECUTABLE`.

**Código novo da r18:** `src/oauth_social.mjs`, `src/marketplace.mjs`, `src/voiceclone.mjs`, `src/billing_flow.mjs`, `app/lib/help_widget.mjs`, `app/lib/gates.mjs`, `app/lib/legacy_chat.mjs` + rotas em `app/server.mjs` + telas `#/integrations`, `#/legacy-chat`, `#/dev`, widget flutuante. Fluxo de pagamento em `/api/billing/flow/*` (as rotas `/api/billing/checkout|webhook` antigas continuam com o contrato 501 da estrutura).

**Pendências (só o usuário):** `PERGUNTAS_USUARIO.md` (9 perguntas — capturas do Pippit real, provedor de lip-sync/voz, credenciais de cada rede no ambiente). Cada resposta atualiza `FEATURE_INVENTORY.md` (UNOBSERVED → CONFIRMED no conteúdo correspondente).

**Fonte durável da cadeia:** bundles oficiais no Drive (`TAMANanoAI/entregaveis`): `entrega_18_bundle.git`, `entrega_19_bundle.git`, `entrega_19_bundle_corrigido.git` (`1ODhBBQ3Svj-w8B-_9Y0zIdCWyzjJ6AGI`) e `entrega_20_bundle.git` — cópias locais e o `.git` podem sumir entre turnos; restaurar via `download_file` → `git fetch <bundle> 'refs/*:refs/*'` → `git update-ref` (conferir `git rev-list --count HEAD`). **Histórico:** 63 commits até `b204895` + os desta entrega; SHAs originais preservados (merge `5a82113`; raízes `851a3b5`/`48ca7bb`). Se o `.git` resetar para `ba09c73`, refazer a costura: `git commit-tree 'fb9db1f^{tree}' -p 3684da6` (autor `DaniloXPTEAM <276125030+DaniloXPTEAM@users.noreply.github.com>`, data de fb9db1f) → merge (pais `b2dc510`+`e07f5b2`) → cherry-picks na ordem do `git log`.

**Drive:** pasta "entregaveis" `1GJr1ZzN-foDMJNWPp5N6d64NV5DnWqqQ` (entrega_10..17 completas — não mexer; entrega_18 = esta). ShA dos arquivos publicados em `SHA256SUMS.txt` ("hash  arquivo", dois espaços).
