const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cheese-package-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'web'));
  await fs.mkdir(path.join(root, 'vendor'));
  const manifest = { manifest_version: 3, version: '2.13.1', content_scripts: [
    { matches: ['https://chzzk.naver.com/*'], js: ['web/inject.js', 'vendor/hls.light.private.js'] },
  ] };
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ version: '2.13.1' }));
  await fs.writeFile(path.join(root, 'web/inject.js'), '// fixture script');
  await fs.writeFile(path.join(root, 'vendor/hls.light.private.js'), '// fixture vendor');
  await fs.writeFile(path.join(root, 'vendor/hls.js.LICENSE'), 'fixture license');
  return root;
}

test('portable build contains referenced vendor and its license but not backups', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'web/inject.js.bak'), 'must not ship');
  const { build } = await import(pathToFileURL(path.resolve('scripts/build.mjs')));
  await build(root, path.join(root, 'dist'));
  assert.equal(await fs.readFile(path.join(root, 'dist/vendor/hls.light.private.js'), 'utf8'), '// fixture vendor');
  assert.equal(await fs.readFile(path.join(root, 'dist/vendor/hls.js.LICENSE'), 'utf8'), 'fixture license');
  await assert.rejects(fs.access(path.join(root, 'dist/web/inject.js.bak')));
});

test('package check rejects a missing manifest-referenced script', async t => {
  const root = await fixture(t);
  await fs.rm(path.join(root, 'web/inject.js'));
  const { checkPackage } = await import(pathToFileURL(path.resolve('scripts/check-package.mjs')));
  await assert.rejects(checkPackage(root), /web\/inject.js/);
});

test('build refuses a target outside its repository dist directory', async t => {
  const root = await fixture(t);
  const { build } = await import(pathToFileURL(path.resolve('scripts/build.mjs')));
  await assert.rejects(build(root, path.dirname(root)), /dist/);
});
