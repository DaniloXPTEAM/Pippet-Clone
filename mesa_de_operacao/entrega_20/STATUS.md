# STATUS — entraga_20 (rodada r20)

Estado da reconstrução Pippit em 12/11/2026, base `8e07b84` + rodada r20 (7 commits sobre a cadeia de 76).

## Regra permanente (LEIA_PRIMEIRO §2)
Neste produto **tudo é gratuito e sem bloqueio** ("igual ao Pippit" = telas/fluxos/funções, não cobrança). Preço/assinatura podem existir apenas em OUTRO produto no futuro.

## Placar da suíte (r20, Linux, sandbox)
`node local_reconstruction/test/run-all.mjs`: **147 passaram / 4 skip explícito / 0 falharam (de 151)**.
Skips nomeados: `pageview`, `parity` (evidência local não incluída no checkout) e `e2e_live`, `llm_live` (Ollama real indisponível — testes opcionais ao vivo incluídos com skip `SKIP <nome>: <motivo>` e exit 0).
Baseline Windows r19 (validado por captura de tela — `VALIDACAO_WINDOWS_R19.md` no Drive): 146/2/0 de 148. **Windows r20 não roda neste sandbox = PENDÊNCIA com caminho** (rodar `node local_reconstruction/test/run-all.mjs` no Windows).

## Réguas (mantidas lado a lado — r20 não promove/rebaixa linhas)
113/122 = 92,6% (38 impl + 75 verif). 152/423 = 35,9% (423|271|67|85|0|0; canal 7 = 94|72|12|10|0|0).

## Estado funcional r20 (pontos que mudaram)
- **Áudio**: envio GERA por padrão (provedor gratuito embutido, falha explícita e explicável); sem provedor = motivo + botão de configuração, **nunca** tela de planos.
- **Vídeo/Imagem**: canvas e geração por modelo direto SEM limite ("Ilimitado"); modelo nomeado sem engine local = motivo claro ("indisponível localmente") + saída; nunca planos/preço.
- **Avatar/Voz**: sem limite de usos ("Ilimitado"); falhas mostram motivo; sem diálogos "recurso Starter"/"Assine o Starter agora".
- **Tela de planos**: sem R$ e sem "Subscribe" ("No momento gratuitamente — em breve", botões desabilitados, plano atual = acesso a tudo); créditos só informativos.
- **Pagamento**: estrutura presente no código e DESLIGADA (fora da UI; gateway 501; checkout local não cobra nem muda plano).
- Varredura comprovada: `mesa_de_operacao/entrega_20/SEM_PAYWALL_R20.md`; teste de prova: `local_reconstruction/test/sem_paywall_ui.test.mjs` (usuário novo gera vídeo (local-ffmpeg), imagem (provedor falso HTTP) e áudio (`PIPPIT_TTS=fake`) sem ver tela de planos; gatilhos de modelo nomeado/avatar mostram motivo, nunca planos).

## Como rodar (recipe resumido; receita completa = LEIA_PRIMEIRO §3)
1. `npm install` em `local_reconstruction/` (remover `package-lock.json` depois).
2. Chromium: `@sparticuz/chromium` em `/home/user/.tools` + extrair executável (ESM: `import()`), `LD_LIBRARY_PATH=/tmp/al2023lib/lib` (al2023.tar.br).
3. ffmpeg/ffprobe: wheel pypi `imageio-ffmpeg` (manylinux x86_64) + `ffprobe-static`.
4. env: `PIPERLINE_CHROMIUM_EXECUTABLE=/tmp/chromium PIPPIT_FFMPEG=... PIPPIT_FFPROBE=...` (nomes exatos em `.env.example`).
5. `node local_reconstruction/test/run-all.mjs` (da raiz do repo).

## Decisões r20 (o que NÃO ficou)
- Preços e paywall observados no Pippit: **só** em `../entrega_19/ADENDO_R19.md` (marcados "observado no original, não reproduzido por decisão do usuário"); o app não os reproduz.
- Conteúdo inventado continua marcado como tal (UNOBSERVED/inventada); nada observado virou "verificada" por ter teste.
