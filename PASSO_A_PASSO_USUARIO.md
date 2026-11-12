# Passo a passo — rodar o PiperLine no Windows

Guia para quem vai **usar** a reconstrução: instalar, ligar o servidor, abrir no navegador, colocar as credenciais e entender o que já funciona. Escrito em 09/11/2026 (rodada 8).

> Regra de ouro do projeto: **sempre `127.0.0.1`, nunca `localhost`**. Em Windows, `localhost` pode resolver para IPv6 (`::1`) e travar chamadas locais (Omni Router, FreeLLMAPI, o próprio servidor). Todo endereço deste guia já usa `127.0.0.1`.

---

## 1. O que instalar (uma vez)

| Programa | Para quê | Como instalar |
|---|---|---|
| **Node.js LTS 22 ou 24** | roda o servidor e os testes | site oficial `nodejs.org` (instalador `.msi`, marque “Add to PATH”) — confira com `node -v` |
| **Git para Windows** | baixar o código e ver o histórico | `git-scm.com` (inclui o Git Bash, útil para scripts `.sh`) |
| **ffmpeg** (opcional, mas recomendado) | exportar MP4, cortar/velocidade, marca d'água, silêncio | `winget install Gyan.FFmpeg` — confira com `ffmpeg -version` |

O servidor **não tem dependências de npm**: `node local_reconstruction/app/server.mjs` roda com o Node puro. Só os **testes de navegador** precisam de Chromium (seção 8) e só a **exportação** precisa de ffmpeg.

## 2. Pegar o código

O trabalho da rodada 8 está nos commits locais e **não foi enviado ao GitHub** (combinação do projeto: nada de push). Use o pacote entregue no Drive:

1. baixe da pasta **`entrega_8`** do Drive o arquivo **`piperline_rodada8.bundle`**;
2. no PowerShell, na pasta onde quer o projeto:

```powershell
git clone piperline_rodada8.bundle piperline
cd piperline
git checkout arena/a14d8a49-pippet-clone
git log --oneline -3
```

Deve aparecer no topo o commit da rodada 8 (item 2 ou posterior). Se preferir clonar do GitHub (`https://github.com/DaniloXPTEAM/Pippet-Clone.git`), o repositório remoto contém **apenas o ponto de partida** — as rodadas 7 e 8 estão só no bundle/Drive.

## 3. Credenciais: ambiente **ou** arquivo `.env` (nunca no Git)

O `.env` está no `.gitignore`; o `.env.example` da raiz lista **somente os nomes**. Nenhuma chave deve ser colada em documento, print, relatório ou commit.

### Opção A — arquivo `.env` (mais simples no Windows)

```powershell
Copy-Item .env.example .env
notepad .env
```

Preencha só as linhas que você tem, salve como **UTF-8 sem BOM**, e pronto: o servidor lê o `.env` na inicialização. Variável já definida no ambiente **tem prioridade** sobre o arquivo.

### Opção B — variáveis de sessão do PowerShell

```powershell
$env:SUPABASE_URL       = "https://SEU-PROJETO.supabase.co"
$env:SUPABASE_ANON_KEY  = "chave-publica-do-projeto"
$env:FREELLMAPI_API_KEY = "..."
$env:OMNIROUTER_API_KEY = "..."
$env:CLOUDFLARE_ACCOUNT_ID = "..."
$env:CLOUDFLARE_API_TOKEN  = "..."
$env:NOVAI_API_KEY      = "..."
$env:NVIDIA_API_KEY     = "..."
$env:HF_TOKEN           = "..."
```

Isso vale só para a janela atual. Para fixar: `setx NOME "valor"` (e abrir um PowerShell novo). **Atenção:** `setx` grava no registro do usuário — use só na sua máquina.

> O nome correto da NovAI no código é **`NOVAI_API_KEY`** (o pedido original escrevia `NOvAI_API_KEY`; a variável é maiúscula).

Nomes aceitos pelo app: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FREELLMAPI_API_KEY`, `OMNIROUTER_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `NOVAI_API_KEY`, `NVIDIA_API_KEY`, `GEMINI_API_KEY`, `HF_TOKEN`, `OLLAMA_API_KEY` (opcional).

> **`PIPPIT_TTS`** não é chave: é o interruptor da voz local do Windows (SAPI). Deixe vazio para o app usar a voz do sistema quando ela existir; `PIPPIT_TTS=off` faz o nó de Áudio tratar a máquina como "sem voz local" (a suíte de testes usa isso para que a regra seja igual em qualquer Windows/Linux).

## 4. Ligar o servidor e abrir

```powershell
cd piperline
node local_reconstruction\app\server.mjs
```

Abra **http://127.0.0.1:5180** no navegador. Para outra porta: `$env:PORT = "5190"` antes de iniciar (e use `http://127.0.0.1:5190`).

- Dados ficam em `local_reconstruction\data\` (`db.json` + ativos). Para começar do zero: `POST /api/reset` ou apagar a pasta com o servidor parado.
- O **login não é exigido por padrão** (instalação de usuário único, como antes).

## 5. Login

### 5.1 Local (padrão, sem configurar nada)

1. Configurações → **Login e gerenciamento** → *Definir* uma senha (opcional).
2. Marque **Exigir login nas rotas da API** se quiser a tela de entrada.
3. Saia e entre pela tela `#/login`.

### 5.2 Supabase (login real, com e-mail e Google)

1. No painel do Supabase: **Authentication → Providers** → ligue **Email** (já vem ligado) e **Google** (precisa de Client ID/Secret do Google Cloud).
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://127.0.0.1:5180`
   - **Redirect URLs**: `http://127.0.0.1:5180/auth/callback`
   
   Sem isso o GoTrue recusa o retorno do OAuth. Se mudar a porta, use `PIPERLINE_PUBLIC_ORIGIN=http://127.0.0.1:NOVA_PORTA`.
3. Defina `SUPABASE_URL` e `SUPABASE_ANON_KEY` (seção 3) e reinicie o servidor.
4. Configurações → Login e gerenciamento → adaptador **Supabase (GoTrue)** → *Aplicar*.
5. Tela de entrada: **Entrar** (e-mail/senha), **Criar conta** e **Continuar com o Google**.
   - Se o projeto exige confirmação de e-mail (padrão), depois de criar a conta aparece **“✉️ confirme seu e-mail antes de entrar”** — clique no link recebido e só então entre.
   - O botão do Google fica **desligado com o motivo escrito** enquanto `/auth/v1/settings` não disser que o provedor está ligado.

Como o login funciona por dentro: sessão em cookie `HttpOnly`; os tokens do Supabase ficam **cifrados no servidor** (chave em `local_reconstruction\data\auth-secret`) e nunca aparecem em tela, log ou resposta de API. O OAuth usa **PKCE (S256)** e o `code_verifier` fica no servidor, de uso único.

## 6. Provedores gratuitos que já foram descobertos e ligados pela tela

Todos entram em **Configurações → Assistente de IA** e só aparecem como **presente/ausente** (a tela nunca mostra a chave). A pilha se aplica por tipo de tarefa (texto, imagem, voz, vídeo, transcrição).

| Provedor | Variável(is) | O que faz de graça | Observações |
|---|---|---|---|
| **FreeLLMAPI** (serviço seu, `127.0.0.1:3001`) | `FREELLMAPI_API_KEY` | texto principal (modelo `auto`) | precisa do serviço rodando na sua máquina |
| **Omni Router** (serviço seu, `127.0.0.1:20128`) | `OMNIROUTER_API_KEY` | texto e imagem (`flux.2-klein-4b`) | idem; nunca use `localhost` |
| **NVIDIA NIM** | `NVIDIA_API_KEY` | texto (`gemma-4-31b-it`) | cota gratuita por conta |
| **NovAI (aiapi-pro)** | `NOVAI_API_KEY` | **vídeo `cogvideox-flash` 5 s**, imagem `cogview-3-flash`, texto `glm-4.7-flash` | vídeo é assíncrono (~72 s medidos), limite local de 5/dia |
| **Cloudflare Workers AI** | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | imagem `flux-1-schnell`, voz `melotts`, **transcrição `whisper`** | é o que liga legendas automáticas e corte por transcrição |
| **Gemini API** | `GEMINI_API_KEY` | texto `gemini-2.5-flash` | reserva |
| **Ollama** (local) | opcional `OLLAMA_API_KEY` | texto local | `http://127.0.0.1:11434` |
| **Hugging Face Space** (lip-sync) | `HF_TOKEN` (opcional) | lip-sync em Space público (SadTalker/Hallo2/Wav2Lip) | lento (≥ 300 s), cota melhor com token |
| **Executor local** (lip-sync) | — | Wav2Lip/LivePortrait na sua GPU | precisa do comando configurado; o app não baixa modelo |

Depois de preencher as variáveis, reinicie o servidor e use **Testar** em cada provedor (o de vídeo gasta 1 das 5 gerações do dia e pede confirmação antes).

## 7. O que fazer primeiro (roteiro curto)

1. Abra `http://127.0.0.1:5180` → **Criar** um projeto.
2. Configurações → Assistente de IA → confira os provedores **presentes** e aplique a **pilha gratuita**.
3. Gere uma imagem (Cloudflare ou Omni) e um vídeo de 5 s (NovAI) — o vídeo entra na fila e aparece em Ativos quando termina.
4. Editor: corte, velocidade, texto/legenda manual e **exportar MP4** (usa ffmpeg).
5. Legendas automáticas: precisa da Cloudflare (whisper) — sem ela o botão explica o motivo e não finge gerar.

## 8. Testes (opcional, para quem quer conferir)

```powershell
node local_reconstruction\test\run-all.mjs
```

- A suíte tem ~125 testes; os de navegador precisam de Chromium. No Windows, o caminho mais fácil é rodar pelo **Git Bash/WSL** com `./local_reconstruction/recuperar_ambiente.sh` (ele baixa Chromium/ffmpeg fora da árvore e roda tudo). Sem Chromium, esses testes são **pulados explicitamente** (não falham).
- Nenhum teste chama a internet: os provedores e o Supabase são **servidores falsos em 127.0.0.1**.

## 9. O que ainda NÃO funciona (e por quê)

| O que | Estado | Por quê |
|---|---|---|
| Gerar vídeo/imagem/voz sem provedor | **bloqueado com motivo** | a reconstrução não inventa resultado de IA; a geração só existe com um provedor presente |
| Login Google/TikTok | depende do projeto | o app já fala PKCE com o GoTrue; se o provedor não está ligado no Supabase, o botão fica desligado e a tela diz o motivo |
| Publicar em TikTok/Instagram/Facebook/YouTube | **estrutura** (fila e contrato prontos) | exige app aprovado em cada rede + OAuth real; `/api/social/connect` responde 501 e nada é publicado |
| Cobrança/assinatura | **estrutura** | gateway desabilitado: checkout, webhook e portal respondem 501 e **nada é cobrado** |
| Clonagem de voz | **bloqueada** | nenhuma captura do fluxo original; não foi reproduzida |
| Omni / humano digital (endpoints `text_to_speech`, `try_task`…) | **UNOBSERVED** | só os nomes dos endpoints foram vistos nos bundles; corpos e telas não |
| Templates de marketing | 8 nomes de 10 | imagens, textos pré-preenchidos e o efeito de “Gerar” não foram capturados |
| Tradução da interface | parcial | o catálogo de idiomas foi observado; as traduções não |
| Login “vincular conta” Google/TikTok a uma conta existente | não existe | só entrar com o provedor; vincular/desvincular não foi observado |

Tudo isso também está em `FEATURE_INVENTORY.md` (linha a linha, com arquivo e teste) e `STATUS.md` (resumo da rodada).
