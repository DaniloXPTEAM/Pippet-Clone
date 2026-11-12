# PREPARO DE PUSH — pronto, **não executado**

> **Regra:** o push só acontece com **ordem explícita do usuário**, **um por sessão**, **nunca `--force`**.
> Este documento existe para que, quando a ordem vier, não haja improviso.

## 1. Branch e remoto

- **Branch de trabalho:** `arena/a14d8a49-pippet-clone` (a mesma desde o começo).
- **Remoto:** `origin` → `https://github.com/DaniloXPTEAM/Pippet-Clone.git`
- **Base:** parte de `48ca7bb` (linha de `main`). A branch **não existe no remoto** até o primeiro push.
- **Branch sugerida no remoto:** `arena/a14d8a49-pippet-clone` (mesmo nome; evita criar branch nova).

## 2. O que seria enviado

- **650 arquivos versionados**, ~79 MB de conteúdo.
- **Fora do push** (por `.gitignore` e por escolha): `local_reconstruction/node_modules`, `local_reconstruction/.deps`, `*.bundle`, `*.zip`, `.env`, `.env.local`, `local_reconstruction/data/auth-secret`, `captures/auth/` e `captures/*.json` (exceto o arquivo já versionado abaixo).

**Atenção — arquivo grande já versionado:** `captures/current_670/rea_session_bundle_lote12.json` tem **68 MB** e **está no commit base** (`48ca7bb`), não nesta rodada. O GitHub avisa acima de 50 MB e recusa acima de 100 MB. Ele **passa**, mas o push vai demorar. Se você preferir tirá-lo, isso é uma decisão sua e uma rodada própria (o arquivo é evidência da captura do Pippit, citado no `STATUS.md`).

Também vão os **55 pngs de `test/ui-shots/`** — evidência histórica das entregas anteriores. Desde a rodada 10 eles são **somente leitura** para os testes (as capturas novas vão para pasta temporária).

## 3. Commits que existem hoje (histórico reconstruído)

O sandbox apagou o `.git` **5 vezes**. Nas recuperações o **conteúdo** sobreviveu inteiro, o **histórico por rodada não**: os commits originais das rodadas 1–11 se perderam junto com os objetos. O que existe hoje é:

| Commit | O que é |
|---|---|
| `48ca7bb` | base: importação do repositório como estava no GitHub |
| `bfa9169` | recuperação: estado entregue da rodada 11 (contém o resultado das rodadas 1–11) |
| `6a6292d` | rodada 12 · item 1 — teste de lip-sync independente de shebang |
| `722f235` | rodada 12 · item 2 — `pricing_faq_ui` cronometrado e SKIP com motivo |
| `329e67d` | rodada 12 · entrega escrita (STATUS + pasta `entrega_12`) |
| *(item 3)* | pacote de passagem (este arquivo, `LEIA_PRIMEIRO`, manifesto, zip) |

**Onde estão os commits originais de cada rodada:** nos **bundles do Drive** de cada entrega (`entrega_3`, `entrega_6`…`entrega_12`), cada um com o histórico daquele momento. O bundle desta rodada (`piperline_rodada12.bundle`) é **autossuficiente** (`git bundle create --all`), ou seja, restaura o histórico completo mesmo sem o `48ca7bb`.

Se você quiser commits separados por rodada no GitHub, isso teria de ser refeito a partir dos bundles antigos — **não** é o que este push faria.

## 4. Varredura de segredos (resultado escrito)

Executada sobre os **650 arquivos versionados + os documentos desta entrega** (`segredos_varredura.txt`, resultado cru):

- **9 padrões** procurados: `sk-…`, `hf_…`, `ghp_/gho_/github_pat_…`, `AIza…`, `xox…`, `eyJ…` (JWT), `-----BEGIN … PRIVATE KEY-----`, valor colado em `apiKey/token/secret/senha/password`, `SUPABASE_SERVICE_ROLE_KEY=…`.
- **22 ocorrências** do padrão “valor colado”, **todas não-credenciais**, assim classificadas:
  - **14** são chaves falsas de teste (`'chave-nvidia-teste'`, `'chave-novai-teste'`, …) em `test/*.test.mjs`;
  - **6** são marcadores em inglês (`'must-not-be-accepted'`, `'ephemeral-llm-secret'`, `'transient-test-key'`, …);
  - **2** são **nomes** de variáveis de ambiente (`Secret: 'TIKTOK_CLIENT_SECRET'`, `'GOOGLE_CLIENT_SECRET'`) em `src/publishing.mjs` — é um mapa de nome→variável, não um valor.
- **0 exigem revisão.** Nenhum `.env`, nenhuma chave privada, nenhum JWT, nenhum token de serviço.
- Os `sha256` do `MANIFEST_SHA256.csv` são hashes de arquivo, não segredos.

## 5. Checagem antes de apertar o botão

```bash
cd /home/user/Pippet-Clone
git status --short                 # precisa sair vazio
git log --oneline -5               # confere os commits da seção 3
git ls-files | grep -E '(^|/)\.env$|auth-secret|node_modules|\.bundle$'   # não pode listar nada
node local_reconstruction/test/run-all.mjs   # esperado: 128 passaram, 2 skip explícito, 0 falharam (de 130)
```

(`run-all.mjs` precisa de `source local_reconstruction/.deps/env.sh` antes.)

## 6. O comando — **pronto, NÃO executado**

```bash
git push -u origin arena/a14d8a49-pippet-clone
```

- **Sem** `--force`, **sem** `--force-with-lease`, **sem** `--mirror`.
- Se o Git recusar por histórico divergente (a branch já existir com outros commits): **pare** e pergunte ao usuário. Não force nada.
- Se pedir credencial: **não** peça senha/token ao usuário no chat; o GitHub desta sessão já está autenticado (se falhar com erro de autenticação, é sinal de que a conexão precisa ser refeita no Arena).
- Depois do push: `git log --oneline -1` e `gh api repos/DaniloXPTEAM/Pippet-Clone/branches/arena/a14d8a49-pippet-clone --jq .commit.sha` para confirmar o que subiu. **Não** abrir PR sem ordem.

## 7. O que **não** vai junto (e por quê)

| Item | Por quê |
|---|---|
| `.env` / `.env.local` / `data/auth-secret` | segredo local; `.gitignore` cobre; a API só diz presente/ausente |
| `node_modules/`, `.deps/` | reproduzíveis por `recuperar_ambiente.sh` |
| `*.bundle`, `*.zip` | artefatos de entrega; ficam no Drive |
| `captures/auth/` | evidência local de captura (contém dados de sessão do Pippit) |
| `google_drive/` | pasta de trabalho do Drive, não é código |
