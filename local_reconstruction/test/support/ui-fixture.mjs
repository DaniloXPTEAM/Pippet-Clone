import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function startUiFixture(prefix = 'piperline-ui-') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
  const { server } = await import('../../app/server.mjs');
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    server,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(tmp, { recursive: true, force: true });
    },
  };
}
