# PREPARO DE PUSH — pronto, **não executado**

> **Regra:** o push só acontece com **ordem explícita do usuário**, **um por sessão**, **nunca `--force`**.
> **Rodada 13:** nada mudou na estratégia — o push continua **não executado**. Os números desta página foram remedidos hoje (13 commits locais contra 12 remotos, 660 arquivos versionados).
>
> Este documento existe para que, quando a ordem vier, não haja improviso — e para avisar de uma coisa que só apareceu nesta rodada: **a branch já existe no remoto e a história divergiu.**

## 1. Branch, remoto e o que foi descoberto

- **Branch local:** `arena/a14d8a49-pippet-clone`
- **Remoto:** `origin` → `https://github.com/DaniloXPTEAM/Pippet-Clone.git`
- **Ponto de divergência (merge-base):** `48ca7bb`

Medido nesta rodada (`git fetch --unshallow origin`, depois `git rev-list --left-right --count`):

| Lado | Commits que o outro não tem |
|---|---|
| **local** (`HEAD`) | **13** (14 depois do commit do pacote) |
| **remoto** (`origin/arena/a14d8a49-pippet-clone`) | **12** |

**Consequência:** `git push` **seria recusado** (non-fast-forward). **Não use `--force`.** A branch remota tem os commits **originais das rodadas 1–6**, que o sandbox tinha dado como perdidos:

```
1443745 Document final B/C status and coverage      ← ponta remota
3216218 Add neutral title bar task and agent panels
94cdee7 Expose observed account menu and language settings
6e921ad Support return and saved state on existing canvases
a0d2730 Verify marketing visual style catalog and filtering
27d8593 Match marketing ad format picker interactions
0850969 Route canvas node generation through free providers
4c63ef8 Restore stage A local UI and regression coverage
c262ddb Document local scope, pending observations and test results
7e5b224 Make local test suite portable with explicit skips
209d400 Add local task links and validate run cancellation
ef69d05 Add local chat history and free provider router
48ca7bb Importa PiperLine … (lote12)                 ← base comum
```

Ou seja: **o histórico por rodada das rodadas 1–6 não está perdido — está no GitHub.** O que existe só aqui é o estado de **conteúdo** das rodadas 1–11 (num commit de recuperação) mais os commits das rodadas 12.

## 2. O que seria enviado

- **660 arquivos** no commit da auditoria (661 depois do pacote), ~79 MB de conteúdo (o mesmo da árvore versionada).
- **Fora do push** (por `.gitignore` e por escolha): `node_modules`, `.deps`, `*.bundle`, `*.zip`, `.env`, `.env.local`, `local_reconstruction/data/auth-secret`, `captures/auth/`, `google_drive/`.
- **Arquivo grande já versionado:** `captures/current_670/rea_session_bundle_lote12.json` tem **68 MB** e já está no commit base `48ca7bb`. Passa do limite de aviso do GitHub (50 MB) e fica abaixo do limite duro (100 MB): o push funciona, mas demora. Tirá-lo é decisão do usuário e uma rodada própria.
- **55 pngs de `test/ui-shots/`** vão junto (evidência histórica; desde a rodada 10 são somente leitura para os testes).

## 3. Os três caminhos possíveis (nenhum executado)

**Opção A (recomendada) — publicar numa branch nova, sem tocar na existente:**
```bash
git push -u origin arena/a14d8a49-pippet-clone:refs/heads/arena/a14d8a49-pippet-clone-r13
```
História preservada dos dois lados; a branch antiga fica como está; se quiser, depois se abre PR dela para `main`. **Nada é sobrescrito e não há merge.**

**Opção B — rebase do local sobre a ponta remota** (publica as duas histórias numa linha só):
```bash
git fetch origin
git rebase origin/arena/a14d8a49-pippet-clone
# conflitos são esperados: o commit de recuperação reescreve arquivos que os 12 commits antigos tocaram
node local_reconstruction/test/run-all.mjs     # precisa continuar 128/2/0
git push origin arena/a14d8a49-pippet-clone
```
Só faz sentido se o usuário quiser a linha contínua; exige resolver conflito e **rodar a suíte de novo** antes do push.

**Opção C — merge** (um commit juntando as duas histórias, mantendo o conteúdo local):
```bash
git fetch origin
git merge --no-commit origin/arena/a14d8a49-pippet-clone
git checkout --ours .   # ficar com o conteúdo desta árvore, que é o mais novo
git commit -m "merge: histórico remoto das rodadas 1-6 + estado local até a rodada 12"
```
Gera um commit de merge grande; útil se o usuário quiser os 12 commits visíveis na linhagem.

**Em qualquer opção:** um único push, **sem `--force`**, e só depois da ordem.

## 4. Varredura de segredos (resultado escrito)

Executada nesta rodada sobre os **659 arquivos versionados** de então (`segredos_varredura_r13.txt`); o resultado da r12 está preservado em `entrega_12/segredos_varredura.txt`:

- **9 padrões**: `sk-…`, `hf_…`, `ghp_/gho_/github_pat_…`, `AIza…`, `xox…`, `eyJ…` (JWT), `-----BEGIN … PRIVATE KEY-----`, valor colado em `apiKey/token/secret/senha/password`, `SUPABASE_SERVICE_ROLE_KEY=…`.
- **22 ocorrências** do padrão “valor colado”, **todas não-credenciais**:
  - **14** chaves falsas de teste (`'chave-nvidia-teste'`, `'chave-novai-teste'`, …) em `test/*.test.mjs`;
  - **6** marcadores em inglês (`'must-not-be-accepted'`, `'ephemeral-llm-secret'`, `'transient-test-key'`, …);
  - **2** **nomes** de variáveis (`Secret: 'TIKTOK_CLIENT_SECRET'`, `'GOOGLE_CLIENT_SECRET'`) em `src/publishing.mjs` — mapa nome→variável, não valor.
- **0 exigem revisão.** Nenhum `.env`, chave privada, JWT ou token de serviço.
- Os `sha256` do `MANIFESTO_SHA256.csv` são hashes de arquivo, não segredos.

**Rodada 13 (`segredos_varredura_r13.txt`):** **0** credencial com forma real (nenhum `sk-`, `hf_`, `ghp_`, `AIza`, `xox`, JWT ou `PRIVATE KEY`); **7** linhas do padrão “valor colado”, todas **não-credenciais** — 5 são **nomes** de variáveis (`publishing.mjs:78,85,92,99`) e 1 é uma **rota** (`auth.mjs:211`, `password: 'POST {SUPABASE_URL}/auth/v1/token?grant_type=password'`), e 2 são o próprio relatório da r12 citando esses nomes; **8** chaves **falsas** de teste (`'chave-do-freellmapi'`, `'chave-nvidia'`, …). **0 exigem revisão.** Nenhum `.env` versionado (só `.env.example`, com valores vazios).

## 5. Checagem antes de apertar o botão

```bash
cd /home/user/Pippet-Clone
git status --short                     # precisa sair vazio
git rev-list --left-right --count HEAD...origin/arena/a14d8a49-pippet-clone
git ls-files | grep -E '(^|/)\.env$|auth-secret|node_modules|\.bundle$'   # não pode listar nada
source local_reconstruction/.deps/env.sh && node local_reconstruction/test/run-all.mjs
# esperado: 128 passaram, 2 skip explícito, 0 falharam (de 130)
```

## 6. Depois do push

```bash
git log --oneline -1
gh api repos/DaniloXPTEAM/Pippet-Clone/branches/<branch-enviada> --jq .commit.sha
```
Conferir que o sha bate. **Não** abrir PR sem ordem.

Se o Git pedir credencial: **não** peça senha/token ao usuário no chat; o GitHub desta sessão já está autenticado e um erro de autenticação significa que a conexão precisa ser refeita no Arena.

## 7. O que **não** vai junto (e por quê)

| Item | Por quê |
|---|---|
| `.env` / `.env.local` / `data/auth-secret` | segredo local; `.gitignore` cobre; a API só diz presente/ausente |
| `node_modules/`, `.deps/` | reproduzíveis por `recuperar_ambiente.sh` |
| `*.bundle`, `*.zip` | artefatos de entrega; ficam no Drive |
| `captures/auth/` | evidência de captura com dados de sessão do Pippit |
| `google_drive/` | pasta de trabalho, não é código |

## 8. Nota de honestidade sobre o bundle

O primeiro bundle desta rodada **não** era autossuficiente: o repositório local era **shallow** (clone raso, `.git/shallow` com `48ca7bb`), e `git bundle create --all` herdava essa fronteira — `git bundle verify` dizia “complete history”, mas o `git fetch` do bundle falhava com *“did not send all necessary objects”*.

Corrigido com `git fetch --unshallow origin` (agora `git rev-parse --is-shallow-repository` = `false`). Na **rodada 13** a prova foi mais dura: `git clone <bundle>` **numa pasta vazia** — o resultado (commits, arquivos e HEAD restaurado) está em `piperline_rodada13_bundle_verify.txt`.
