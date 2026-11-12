// Carregador de `.env` local (ignorado pelo git). Regra da casa: segredo só pelo ambiente —
// este arquivo apenas move nomes/valores do `.env` para `process.env`; nunca imprime valor,
// nunca sobrescreve variável já definida e nunca devolve valores para quem chama.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const DEFAULT_ENV_FILE = path.join(ROOT, '.env');

// Formato aceito: KEY=valor, KEY="valor", export KEY=valor, comentários com #.
// Linhas em branco, sem '=' ou com nome inválido são ignoradas (e contadas em `ignored`).
export function parseEnv(text = '') {
  const out = {};
  const ignored = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) { ignored.push(line.slice(0, 40)); continue; }
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return { values: out, ignored };
}

// Lê o arquivo (padrão: <repo>/.env, ou PIPERLINE_ENV_FILE) e completa o ambiente.
// Devolve só metadados: nomes carregados, nomes preservados (já existiam) e se o arquivo existia.
export function loadEnvFile({ file = process.env.PIPERLINE_ENV_FILE || DEFAULT_ENV_FILE, env = process.env } = {}) {
  const result = { file, found: false, loaded: [], kept: [], ignored: [] };
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return result; }
  result.found = true;
  const parsed = parseEnv(text);
  result.ignored = parsed.ignored;
  for (const [name, value] of Object.entries(parsed.values)) {
    if (env[name] === undefined || env[name] === '') { env[name] = value; result.loaded.push(name); }
    else result.kept.push(name); // ambiente manda: .env não sobrescreve
  }
  return result;
}

// Efeito colateral de importação: como este é o primeiro import do servidor, o `.env` entra
// em `process.env` antes de qualquer outro módulo ler variável de ambiente.
export const ENV_FILE_STATUS = loadEnvFile();
export const envFileSummary = () => ({
  found: ENV_FILE_STATUS.found,
  file: ENV_FILE_STATUS.found ? ENV_FILE_STATUS.file : null,
  loadedCount: ENV_FILE_STATUS.loaded.length,
  keptCount: ENV_FILE_STATUS.kept.length,
  // nomes apenas — nunca valores
  loaded: ENV_FILE_STATUS.loaded,
  kept: ENV_FILE_STATUS.kept,
  note: ENV_FILE_STATUS.found
    ? `${ENV_FILE_STATUS.loaded.length} variável(is) vieram do .env local (ignorado pelo git); o ambiente tem prioridade sobre o arquivo.`
    : 'Nenhum .env local: as credenciais vêm só do ambiente do processo.',
});
