import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json'); const { chromium } = require('playwright-core');
process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-drw-'));
const { server } = await import('../local_reconstruction/app/server.mjs'); await new Promise((r) => server.listen(5253, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); const p = await (await b.newContext({ viewport: { width: 1783, height: 985 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:5253/#/home'); await p.waitForSelector('.skill[data-s=video-de-avatar]'); await p.click('.skill[data-s=video-de-avatar]'); await p.waitForSelector('#avdrawer .avd'); await p.waitForTimeout(500); await p.screenshot({ path: 'C:/w/PiperLine/captures/fidelity/avatar_drawer.png' }); console.log('errs', errs);
await b.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
