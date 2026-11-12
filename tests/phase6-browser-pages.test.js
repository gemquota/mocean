import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function readPage(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}
function moduleSource(html, name) {
  const start = html.indexOf('<script type="module">');
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, name + ' has a module script');
  return html.slice(start + '<script type="module">'.length, end)
    .split('\n').filter(line => !line.trimStart().startsWith('import ')).join('\n');
}
function assertImportMap(html, name) {
  const start = html.indexOf('<script type="importmap">');
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, name + ' has an import map');
  const imports = JSON.parse(html.slice(start + '<script type="importmap">'.length, end)).imports;
  assert.equal(imports.three, 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  assert.equal(imports['three/addons/'], 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/');
  assert.ok(start < html.indexOf('<script type="module">'), name + ' import map precedes module execution');
}

test('voxel terrain study has valid import map and parseable browser module', () => {
  const html = readPage('voxel-terrain-spike.html');
  assertImportMap(html, 'voxel terrain study');
  assert.doesNotThrow(() => new vm.Script(moduleSource(html, 'voxel terrain study')));
  assert.ok(html.includes("new Worker('./src/phase6/voxel-worker.js'"));
});

test('creature model review has valid import map and parseable browser module', () => {
  const html = readPage('creature-model-review.html');
  assertImportMap(html, 'creature model review');
  assert.doesNotThrow(() => new vm.Script(moduleSource(html, 'creature model review')));
  assert.ok(html.includes('assets/models/osmocean/naturalistic/catalog.json'));
  assert.ok(html.includes('OsmoceanMarineModels'));
  assert.ok(html.includes('PROCEDURAL SWIM'));
});

test('all Three.js pages keep import maps as real JSON rather than escaped text', () => {
  for (const path of ['phase6-spike.html', 'voxel-terrain-spike.html', 'creature-model-review.html']) {
    const html = readPage(path);
    const start = html.indexOf('<script type="importmap">');
    const end = html.indexOf('</script>', start);
    assert.ok(start >= 0 && end > start);
    assert.ok(!html.slice(start, end).includes(String.fromCharCode(92) + 'n'));
    assert.doesNotThrow(() => JSON.parse(html.slice(start + '<script type="importmap">'.length, end)));
  }
});
