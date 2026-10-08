import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function manifestFiles(manifest) {
  const files = new Set(['manifest.json']);
  const add = file => { if (typeof file === 'string') files.add(file); };
  Object.values(manifest.icons || {}).forEach(add);
  add(manifest.action?.default_popup);
  Object.values(manifest.action?.default_icon || {}).forEach(add);
  add(manifest.background?.service_worker);
  (manifest.background?.scripts || []).forEach(add);
  for (const script of manifest.content_scripts || []) {
    [...script.js || [], ...script.css || []].forEach(add);
  }
  return files;
}

export function resolveFile(root, file) {
  if (typeof file !== 'string' || path.isAbsolute(file) || file.includes('\\')) throw new Error(`Invalid extension path: ${file}`);
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path outside package: ${file}`);
  return resolved;
}

export async function checkPackage(directory, expectedVersion) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.manifest_version !== 3) throw new Error('Expected Manifest V3');
  let project;
  try { project = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const version = expectedVersion || project?.version;
  if (version && manifest.version !== version) throw new Error('Package/manifest version mismatch');
  const files = manifestFiles(manifest);
  for (const file of await fs.readdir(root)) {
    if (file.endsWith('.html')) files.add(file);
  }
  if ([...files].some(file => file.startsWith('vendor/'))) files.add('vendor/hls.js.LICENSE');
  if (manifest.default_locale) files.add(`_locales/${manifest.default_locale}/messages.json`);
  for (const file of files) {
    await fs.access(resolveFile(root, file)).catch(() => { throw new Error(`Missing extension resource: ${file}`); });
    if (file.endsWith('.html')) {
      const html = await fs.readFile(resolveFile(root, file), 'utf8');
      for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/g)) {
        if (/^(?:https?:|#|data:)/.test(match[1])) continue;
        const asset = path.posix.join(path.posix.dirname(file), match[1]);
        await fs.access(resolveFile(root, asset)).catch(() => { throw new Error(`Missing HTML resource: ${asset}`); });
      }
    }
  }
  return { version: manifest.version, resources: files.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkPackage(process.argv[2] || process.cwd());
  console.log(`Package OK: v${result.version}, ${result.resources} entry resources`);
}
