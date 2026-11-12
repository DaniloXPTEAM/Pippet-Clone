// Rodada 8 · item 3 — o guia do usuário no Windows: existe, aponta para 127.0.0.1, ensina as
// variáveis sem mostrar valor, lista os provedores gratuitos e termina com o que ainda não funciona.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../..');
const file = path.join(repo, 'PASSO_A_PASSO_USUARIO.md');
assert.ok(fs.existsSync(file), 'PASSO_A_PASSO_USUARIO.md existe na raiz');
const doc = fs.readFileSync(file, 'utf8');

// 1. instalar e iniciar no Windows
for (const t of ['Windows', 'nodejs.org', 'git-scm.com', 'winget install Gyan.FFmpeg']) assert.ok(doc.includes(t), `o guia cita ${t}`);
assert.match(doc, /node local_reconstruction\\app\\server\.mjs/, 'mostra o comando de iniciar (Windows)');
assert.ok(doc.includes('http://127.0.0.1:5180'), 'manda abrir 127.0.0.1:5180');
assert.ok(!/https?:\/\/localhost|localhost:\d/.test(doc), 'nenhum endereço usa localhost');
assert.match(doc, /nunca `?localhost`?/i, 'explica a regra do 127.0.0.1');

// 2. credenciais só pelo ambiente ou .env ignorado
assert.ok(doc.includes('.env.example') && doc.includes('.env'));
assert.match(doc, /gitignore/i);
for (const n of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FREELLMAPI_API_KEY', 'OMNIROUTER_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'NOVAI_API_KEY', 'NVIDIA_API_KEY', 'HF_TOKEN']) assert.ok(doc.includes(n), `o guia lista ${n}`);
assert.match(doc, /\$env:SUPABASE_URL/, 'mostra como definir no PowerShell');
assert.ok(!/\b(?:sk|hf|eyJ)[-_A-Za-z0-9]{12,}\b/.test(doc), 'o guia não tem nenhum valor de chave');
const example = fs.readFileSync(path.join(repo, '.env.example'), 'utf8');
const exampleNames = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
for (const n of exampleNames) assert.ok(doc.includes(n), `todo nome do .env.example aparece no guia: ${n}`);

// 3. Supabase: URL de retorno e confirmação de e-mail
assert.ok(doc.includes('http://127.0.0.1:5180/auth/callback'), 'ensina a Redirect URL do Supabase');
assert.match(doc, /confirme seu e-mail/i);
assert.match(doc, /PKCE/);

// 4. provedores gratuitos descobertos
for (const p of ['FreeLLMAPI', 'Omni Router', 'NVIDIA NIM', 'NovAI', 'Cloudflare Workers AI', 'Gemini API', 'Ollama', 'Hugging Face']) assert.ok(doc.includes(p), `o guia cita o provedor ${p}`);
assert.match(doc, /presente\/ausente/);

// 5. lista honesta do que não funciona
const tail = doc.slice(doc.indexOf('O que ainda NÃO funciona'));
assert.ok(tail.length > 200, 'a seção final existe e é substancial');
for (const gap of ['Publicar', 'Cobrança', 'Clonagem de voz', 'UNOBSERVED', 'bloquead']) assert.ok(tail.includes(gap), `a lista honesta inclui "${gap}"`);
console.log('passo_a_passo: OK');
