// Imprime o texto visível de rotas do app LOCAL (porta 5251). Uso: node local_text.mjs "/smart,/avatars"
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-txt-'));
const { server } = await import('../local_reconstruction/app/server.mjs'); await new Promise((r) => server.listen(5251, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const r of process.argv[2].split(',')) { await p.goto('http://127.0.0.1:5251/#' + r); await p.waitForTimeout(1200); const t = (await p.locator('#main').innerText()).split('\n').map((x) => x.trim()).filter(Boolean); console.log('##', r, JSON.stringify(t).slice(0, 1600)); }
await b.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
