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

test('voxel terrain study has valid import map, parseable module and constrained camera controls', () => {
  const html = readPage('voxel-terrain-spike.html');
  assertImportMap(html, 'voxel terrain study');
  assert.doesNotThrow(() => new vm.Script(moduleSource(html, 'voxel terrain study')));
  assert.ok(html.includes("from './src/phase6/streamed-voxel-terrain.js'"));
  assert.ok(html.includes('controls.touches.ONE=THREE.TOUCH.PAN'));
  assert.ok(html.includes('controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE'));
  assert.ok(html.includes('controls.maxPolarAngle=1.36'));
  assert.ok(html.includes('controls.maxDistance=76'));
  assert.ok(html.includes('keepCameraAboveSeabed'));
  assert.ok(html.includes('radius:3,prefetchRadius:4,maxChunks:81'));
  assert.ok(html.includes('href="./schooling.html"'));
});

test('creature model review has valid import map and parseable browser module', () => {
  const html = readPage('creature-model-review.html');
  assertImportMap(html, 'creature model review');
  assert.doesNotThrow(() => new vm.Script(moduleSource(html, 'creature model review')));
  assert.ok(html.includes('assets/models/osmocean/naturalistic/catalog.json'));
  assert.ok(html.includes('OsmoceanMarineModels'));
  assert.ok(html.includes('PROCEDURAL SWIM'));
});

test('live habitat inline module has valid JavaScript syntax', () => {
  const html=readPage('schooling.html');
  assert.doesNotThrow(() => new vm.Script(moduleSource(html, 'live habitat')));
});

test('live habitat wires biome flora, new modelled species and bounded 3D rendering', () => {
  const html=readPage('schooling.html');
  assert.ok(html.includes("from './src/phase6/biomes.js'"));
  assert.ok(html.includes("from './src/phase6/vegetation-layout.js'"));
  assert.ok(html.includes("seahorse:'Lined seahorses'"));
  assert.ok(html.includes("seaDragon:'Leafy seadragons'"));
  assert.ok(html.includes("anglerfish:'Deep-sea anglerfish'"));
  assert.ok(html.includes('drawSpongeGardens()'));
  assert.ok(html.includes('drawSoftCorals()'));
  assert.ok(html.includes('drawSeaFans()'));
  assert.ok(html.includes('MAX_VISIBLE_3D_MODELS=72'));
  assert.ok(html.includes('marineRenderedFish.has(fish)'));
  assert.ok(html.includes('renderEntries.sort((a,b)=>b.depth-a.depth)'));
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
