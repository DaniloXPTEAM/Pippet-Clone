# LOGIN — autenticação do PiperLine (GoTrue implementado)

Camada de autenticação com dois adaptadores. O **`local` continua o padrão** (usuário único da instalação, como antes). O **`supabase` deixou de ser contrato**: fala o GoTrue do projeto do usuário de verdade, com `apikey` em toda chamada, PKCE no OAuth e tokens guardados só no servidor.

Documento atualizado em 09/11/2026 (rodada 8, item 1) — substitui a versão "estrutura" da rodada 7.

## 1. Peças

| Peça | Arquivo | Papel |
|---|---|---|
| Camada e adaptadores | `local_reconstruction/app/lib/auth.mjs` | `ADAPTERS.local` / `ADAPTERS.supabase`; `hashPassword`/`verifyPassword` (scrypt); `newSession`/`verifySession`/`pruneSessions`; `supabaseConfig()` (lê `SUPABASE_URL`/`SUPABASE_ANON_KEY` do **ambiente**); `gotrue()` (fetch com `apikey`, `Authorization` opcional e timeout de 10 s); `createPkce()` (S256); `authorizeUrl()`; `seal`/`open` (AES-256-GCM com o segredo local); `normalizeUser()`; `gotrueError()` (traduz 400/401/422/429). |
| Rotas e porteiro | `local_reconstruction/app/server.mjs` | `GET /api/auth/state`, `GET /api/auth/settings`, `POST /api/auth/{signup,login,logout,refresh,recover,adapter,require,password}`, `GET/DELETE /api/auth/sessions...`, `GET /api/auth/oauth/{google,tiktok}` (302), `GET /auth/callback`; gate em `/api/*` quando "exigir login" está ligado (exceto `/api/auth/*`). |
| Telas | `local_reconstruction/app/public/app.js` | `#/login` (entrar, criar conta, **"Continuar com o Google"** ligado só quando o GoTrue diz `google=true`, senão desligado com o motivo), Configurações → **Login e gerenciamento** (adaptador, exigir login, senha local, sessões/revogar, sair). |
| Testes | `test/supabase_auth.test.mjs`, `test/auth_google_ui.test.mjs`, `test/auth_structure.test.mjs`, `test/auth_ui.test.mjs` | GoTrue **falso** em `127.0.0.1` (nada de rede real): sucesso, senha fraca, e-mail repetido, 401, 429, refresh, logout, callback com erro, PKCE com verifier errado, settings sem Google; no navegador: botão do Google desligado/ligado e o redirect com `code_challenge`. |

## 2. Adaptadores

| id | estado | o que faz hoje |
|---|---|---|
| `local` | **funcional** (padrão) | Usuário único, senha opcional (scrypt; sem senha, entra em branco). Sessão de 7 dias em cookie `HttpOnly; SameSite=Lax`; no disco fica só o HMAC-SHA256 do token. Nenhuma chamada de rede. |
| `supabase` | **funcional** (escolha explícita) | GoTrue real do projeto: cadastro, login por senha, refresh, logout remoto, recuperação de senha, `GET /user`, `GET /settings` e OAuth com **PKCE (S256)** para Google/TikTok. |

## 3. Contrato GoTrue chamado (todas as chamadas levam `apikey`)

| Uso | Chamada |
|---|---|
| Cadastro | `POST {SUPABASE_URL}/auth/v1/signup` |
| Login por senha | `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` |
| Renovar sessão | `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` |
| Trocar código do OAuth | `POST {SUPABASE_URL}/auth/v1/token?grant_type=pkce` com `{ auth_code, code_verifier }` |
| Sair | `POST {SUPABASE_URL}/auth/v1/logout` |
| Usuário atual | `GET {SUPABASE_URL}/auth/v1/user` |
| Recuperar senha | `POST {SUPABASE_URL}/auth/v1/recover` |
| Provedores ligados | `GET {SUPABASE_URL}/auth/v1/settings` |
| Iniciar OAuth | `GET {SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=http://127.0.0.1:5180/auth/callback&code_challenge=…&code_challenge_method=s256` |

## 4. Sessão, segredos e privacidade

- A sessão do app é o cookie `piperline_session` (`HttpOnly; SameSite=Lax`). Dentro dele vai **só** o token do app (HMAC do `local` ou token assinado da sessão do Supabase).
- Os tokens do GoTrue (`access_token`/`refresh_token`) ficam **cifrados no servidor** (AES-256-GCM, chave em `local_reconstruction/data/auth-secret`, fora do git) nos campos `accessSealed`/`refreshSealed`. Nunca vão para a tela, para log ou para resposta de API.
- **Permissão do `auth-secret` por sistema operacional:** em **Linux/macOS** o arquivo é criado com modo **`0600`** (só o dono lê) e o teste exige isso. No **Windows não existem bits de permissão POSIX** — `chmod` é no-op, o arquivo herda a ACL da pasta e o modo lido não é `0600`. Ali a proteção do segredo **depende da pasta do usuário** (perfil do Windows, `%APPDATA%`/`Documentos`): mantenha `local_reconstruction/data/` dentro do seu perfil, não em pasta compartilhada, e não copie o arquivo para outro lugar. O teste pula essa asserção no Windows com o motivo escrito (`app/lib/auth.mjs` expõe `secretModeEnforced(platform)` para essa decisão).
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` vêm **do ambiente**. A API só informa booleanos (`configured`, `reachable`, `google`, `email`) e o host; a chave nunca aparece.
- **Sempre `127.0.0.1`, nunca `localhost`**: o `redirect_to` é montado a partir de `PIPERLINE_PUBLIC_ORIGIN` (padrão `http://127.0.0.1:5180`) e força o host `127.0.0.1`, mesmo que a variável traga `localhost`.
- O `code_verifier` do PKCE fica no servidor (`db.auth.pkce`, validade de 10 min, uso único) e o navegador só recebe um id+state em cookie `HttpOnly` (`piperline_pkce`). State ou verifier que não conferem → callback recusa com página de erro, sem criar sessão.
- `/api/auth/settings` guarda a resposta por 60 s (evita bater no GoTrue a cada tela); `?force=1` ignora o cache.

## 5. OAuth (implementado, depende do projeto)

| provedor | escopos | estado |
|---|---|---|
| Google | `openid`, `email`, `profile` | implementado com PKCE; o botão só liga quando `/auth/v1/settings` traz `google=true`. |
| TikTok | `user.info.basic` | implementado com PKCE; fica desligado enquanto o projeto não ligar o provedor. |

Fluxo real: tela → `GET /api/auth/oauth/google` (gera verifier/challenge, grava o verifier no servidor, 302 para o GoTrue) → provedor → `GET /auth/callback?code=…&state=…` (confere state e uso único, troca o code no `grant_type=pkce`, grava a sessão e volta para a home). Erro do provedor (`?error=access_denied`), state errado ou verifier errado mostram uma página de erro e **não** criam sessão.

## 6. Confirmação de e-mail

O projeto do usuário exige confirmação. Depois de `POST /api/auth/signup` sem sessão, a API responde `needsEmailConfirmation: true` com "Cadastro criado: confirme seu e-mail…" e a tela mostra "✉️ confirme seu e-mail antes de entrar". Login antes da confirmação responde "confirme seu e-mail antes de entrar (verifique a caixa de entrada)".

## 7. O que ainda não funciona

1. **Nada de OAuth sem provedor ligado** no painel do Supabase: a tela avisa e o botão fica desligado (não há como o app ligar isso por conta própria).
2. **Vincular/desvincular** conta Google/TikTok a uma conta existente não existe no app (só entrar com o provedor).
3. `PIPERLINE_PUBLIC_ORIGIN` precisa bater com a URL cadastrada em **Authentication → URL Configuration** do Supabase; se o projeto só aceitar outro host, o retorno é recusado pelo próprio GoTrue.
4. Testes cobrem o GoTrue **falso**; nenhuma chamada é feita ao projeto real do usuário durante a suíte.
