// Rodada 12, item 2 — o SKIP "sem motivo" do Windows vinha da checagem de navegador, não do app.
// O `testable()` antigo dava 5 s para o binário responder `--version`. Num PC carregado (523 MB de RAM
// livre, antivírus e WSL abertos) um Chrome frio pode passar disso, e aí o teste era PULADO com a
// mensagem errada ("faltam dependências/libs"), três candidatos × 5 s depois — que é de onde vinham os
// 14–19 s de SKIP. Aqui se cobra o comportamento novo, em processos separados (o cache é por processo):
//   1) prazo curto demais → NÃO aprovado, com motivo dizendo que foi TEMPO, não biblioteca faltando;
//   2) prazo normal → aprovado, com o caminho e a origem;
//   3) a checagem é feita uma vez só por processo (mesma resposta, mesmo objeto).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_TEST = HERE;
// Rodada 16 item 4: o inspetor é escrito numa pasta TEMPORÁRIA — o teste não pode escrever/apagar
// arquivo versionado (antes ia em `local_reconstruction/.deps-inspector.mjs` e o `git status` ficava sujo).
const fs = await import('node:fs');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pippet-browser-probe-'));
const inspector = path.join(tmpDir, '.deps-inspector.mjs');

// Pequeno inspetor executado em processo novo: imprime o resultado da checagem em JSON.
// Rodada 13: o import precisa ser URL de arquivo. Com caminho absoluto cru o Windows quebra com
// ERR_UNSUPPORTED_ESM_URL_SCHEME ("C:\\..." não é um esquema suportado); pathToFileURL(...).href resolve
// nos dois sistemas (file:///C:/... no Windows, file:///home/... no Linux).
const especificador = pathToFileURL(path.join(REPO_TEST, 'support/browser.mjs')).href;
const codigo = `import { browserAvailability } from ${JSON.stringify(especificador)};
const a = browserAvailability(); const b = browserAvailability();
console.log('RESULTADO ' + JSON.stringify({ ...a, mesmaResposta: a === b }));`;
fs.writeFileSync(inspector, codigo);

try {
  // sem navegador configurado, descobrimos qual é o de verdade (a mesma resolução que o teste usa)
  const { browserAvailability } = await import('./support/browser.mjs');
  const real = browserAvailability();
  if (!real.ok) { console.log(`SKIP browser_probe: ${real.reason}`); process.exit(0); }

  const rodar = (env) => {
    const r = spawnSync(process.execPath, [inspector], { encoding: 'utf8', cwd: REPO_TEST, env: { ...process.env, ...env } });
    const linha = String(r.stdout || '').split('\n').find((l) => l.startsWith('RESULTADO '));
    assert.ok(linha, `o inspetor não respondeu (código ${r.status}): ${String(r.stderr || '').slice(0, 300)}`);
    return JSON.parse(linha.slice('RESULTADO '.length));
  };

  // 1) prazo de 1 ms: o binário existe e é bom, mas não tem como responder — o motivo precisa dizer TEMPO
  const curto = rodar({ PIPERLINE_BROWSER_PROBE_MS: '1', PIPERLINE_CHROMIUM_EXECUTABLE: real.executablePath });
  assert.equal(curto.ok, false, 'com prazo de 1 ms a checagem não pode aprovar o navegador');
  assert.match(String(curto.reason), /não respondeu em 1 ms/, `o motivo precisa apontar o TEMPO (era o que faltava no SKIP do Windows); veio: ${curto.reason}`);
  assert.match(String(curto.reason), /PIPERLINE_BROWSER_PROBE_MS/, 'o motivo precisa dizer como aumentar o prazo');

  // 2) prazo normal: aprovado, dizendo qual binário e de onde veio
  const normal = rodar({ PIPERLINE_CHROMIUM_EXECUTABLE: real.executablePath });
  assert.equal(normal.ok, true, `com o prazo normal o navegador precisa ser aprovado; veio: ${normal.reason || ''}`);
  assert.equal(normal.executablePath, real.executablePath);
  assert.ok(normal.probeMs >= 0 && normal.probeMs < 20000, `a sondagem precisa caber no prazo (${normal.probeMs} ms)`);
  assert.ok(normal.origem, 'a resposta precisa dizer de onde veio o navegador');

  // 3) uma sondagem por processo: as duas chamadas devolvem o MESMO objeto (cache), não duas execuções
  assert.equal(normal.mesmaResposta, true, 'a checagem precisa ser memorizada (duas chamadas, uma sondagem)');

  // 4) caminho inexistente: motivo diz que não existe, em vez de falar em bibliotecas
  const ausente = rodar({ PIPERLINE_CHROMIUM_EXECUTABLE: path.join(REPO_TEST, 'nao-existe-chrome') });
  assert.equal(ausente.ok, false);
  assert.match(String(ausente.reason), /não existe/, `motivo precisa dizer que o caminho não existe; veio: ${ausente.reason}`);

  console.log('browser_probe.test.mjs: ok (prazo curto é reportado como TEMPO, prazo normal aprova, uma sondagem por processo e caminho ausente explicado)');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
