// Avalia uma expressao SOMENTE LEITURA na aba (CDP Runtime.evaluate). Uso: node cdp_eval.mjs <target> "<expressao>"
const [target, expr] = process.argv.slice(2);
const ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${target}`);
ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) { console.log(typeof d.result?.result?.value === 'string' ? d.result.result.value : JSON.stringify(d.result)); ws.close(); } };
