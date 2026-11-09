// Tira screenshots do app LOCAL (porta 5250, dados temporários) para comparar com as capturas do Pippit. Uso: node local_shots.mjs <saida-dir> <hash1,hash2,...>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
const OUT = process.argv[2]; const routes = (process.argv[3] || '/').split(','); fs.mkdirSync(OUT, { recursive: true });
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-shots-'));
const { server } = await import('../local_reconstruction/app/server.mjs'); await new Promise((r) => server.listen(5250, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const p = await (await b.newContext({ viewport: { width: 1920, height: 912 } })).newPage();
for (const r of routes) { await p.goto('http://127.0.0.1:5250/#' + r); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${r.replace(/[^\w]+/g, '_') || 'home'}.png` }); console.log('ok', r); }
await b.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
