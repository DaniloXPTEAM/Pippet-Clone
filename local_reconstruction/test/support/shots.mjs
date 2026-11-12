// Rodada 10, item 4 — capturas de tela FORA da árvore versionada.
// Regra nova: teste não altera arquivo versionado (png, ui-shots). Antes, onze testes de interface
// gravavam em test/ui-shots/*.png (arquivos do repositório) e cada execução da suíte deixava o
// `git status` sujo — e o teste da marca d'água chegou a sobrescrever o png versionado.
// As capturas agora vão para uma pasta temporária; PIPPIT_UI_SHOTS_DIR escolhe outra pasta quando
// alguém quiser guardar as imagens como evidência (por exemplo um caminho dentro de mesa_de_operacao).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function shotsDir(...sub) {
  const base = process.env.PIPPIT_UI_SHOTS_DIR || path.join(os.tmpdir(), 'piperline-ui-shots');
  const dir = path.join(base, ...sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Caminho de um arquivo de captura. Mantém o nome que o teste já usava (95_avatar_gallery.png etc.),
// só muda a pasta onde ele é gravado.
export const shotPath = (file, ...sub) => path.join(shotsDir(...sub), file);
