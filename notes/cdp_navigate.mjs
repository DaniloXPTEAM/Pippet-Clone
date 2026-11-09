// Navega a aba existente do Chrome (CDP) para uma URL. Somente navegacao (leitura); nao clica em nada.
const [target, url] = process.argv.slice(2);
const ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${target}`);
ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } }));
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) { console.log(JSON.stringify(d.result || d.error)); ws.close(); } };
ws.onerror = (e) => { console.log('erro', e.message); process.exit(1); };
