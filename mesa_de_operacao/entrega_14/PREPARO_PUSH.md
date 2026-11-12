# PREPARO DE PUSH — pronto, **não executado** (rodada 14)

> **Regra:** o push só acontece com **ordem explícita do usuário** ("PUSH AUTORIZADO"), **um por sessão**, **nunca `--force`**.
> **Rodada 14:** nada mudou na estratégia — o push continua **não executado**. Os números desta página foram remedidos em 2026-11-12 (23 commits locais contra 12 remotos; 672 arquivos versionados antes do pacote da r14).
> **Branch nova (opção A):** `arena/a14d8a49-pippet-clone-r12` — **exatamente como o usuário escreveu na ordem da r14**. Se ele preferir outro sufixo (ex.: `-r14`), avisar **antes** do push.

## 1. Branch, remoto e o que foi descoberto

- **Branch local de trabalho:** `arena/d9cee29f-pippet-clone` (a branch da sessão do Arena; o histórico é o mesmo de `arena/a14d8a49-pippet-clone`, restaurado do bundle da r13 — HEAD base conferido em `9e57f96`)
- **Remoto:** `origin` → `https://github.com/DaniloXPTEAM/Pippet-Clone.git`
- **Ponto de divergência (merge-base):** `48ca7bb`

Medido nesta rodada (`git fetch --unshallow origin`, depois `git rev-list --left-right --count`):

| Lado | Commits que o outro não tem |
|---|---|
| **local** (`HEAD`) | **23** (26 depois do pacote da r14) |
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

Ou seja: **o histórico por rodada das rodadas 1–6 não está perdido — está no GitHub.** O que existe só aqui é o estado de **conteúdo** das rodadas 1–13 (num commit de recuperação) mais os commits das rodadas 12–14.

## 2. O que seria enviado

- **682 arquivos** no commit final do pacote da r14, ~81 MB de conteúdo (o mesmo da árvore versionada).
- **Fora do push** (por `.gitignore` e por escolha): `node_modules`, `.deps`, `*.bundle`, `*.zip`, `.env`, `.env.local`, `local_reconstruction/data/auth-secret`, `captures/auth/`, `google_drive/`, e os artefatos `SHA256SUMS.txt`/`*_bundle_verify.txt` das entregas.
- **Arquivo grande já versionado:** `captures/current_670/rea_session_bundle_lote12.json` tem **68 MB** e já está no commit base `48ca7bb`. Passa do limite de aviso do GitHub (50 MB) e fica abaixo do limite duro (100 MB): o push funciona, mas demora. Tirá-lo é decisão do usuário e uma rodada própria.
- **55 pngs de `test/ui-shots/`** vão junto (evidência histórica; desde a rodada 10 são somente leitura para os testes).

## 3. Os três caminhos possíveis (nenhum executado)

**Opção A (recomendada) — publicar numa branch nova, sem tocar na existente:**
```bash
git push -u origin arena/d9cee29f-pippet-clone:refs/heads/arena/a14d8a49-pippet-clone-r12
```
História preservada dos dois lados; a branch antiga fica como está; se quiser, depois se abre PR dela para `main`. **Nada é sobrescrito e não há merge.** (A branch local pode se chamar de outro jeito — o que importa é o lado direito do `:`, o nome **novo** no remoto: `arena/a14d8a49-pippet-clone-r12`, como o usuário mandou na ordem da r14.)

**Opção B — rebase do local sobre a ponta remota** (publica as duas histórias numa linha só):
```bash
git fetch origin
git rebase origin/arena/a14d8a49-pippet-clone
# conflitos são esperados: o commit de recuperação reescreve arquivos que os 12 commits antigos tocaram
node local_reconstruction/test/run-all.mjs     # precisa continuar 128/2/0
git push origin arena/d9cee29f-pippet-clone
```
Só faz sentido se o usuário quiser a linha contínua; exige resolver conflito e **rodar a suíte de novo** antes do push.

**Opção C — merge** (um commit juntando as duas histórias, mantendo o conteúdo local):
```bash
git fetch origin
git merge --no-commit origin/arena/a14d8a49-pippet-clone
git checkout --ours .   # ficar com o conteúdo desta árvore, que é o mais novo
git commit -m "merge: histórico remoto das rodadas 1-6 + estado local até a rodada 14"
```
Gera um commit de merge grande; útil se o usuário quiser os 12 commits visíveis na linhagem.

**Em qualquer opção:** um único push, **sem `--force`**, e só depois da ordem.

## 4. Varredura de segredos (resultado escrito)

Executada nesta rodada sobre os **672 arquivos versionados** (`segredos_varredura_r14.txt`; o da r13 está preservado em `entrega_13/segredos_varredura_r13.txt`):

- **9 padrões**: `sk-…`, `hf_…`, `ghp_/gho_/github_pat_…`, `AIza…`, `xox…`, `eyJ…` (JWT), `-----BEGIN … PRIVATE KEY-----`, valor colado em `apiKey/token/secret/senha/password`, `SUPABASE_SERVICE_ROLE_KEY=…`.
- **0 ocorrências** de `sk-`, `hf_`, `ghp_/gho_/github_pat_`, `AIza`, `xox`, JWT ou `PRIVATE KEY`.
- **2 ocorrências** de `SUPABASE_SERVICE_ROLE_KEY=`: são os **próprios `PREPARO_PUSH.md` das entregas 12 e 13** citando o padrão da varredura — não-credenciais.
- Padrão "valor colado": só **código** (atribuições de variáveis) e **chaves falsas de teste** (`'at-falso'`, `'rt-falso'`, `'senha-boa'`, …). **0 exigem revisão.**
- Nenhum `.env` versionado (só `.env.example`, com valores vazios). Nenhum `auth-secret` versionado (o `.gitignore` cobre `local_reconstruction/data/auth-secret`).

## 5. Checagem antes de apertar o botão (rodada em 2026-11-12; repetir na hora do push)

```bash
cd /home/user/Pippet-Clone
git status --short                     # precisa sair vazio
git rev-list --left-right --count HEAD...origin/arena/a14d8a49-pippet-clone
# medido hoje: 23 locais / 12 remotos (26/12 depois do pacote da r14)
git ls-files | grep -E '(^|/)\.env$|auth-secret|node_modules|\.bundle$'   # não pode listar nada
source local_reconstruction/.deps/env.sh && node local_reconstruction/test/run-all.mjs
# esperado: 128 passaram, 2 skip explícito, 0 falharam (de 130)
```

Resultado desta rodada: `git status --short` **vazio** após os commits · rev-list **23/12** (26/12 com o pacote) · grep **sem resultados** · suíte **128/2/0** (três execuções completas em 2026-11-12: duas do `run-all` e a soma dos blocos; ver `suite_rodada14_final.txt` e `git_status_prova_r14.txt`).

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
| `SHA256SUMS.txt` / `*_bundle_verify.txt` das entregas | artefatos que dependem do bundle/zip; ficam no Drive (decisão da r13, mantida) |

## 8. Nota de honestidade sobre o bundle

O bundle da r12 não era autossuficiente (o repositório local era **shallow** e o `git bundle create --all` herdava a fronteira). Corrigido na r13 com `git fetch --unshallow origin` e provado com `git clone <bundle>` em pasta vazia. **Na r14 o perigo voltou de forma nova:** o checkout do Arena nasce shallow (`is-shallow-repository = true`) — antes de gerar o bundle da r14 foi feito `git fetch --unshallow origin` de novo, e a prova do `git clone` em pasta vazia está em `piperline_rodada14_bundle_verify.txt`. **Regra permanente: nunca gerar bundle sem conferir `git rev-parse --is-shallow-repository` = `false`.**
