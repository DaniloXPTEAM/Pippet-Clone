# AUDITORIA_R13 — varredura de portabilidade e de higiene de teste (rodada 13, item 4)

Data: 2026-11-09 · base: `f5f3332` (HEAD da r12) · HEAD desta rodada: `eb129b4` · sem push, sem chaves.

Regra desta auditoria (do usuário): **relatar tudo, corrigir só bug claro de Windows ou de teste**. Na dúvida, fica
registrado aqui e não é refatorado. Cada linha traz o caminho com número de linha, a evidência e a decisão.

---

## 1. O que a ordem pedia e o que foi feito

| item | defeito (provado no Windows) | correção | prova | commit |
|---|---|---|---|---|
| 1 | `lipsync_adapters` esperava "código 3" e recebia "código 1": `powershell -Command` termina 1 quando um programa **nativo** falha e não repassa o código dele (`& node -e 'process.exit(3)'` → 1; com `; exit $LASTEXITCODE` → 3) | `src/providers.mjs` `localShellPlan().argsFor()` passa a fechar a linha do PowerShell/pwsh com `; exit $LASTEXITCODE`; `cmd.exe` e POSIX ficam idênticos | teste em 3 passos: (a) linha válida **sem** o sufixo devolve 1 — o seu defeito; (b) **com** o sufixo devolve 3; (c) o app, com esse comando, fecha a tarefa com "código 3". Revertendo a linha de `providers.mjs`, o teste falha no plano (`'x'` contra `'x; exit $LASTEXITCODE'`) | `ce8693c` |
| 2 | `browser_probe` (teste novo) morria com `ERR_UNSUPPORTED_ESM_URL_SCHEME`: o filho fazia `import()` de caminho absoluto `C:\...` e o Node exige URL `file://` | `test/browser_probe.test.mjs:17-24` monta o especificador com `pathToFileURL(path.join(REPO_TEST,'support/browser.mjs')).href` | `browser_probe` ok (4 casos) nos dois formatos de caminho (Linux aqui; `file:///C:/...` no Windows) | `85ebc03` |

O `prepare()` com `& ` (rodada 11) **não foi tocado** — continua congelado, como você mandou.

### 1.1 Achado do caminho: o commit do item 1 tinha arrastado dois arquivos da r12

`SHA256SUMS.txt` e `piperline_rodada12_bundle_verify.txt` da `entrega_12` estavam no disco, no Drive e **fora do git**
(apareciam como `??`). Um `git add` amplo do item 1 os levou junto. Como o histórico desta sessão ainda **não foi
pushed**, a história foi reorganizada em três commits limpos, um por assunto:

```
eb129b4  mesa: versão no git os dois artefatos da r12 que estavam só no Drive
85ebc03  test(browser_probe): importar o apoio por pathToFileURL (item 2)
ce8693c  rodada 13 item 1: PowerShell devolve o código real do programa (exit $LASTEXITCODE)
f5f3332  rodada 12 item 3 (parte 5) — HEAD da r12
```

Nada foi perdido: as mensagens dos itens 1 e 2 são as mesmas de antes; só os arquivos da r12 saíram do meio delas.

---

## 2. Varredura pedida (a–i)

### (a) `new URL(import.meta.url).pathname` — **zero ocorrências**

```
$ grep -rn "import\.meta\.url)\.pathname" --include=*.mjs --include=*.js .   → (vazio, fora node_modules)
```

O `.pathname` de URL percent-encoda espaço (`%20`) e devolve `/C:/...` no Windows — qualquer uso seria bug de
portabilidade. Não existe nenhum. **Nada a corrigir.**

### (b) `import()` de caminho absoluto sem `pathToFileURL` — **1 caso, corrigido** (item 2)

```
$ grep -rn "await import(\|import(\${" --include=*.test.mjs test | grep -v pathToFileURL
test/no_versioned_writes.test.mjs:26:const os = await import('node:os');
test/browser_probe.test.mjs:17:const fs = await import('node:fs');
```

Os dois restantes importam **módulos embutidos** (`node:os`, `node:fs`) — nome de esquema, não caminho. O único
import de caminho absoluto era o do `browser_probe`, já corrigido em `85ebc03`. **Corrigido.**

### (c) Executável falso com shebang — **2 pontos, ambos já tratados**

```
test/lipsync_adapters.test.mjs:246  fs.writeFileSync(psImpostor, `#!/usr/bin/env node ...`)
test/lipsync_adapters.test.mjs:290  if (!noWindows) { fs.writeFileSync(alvo, `#!/bin/sh\nexec "${process.execPath}" "$@"\n`); fs.chmodSync(alvo, 0o755); ... }
```

Shebang só vale no POSIX: no Windows o arquivo é chamado **explicitamente** por `node` (o teste roda o imitador como
`node <arquivo>`), e a linha 290 já está sob `if (!noWindows)` com `chmod 0755`. É exatamente o padrão certo — o
shebang é para o POSIX, o caminho do Windows nunca depende dele. **Nada a corrigir.**

### (d) `bash -c` / `sh -c` / `-lc` — **só no lugar legítimo**

```
src/providers.mjs:259  const argsFor = (cmd) => (powershell ? ['-NoProfile','-Command',`${cmd}; exit $LASTEXITCODE`] : cmdExe ? ['/d','/s','/c',cmd] : ['-lc',cmd]);
```

É a escolha de shell por sistema operacional (`-lc` POSIX, `/c` cmd.exe, `-Command` PowerShell) — o mesmo ponto do
item 1. Nenhum teste chama `bash -c`/`sh -c` para rodar pedaço de teste. **Nada a corrigir.**

### (e) `/tmp` fixo — **4 linhas, todas em fixture, não em caminho real**

```
test/lipsync_adapters.test.mjs:45,59,60,65   caminhos de arquivo SERVIDOS pelo Gradio falso (/tmp/gradio/...)
recuperar_ambiente.sh:80,97                  varredura de caches do sandbox (/tmp/pyff, /tmp/chromium)
recuperar_ambiente.sh:134                    FONTCONFIG_PATH=<libs>/tmp/fonts (pasta do próprio projeto)
```

As quatro linhas do teste são **texto de resposta do servidor falso** (o campo `path` que o Gradio devolve): nada é
lido nem escrito em `/tmp` de verdade — no Windows o teste passa com `C:\...` no lugar porque o app só usa o nome do
arquivo e a URL. As três do `recuperar_ambiente.sh` são o script de recuperação **deste sandbox Linux**, que não
roda no seu PC. **Nada a corrigir.**

### (f) `set -e` — **zero em script de teste**

```
$ grep -rln "set -e" --include=*.sh --include=*.test.mjs .  → ./recuperar_ambiente.sh
```

Só o script de recuperação (é o comportamento desejado num script de preparação). Nenhum teste depende de
`set -e`/`pipefail`. **Nada a corrigir.**

### (g) Modo `0600` como premissa — **1 premissa protegida, 1 tolerância aceitável**

```
app/lib/auth.mjs:121-124  comentário: no Windows chmod é no-op; o teste não exige 0600 no win32
app/lib/auth.mjs:131-132  writeFileSync(file, s, { mode: 0o600 }); try { chmodSync(file, 0o600) } catch {}
test/auth_structure.test.mjs:29-31,37  secretModeEnforced('win32') === false  (pula no Windows)
test/auth_structure.test.mjs:41        asserção de 0o600 SÓ fora do win32
test/auth_structure.test.mjs:43        [SKIP] explícito com o motivo no Windows
```

A exigência de 0600 **não** é premissa cega: está desligada no Windows com motivo escrito, e o `catch {}` do chmod é
intencional (o arquivo já nasceu `mode: 0o600`; o chmod é reforço onde existe). **Nada a corrigir.**

### (h) `catch {}` vazio — **11 ocorrências, todas em parse, limpeza ou aborto de SSE**

```
test/auth_structure.test.mjs:60        JSON.parse do corpo de resposta
test/cloudflare_transcribe.test.mjs:24 JSON.parse do corpo
test/directgen_http.test.mjs:14,15     abortar leitura de SSE (AbortController / reader.cancel)
test/flow_e2e_providers.test.mjs:212   rmSync de limpeza no finally
test/lipsync_adapters.test.mjs:373,377 cancelamento de tarefa + rmSync no finally
test/pricing_faq_ui.test.mjs:73        snapshot de diagnóstico (melhor esforço)
test/supabase_auth.test.mjs:23,77      JSON.parse do corpo
```

Nenhum engole erro de **asserção**: são pontos em que "não deu para ler/limpar" não muda o veredito do teste.
Trocar por `assert` ali criaria falha falsa (ex.: corpo não-JSON é resposta legítima em vários casos). **Registrado,
não corrigido.**

### (i) Teste gravando em arquivo versionado — **regra cumprida; provado por hash, não por leitura**

A pasta `test/ui-shots/` **é versionada** (`git ls-files` lista `test/ui-shots/01_home.png`…), então o risco era real.

- `test/canvas_panel_ui.test.mjs:42` chama `shotsDir()` — o helper de `test/support/shots.mjs` grava **fora do
  repositório** (por padrão em pasta temporária do sistema; `PIPPIT_UI_SHOTS_DIR` só troca a pasta, nunca para dentro do repo).
- `test/avatar_gallery_ui.test.mjs:38-40` gera o png da fixture em `os.tmpdir()` e apaga no mesmo teste.
- `test/no_versioned_writes.test.mjs` (na suíte, nome `no_versioned_writes`) cobra a regra em três frentes: helper
  grava fora do repo, nenhum teste monta à mão caminho para `test/ui-shots`, e uma captura real deixa os arquivos
  versionados byte a byte iguais.
- Prova empírica desta rodada: sha256 dos **659 arquivos versionados** antes e depois da suíte completa →
  **0 diferenças** (ver seção 3).

**Nada a corrigir** — e a regra r10 tem guarda automático.

### (i.1) Achado fora da lista: `e2e_live` grava dentro do repositório

```
test/e2e_live.test.mjs:11  const dataDir = process.env.E2E_LIVE_DATA || path.join(here,'..','..','captures','e2e_live','data');
                           const reportFile = path.join(dataDir,'..','e2e_live_report.json');
test/e2e_live.test.mjs:20  fs.rmSync(...); fs.mkdirSync(dataDir, ...)
```

Grava em `captures/e2e_live/` (dentro do repo) o relatório e os dados da execução. Não é arquivo **versionado**
(`captures/` está no `.gitignore` e nada ali é rastreado), então a regra r10 não é violada — mas o diretório fica com
sobras depois do teste. O teste é **opcional e fora do `run-all`** (exige Ollama real). **Registrado, não corrigido**:
mexer no formato de evidência de um teste que eu não consigo rodar aqui (sem Ollama) seria chute.

---

## 3. Item 3 da ordem — a suíte e o "arquivo alterado" do `git status`

Suíte completa (`node test/run-all.mjs`, ~231 s):

```
128 passaram, 2 skip explícito, 0 falharam (de 130).
```

Skips: `pageview`, `parity` (os dois dizem o motivo na tela).

**O "1 arquivo alterado não identificado" da r12 não se repetiu.** Prova ativa, não impressão: sha256 de todos os
arquivos versionados tirado **antes** da suíte e **depois** dela.

```
$ git ls-files -z | xargs -0 sha256sum > antes.txt   # 659 arquivos
$ node test/run-all.mjs
$ git ls-files -z | xargs -0 sha256sum > depois.txt
$ diff antes.txt depois.txt | grep -c '^[<>]'
0
$ git status --short
(vazio)
```

Ou seja: nenhum teste alterou arquivo versionado nesta execução. A explicação mais provável do caso da r12 é que o
arquivo era o `browser_probe.test.mjs` recém-criado/editado por mim antes de rodar a suíte (ele estava `??`/`M` por
edição minha, não por execução de teste). Não consigo reproduzir o estado da r12 para confirmar — fica registrado
assim, **sem afirmar causa**.

---

## 4. Conferência dos números dos documentos

| número citado | onde | confere? |
|---|---|---|
| **130 testes** na suíte | `LEIA_PRIMEIRO_NOVA_SESSAO.md:76`, `ENTREGA.md:84`, `STATUS.md` | **sim** — `ALL` em `test/run-all.mjs` tem 130 nomes, 0 duplicados; a suíte reporta "(de 130)" |
| **128/2/2 (130)** no Windows (r12) | `LEIA_PRIMEIRO_NOVA_SESSAO.md:43` | **sim** — bate com o placar que você passou (128 ok / 2 skip / 2 falhas de 130) |
| **128/2/0 (130)** no sandbox | `STATUS.md:3` | **sim** — é o resultado desta rodada também |
| Inventário: **30 implementadas + 53 verificadas = 83/122 = 68,0%**, 19 parciais | `FEATURE_INVENTORY.md:9` | **sim** — recontei as linhas do catálogo: 30 `implementada`, 53 `verificada`, 19 `parcial`, 31 `investigada`, 10 `bloqueada`; 83/122 = 68,03% |
| Manifesto da entrega r12: **657 linhas** | `entrega_12/MANIFESTO_SHA256.csv` | **não confere mais** — o repositório tem **659** arquivos versionados nesta rodada (entraram `browser_probe`, `SHA256SUMS`, `piperline_rodada12_bundle_verify`). O manifesto da r13 é refeito no item 6, então fecha |
| `MANIFEST_SHA256.csv` da raiz: **4265 linhas** | raiz do repo | **desatualizado e fora de escopo** — nasceu no commit de importação `48ca7bb`, não cita `local_reconstruction/` (0 menções a testes) nem tem os tamanhos atuais (`FEATURE_INVENTORY.md` com 54815 bytes lá, 76232 na r12). Não é o manifesto da entrega; **registrado, não corrigido** |

---

## 5. Resumo das decisões

| # | assunto | decisão |
|---|---|---|
| 1 | PowerShell não repassa código de programa nativo | **corrigido** (`ce8693c`) |
| 2 | `import()` de caminho absoluto no `browser_probe` | **corrigido** (`85ebc03`) |
| 3 | dois arquivos da r12 fora do git | **corrigido** (`eb129b4`) |
| 4 | `.pathname` de `import.meta.url` | nada encontrado |
| 5 | `/tmp` fixo, `set -e`, shebang em executável falso, `bash -c` | legítimos no contexto — registrados |
| 6 | `0600` como premissa | já desligado no Windows com motivo |
| 7 | `catch {}` vazio (11) | parse/limpeza/aborto — registrados |
| 8 | teste gravando em arquivo versionado | regra cumprida e provada por hash (0 de 659) |
| 9 | `e2e_live` deixando sobras em `captures/` | registrado (opcional, fora da suíte, exige Ollama) |
| 10 | `MANIFEST_SHA256.csv` da raiz desatualizado | registrado (artefato da importação) |
| 11 | manifesto da entrega com 657 contra 659 arquivos | refeito no pacote da r13 |
