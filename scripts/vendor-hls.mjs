// Mechanical vendoring of the official locked distribution; no runtime CDN.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dependency = path.join(root, 'node_modules/hls.js');
const metadata = JSON.parse(await fs.readFile(path.join(dependency, 'package.json'), 'utf8'));
if (metadata.version !== '1.6.16') throw new Error('Expected the reviewed HLS.js version 1.6.16');
const original = await fs.readFile(path.join(dependency, 'dist/hls.light.min.js'), 'utf8');
const sha256 = crypto.createHash('sha256').update(original).digest('hex');
const wrapped = `// HLS.js ${metadata.version}, Apache-2.0. Official npm dist SHA-256: ${sha256}\n` +
  `(() => { const runtime = window[Symbol.for('cheese-knife.runtime.v1')]; if (!runtime || runtime.Hls) return; const module = { exports: {} }; const exports = module.exports;\n` +
  original.replace(/\/\/# sourceMappingURL=[^\r\n]+/g, '') +
  `\nruntime.Hls = module.exports; })();\n`;
await fs.mkdir(path.join(root, 'vendor'), { recursive: true });
await fs.writeFile(path.join(root, 'vendor/hls.light.private.js'), wrapped);
await fs.copyFile(path.join(dependency, 'LICENSE'), path.join(root, 'vendor/hls.js.LICENSE'));
console.log(JSON.stringify({ version: metadata.version, sha256, wrapper: 'local UMD export capture; source-map comment removed' }));
