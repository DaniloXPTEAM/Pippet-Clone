// Screenshot de um projeto LOCAL (tipo canvas ou story) criado via API em dados temporários. Uso: node local_project_shot.mjs <tipo> <saida.png>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const [type, out] = process.argv.slice(2); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-prj-'));
const { server } = await import('../local_reconstruction/app/server.mjs'); await new Promise((r) => server.listen(5252, '127.0.0.1', r));
const p = await (await fetch('http://127.0.0.1:5252/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, title: 'Untitled' }) })).json();
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const pg = await (await b.newContext({ viewport: { width: 1783, height: 985 } })).newPage();
await pg.goto('http://127.0.0.1:5252/#/project/' + p.id); await pg.waitForTimeout(1500); await pg.screenshot({ path: out }); console.log('ok', p.id);
await b.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
