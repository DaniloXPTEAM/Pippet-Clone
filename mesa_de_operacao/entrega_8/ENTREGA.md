# Entrega da rodada 8 — 09/11/2026

**Estado: RODADA 8 PRONTA.** Suíte **124 aprovados, 2 skips explícitos, 0 falhas (126)** (`suite_r8_item4.txt`). Inventário **83/122 = 68,0%**. Quatro itens, na ordem pedida, cada um com teste e commit local. **Nenhum push.** Nenhuma chave em arquivo, commit, log, tela ou nesta entrega.

> **Atualização de 09/11/2026 (verificação):** o sandbox apagou o `.git` depois desta entrega. Os ids de commit abaixo **não existem mais no repositório local**; o conteúdo é o mesmo (conferido byte a byte) e foi reconstruído no commit de recuperação `c93c94b`. O `piperline_rodada8.bundle` enviado ao Drive antes do reset preserva os quatro commits originais; `piperline_rodada8_recovery.bundle` traz o estado atual. Detalhes em `VERIFICACAO_RODADAS_6_7_8.md`.

## Itens e commits

| # | item | commit | prova |
|---|---|---|---|
| 1 | Login Supabase real sobre o GoTrue (`apikey`, PKCE S256, sessão com tokens cifrados, botão Google condicionado a `settings.google`) | `c7f67f1` | `suite_r8_item1.txt` · `test/supabase_auth.test.mjs`, `test/auth_google_ui.test.mjs`, `auth_structure`, `auth_ui` |
| 2 | `.env.example` só com nomes, `.env` local ignorado, carga no primeiro import, tela de Provedores só presente/ausente | `dd5f6dc` | `suite_r8_item2.txt` · `test/env_file.test.mjs`, prova de UI em `providers_panel` |
| 3 | `PASSO_A_PASSO_USUARIO.md` (Windows, provedores gratuitos, login, o que falta) | `1a021ad` | `suite_r8_item3.txt` · `test/passo_a_passo.test.mjs` |
| 4 | Inventário reavaliado + “RODADA 8 PRONTA” | este commit | `suite_r8_item4.txt` |

## O que mudou no produto

- **Login Supabase de verdade.** Cadastro, entrada por e-mail/senha, renovação de sessão, saída (inclusive revogando no GoTrue), recuperação de senha, `GET /user` e `GET /settings`. OAuth Google/TikTok com **PKCE**: verifier gerado e guardado no servidor (uso único, 10 min), `state` conferido no retorno, troca do `code` em `grant_type=pkce`. Retorno **sempre** `http://127.0.0.1:5180/auth/callback`.
- **Segredos no lugar certo.** `SUPABASE_URL`/`SUPABASE_ANON_KEY` e as demais chaves vêm do ambiente **ou** de um `.env` local ignorado pelo Git; o ambiente vence. A API só informa booleano (`configured`, `reachable`, `google`, `email`) e nomes de variável. Os tokens do GoTrue ficam cifrados (AES-256-GCM) no servidor e nunca voltam em resposta, log ou tela.
- **Tela de entrada honesta.** “Continuar com o Google” desligado com o motivo escrito enquanto o projeto não tiver o provedor ligado; aviso de confirmação de e-mail depois do cadastro; criar conta disponível no adaptador Supabase.
- **Guia do usuário.** `PASSO_A_PASSO_USUARIO.md` para Windows, com a tabela dos provedores gratuitos já descobertos e a lista do que ainda não funciona.

## O que continua não funcionando (e por quê)

- **Google real** exige ligar o provedor no painel do Supabase e cadastrar `http://127.0.0.1:5180/auth/callback` em Redirect URLs — é configuração da conta do usuário, não código.
- **Publicação** (TikTok/Instagram/Facebook/YouTube) segue estrutura: falta app aprovado e OAuth real; `/api/social/connect` responde 501.
- **Cobrança** segue estrutura: gateway desabilitado, nada é cobrado.
- **Clonagem de voz** segue bloqueada (sem captura do fluxo original).
- **Omni/humano digital** segue `UNOBSERVED` (só nomes de endpoints nos bundles).

## Nota de honestidade

`talkingphoto_ui` falhou **1 vez em 5** execuções completas (`duração da prévia local: 4,72 s` em vez de ~3,0 s), sempre passando isolado e nas reexecuções. A execução registrada nesta entrega terminou 124/2/0. Nenhuma mudança da rodada 8 toca esse fluxo.

## Arquivos desta pasta

- `suite_r8_item1.txt` … `suite_r8_item4.txt` — log da suíte em cada item.
- `ENTREGA.md` — este resumo.
- (no Drive) `piperline_rodada8.bundle` — histórico completo para `git clone`.
