# ENTREGA — RODADA 9 · falhas no Windows

**Data:** 2026-11-09 · **Branch:** `arena/a14d8a49-pippet-clone` (sem push) · **Suíte:** **125 passaram, 2 skip explícito, 0 falharam (de 127)**
**Nenhuma chave ou segredo** entrou em arquivo, commit, log, tela, API ou neste relatório. Nada foi enviado ao GitHub.
**Não há declaração de equivalência com o Pippit**: o que está aqui é o clone local, com o que foi medido e testado nesta máquina.

## Ponto de partida relatado (Windows)

A sua execução da suíte no Windows deu **119 ok, 2 skip, 5 falhas de 126**. As cinco falhas foram estas quatro causas (uma delas aparecia em dois arquivos de teste):

| # | Teste | Sintoma no Windows | Causa encontrada no código |
|---|---|---|---|
| 1 | `watermark_export` | exportação com marca d'água de texto devolvia HTTP 500 | `fontfile='C:/Windows/Fonts/arialbd.ttf'` entrou **sem escape** no filtro `drawtext`; o ffmpeg lê `:` como separador de opção → *Error parsing filterchain* |
| 2 | `auth_structure` (linha 29) | `mode & 0o777` não era `0o600` | no Windows não existem bits POSIX: `chmod` é no-op e o arquivo herda a ACL da pasta |
| 3 | `node_generation_route`, `cloudflare_routes` | esperavam **409** (sem voz) e recebiam **200** | no Windows o SAPI existe, então `ttsAvailable()` é `true` e o nó de Áudio sintetiza |
| 4 | `free_router_ui` | ~4 de 5 execuções falhavam com `#freeSend` **“element is not stable”** e depois **“detached from the DOM”** | `route_()` era `async` e cada `hashchange` disparava **outra execução em paralelo**; todas terminavam reescrevendo `#main`, e uma execução antiga podia pintar por cima da nova no meio do clique |

## O que foi feito — quatro itens, um commit cada, cada um com teste

**Item 1 — `7d42921` · escape do caminho de fonte no `drawtext`.**
`app/lib/watermark.mjs` ganhou `escapeFilterPath()`, aplicado **só ao `fontfile`** (o texto já era escapado por `escFilter`): `:` → `\:`, e também barra invertida e aspas, para caminhos escritos como `C:\Windows\Fonts\arialbd.ttf`. `buildWatermarkFilter()` recebeu o parâmetro opcional `fontExists`, para o teste provar o caminho do Windows sem tocar no disco do outro sistema.
**Prova (> só comparar string):** o ffmpeg **de verdade** aceita o filtro escapado e gera o PNG; o **mesmo** caminho sem escape é recusado com o erro do seu relato (`Error parsing filterchain` / `No option name`). O caso Linux (caminho POSIX) continua idêntico, com e sem verificação.
Teste: `test/watermark_export.test.mjs`, seção 6.

**Item 2 — `0134ff2` · `0600` não é exigível no Windows.**
`app/lib/auth.mjs` expõe `secretModeEnforced(platform)`, que devolve `false` no `win32`. `test/auth_structure.test.mjs` pula **só essa asserção** com a mensagem `[SKIP] auth_structure: modo 0600 do auth-secret não é verificável no Windows (não há permissão POSIX; a proteção depende da pasta do usuário)` — o resto do teste continua rodando (o skip é parcial de propósito: marcar o arquivo inteiro como pulado esconderia as outras verificações). Dentro do teste, `process.platform` é trocado para `win32` e restaurado, provando o caminho que roda no seu Windows.
`LOGIN_ESTRUTURA.md` passou a dizer, com todas as letras: no Linux/macOS o segredo é `0600`; **no Windows a proteção depende da pasta do usuário** (perfil), não do modo do arquivo.

**Item 3 — `e4f0518` · “sem voz local” determinístico em qualquer sistema.**
`app/lib/media.mjs` ganhou `ttsForcedOff()` e `ttsAvailable()` passou a respeitar **`PIPPIT_TTS=off`** (aceita também `0`/`false`/`no`). Nada liga a voz à força: a flag só **desliga**, para o teste poder exigir 409 sem depender do SO. Os dois testes definem a variável antes de importar o servidor e **conferem por `/api/tts-voices` que `available=false`** — ou seja, provam que a flag valeu, em vez de confiar nela. `PIPPIT_TTS` foi documentado em `.env.example` (vazio) e em `PASSO_A_PASSO_USUARIO.md` (o teste `passo_a_passo` exige que todo nome do `.env.example` apareça no guia).
Testes: `node_generation_route`, `cloudflare_routes`, `passo_a_passo`, `env_file`.

**Item 4 — `b7e25ec` · correção na origem do roteador (não no teste).**
Em `app/public/app.js`: `routeTarget()` separa o cálculo da rota; `route_()` (chamada explícita: renomear projeto, trocar plano, …) e `onHashChange()` passam por `runRoute()`, que mantém **uma execução por vez** e **agrupa** os pedidos que chegam no meio. Se o hash mudou durante os `await`, a execução obsoleta **não desenha** (contador `skipped`). Pedido vindo de `hashchange` só redesenha se o alvo mudou de fato; pedido explícito redesenha sempre. `window.__piperlineRoute` e `document.body.dataset.homeRenders` expõem os contadores ao teste.
**Antes x depois, medido no mesmo navegador** (`comparacao_roteador_antes_depois.txt`): com o código anterior, uma rajada `/help → /pricing → /home` deixou **3 execuções simultâneas** (`maxConcurrent=3`) e desenhou a Home **4 vezes**; agora há `maxConcurrent=1`, **2** renderizações e as rotas intermediárias não chegam a pintar.
Durante este item apareceu uma regressão de `auth_ui` (rota de login): o pedido de hashchange chegava sem “força” e não era registrado como pendente, deixando `#main` vazio. Foi corrigida **antes do commit** com a separação `routePending` / `routePendingForce`; `auth_ui` voltou a passar.

## Suíte completa

`suite_rodada9_final.txt` (execução desta árvore, com navegador):

```
125 passaram, 2 skip explícito, 0 falharam (de 127).
```

Os 2 skips são os mesmos de sempre e são explícitos, não falhas: `pageview` e `parity` (evidências do Pippit que **não fazem parte deste checkout**). O total subiu de 126 para 127 porque entrou o teste novo `route_single_render`.

A suíte foi executada **duas vezes** sobre a mesma árvore (a segunda depois do segundo reset do sandbox, arquivos conferidos byte a byte por `diff`): **125/2/0 nas duas**. O log entregue é o da segunda execução, com a primeira anotada no cabeçalho.

**Item 4 — `free_router_ui` em execuções seguidas: 20 no total (10 + 10), 20 ok, 0 falhas** (`free_router_ui_10x.txt`), e `route_single_render` **5/5** (`route_single_render_5x.txt`). Antes da correção, no seu Windows, eram **~4 de 5 falhando**.

## O que NÃO consegui provar aqui — leia antes de considerar fechado

1. **Não rodei em Windows.** Tudo foi executado e medido em Linux (este sandbox). Os quatro consertos são específicos de Windows e foram provados por **simulação controlada**: caminho com `C:` real passado ao ffmpeg (diretório chamado `C:` criado no POSIX), `process.platform` trocado para `win32` dentro do teste, e a flag `PIPPIT_TTS=off`. **A confirmação final é a sua suíte no Windows** — é ela que fecha a rodada.
2. **A instabilidade do `free_router_ui` era de temporização.** Corrigi a corrida que a causava e ela não reapareceu em 10 execuções seguidas aqui, mas **não tenho como reproduzir o timing do seu Windows**; se ela voltar, o sintoma agora vem acompanhado de `window.__piperlineRoute` (dá para ler `maxConcurrent`/`skipped` pelo console do navegador).
3. **SAPI:** o ramo “voz local existe” continua sem teste automático — este ambiente não tem SAPI. O teste apenas garante que a regra “sem voz local → 409” vale sempre que a voz estiver desligada.
4. **`talkingphoto_ui`**: segue com a instabilidade já registrada na rodada 8 (prévia local às vezes 4,72 s em vez de ~3,0 s); passou nesta execução, mas não é um item desta rodada.

## Estado do repositório

O sandbox **apagou o `.git` de novo** (o repositório voltou ao clone do GitHub, HEAD `48ca7bb`) e levou os commits das rodadas 6, 7 e 8. Aconteceu **duas vezes nesta sessão**: na segunda, os commits desta própria rodada também se perderam e foram **recriados a partir da árvore intacta** (os hashes abaixo são os finais). A árvore de trabalho está intacta, e por isso os commits desta rodada são:

- `84b8dd0` — **commit de recuperação**: o estado completo das rodadas 1–8, para cada item abaixo ter diff limpo;
- `7d42921` — item 1 (marca d'água);
- `0134ff2` — item 2 (`0600` no Windows);
- `e4f0518` — item 3 (`PIPPIT_TTS=off`);
- `b7e25ec` — item 4 (roteador).

**Nenhum push.** Bundle desta rodada: `piperline_rodada9.bundle` (ao lado deste arquivo, no Drive).

## Arquivos desta pasta

| Arquivo | Conteúdo |
|---|---|
| `ENTREGA.md` | este relatório |
| `suite_rodada9_final.txt` | suíte completa da árvore final (125/2/0 de 127) |
| `testes_itens_r9.txt` | saída dos testes tocados por esta rodada |
| `free_router_ui_10x.txt` | as 10 execuções seguidas do item 4 |
| `route_single_render_5x.txt` | as 5 execuções do teste novo do roteador |
| `comparacao_roteador_antes_depois.txt` | medição do roteador antes e depois da correção |

## Como reproduzir no Windows

```powershell
# na pasta do projeto
node local_reconstruction\test\run-all.mjs                 # suíte completa
node local_reconstruction\test\watermark_export.test.mjs   # item 1
node local_reconstruction\test\auth_structure.test.mjs     # item 2 (mostra o [SKIP] do 0600)
node local_reconstruction\test\route_single_render.test.mjs # item 4
# item 4, dez vezes seguidas:
1..10 | ForEach-Object { node local_reconstruction\test\free_router_ui.test.mjs }
```
