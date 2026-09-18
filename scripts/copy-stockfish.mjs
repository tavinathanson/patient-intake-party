// Copies the pinned Stockfish lite single-threaded build into public/stockfish/
// so the worker script and its .wasm are served side by side under stable names.
// Copying.txt (GPLv3) ships with the engine binaries.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = dirname(require.resolve('stockfish/package.json'));
const outDir = join(root, 'public', 'stockfish');
const base = 'stockfish-19-lite-single';

mkdirSync(outDir, { recursive: true });
for (const ext of ['.js', '.wasm']) {
  copyFileSync(join(pkgDir, 'bin', base + ext), join(outDir, base + ext));
}
copyFileSync(join(pkgDir, 'Copying.txt'), join(outDir, 'Copying.txt'));
console.log(`copied ${base}.{js,wasm} + Copying.txt -> public/stockfish/`);
