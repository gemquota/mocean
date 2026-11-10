import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'habitat page should contain its module script');
const script = match[1].replace(/^import .*?;\s*$/gm, '');

test('habitat browser module parses and initializes every fish before rendering', () => {
  assert.doesNotThrow(() => new vm.Script(script), 'browser module should remain syntactically valid');
  const created = script.indexOf('let school=createSchool(150)');
  const initialized = script.indexOf('initialiseFishVisualState(school)');
  const rendered = script.indexOf('function render()');
  assert.ok(created >= 0 && initialized > created && initialized < rendered, 'initial school gait state must be initialized before render');
  assert.match(script, /function initialiseFishVisualState\(nextSchool\)[\s\S]*?fish\.gait=createGait\(\)/);
});

test('each species gets controls on speed, size, min/max size and aggression tabs', () => {
  for (const id of ['species-speed', 'species-size', 'species-size-range', 'species-aggression']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing species control group: ' + id);
  }
  assert.match(script, /for\s*\(const \[species,label\] of Object\.entries\(speciesLabels\)\)/);
  assert.match(script, /addSpeciesSlider\('species-speed'/);
  assert.match(script, /addSpeciesSlider\('species-size'/);
  assert.match(script, /addSpeciesSlider\('species-aggression'/);
  assert.match(script, /speciesSettings\[species\]\.minSize/);
  assert.match(script, /speciesSettings\[species\]\.maxSize/);
});
