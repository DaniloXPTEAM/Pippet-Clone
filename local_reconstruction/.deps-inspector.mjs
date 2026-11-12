import { browserAvailability } from "file:///home/user/Pippet-Clone/local_reconstruction/test/support/browser.mjs";
const a = browserAvailability(); const b = browserAvailability();
console.log('RESULTADO ' + JSON.stringify({ ...a, mesmaResposta: a === b }));