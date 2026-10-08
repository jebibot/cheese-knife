import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPackage, resolveFile } from './check-package.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function build(directory = sourceRoot, output = path.join(directory, 'dist')) {
  const root = await fs.realpath(directory);
  const target = path.resolve(output);
  if (target !== path.join(root, 'dist')) throw new Error('Build target must be this repository dist directory');
  const source = await checkPackage(root);
  let stat;
  try { stat = await fs.lstat(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (stat?.isSymbolicLink()) throw new Error('Refusing a symlink dist target');
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target);
  await fs.copyFile(path.join(root, 'manifest.json'), path.join(target, 'manifest.json'));
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:html|js|css|png)$/.test(entry.name)) {
      await fs.copyFile(path.join(root, entry.name), path.join(target, entry.name));
    }
  }
  for (const folder of ['web', 'styles', '_locales']) {
    try {
      await fs.cp(path.join(root, folder), path.join(target, folder), {
        recursive: true,
        filter: async name => (await fs.lstat(name)).isDirectory() || /\.(?:js|css|json)$/.test(name),
      });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  const vendorFiles = new Set((manifest.content_scripts || []).flatMap(script => script.js || []).filter(file => file.startsWith('vendor/')));
  if (vendorFiles.size) vendorFiles.add('vendor/hls.js.LICENSE');
  for (const file of vendorFiles) {
    const dest = resolveFile(target, file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(resolveFile(root, file), dest);
  }
  await fs.copyFile(path.join(root, 'LICENSE'), path.join(target, 'LICENSE')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await fs.copyFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(target, 'THIRD_PARTY_NOTICES.md')).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await checkPackage(target, source.version);
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${await build()}`);
}
