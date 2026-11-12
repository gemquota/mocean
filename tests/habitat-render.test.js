import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
const src = readFileSync(new URL('../src/schooling.js', import.meta.url), 'utf8');
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

test('reef habitat includes mola mola, irregular reef formations, seagrass, kelp and expanded coral forms', () => {
  assert.match(html, /mola:'Mola mola'/);
  assert.match(script, /function drawMola\(fish\)/);
  assert.match(script, /function drawSeagrassAndKelp\(\)/);
  assert.match(script, /reefRidges=/);
  assert.match(script, /i%12/);
  assert.match(script, /drawSeagrassAndKelp\(\)/);
});

test('orca, sperm whale and seal have dedicated volumetric renderers and habitat counts', () => {
  for(const [species,renderer] of [['orca','drawOrca'],['spermWhale','drawSpermWhale'],['seal','drawSeal']]) {
    assert.ok(html.includes(species+':'),species+' config label missing');
    assert.ok(script.includes('function '+renderer+'(fish)'),renderer+' missing');
  }
  assert.match(script,/speciesCounts\.innerHTML/);
});


test('habitat fish renderer does not depend on an undefined global size setting', () => {
  assert.doesNotMatch(script, /configSettings/);
  assert.match(script, /SCHOOLING_FISH_SCALE\*\(fish\.bodyScale\?\?1\)/);
});


test('habitat animation exposes runtime faults and reports advancing simulation time', () => {
  assert.match(script, /animationFault=null/);
  assert.match(script, /SIMULATION FAULT/);
  assert.match(script, /school\.time\.toFixed\(1\)/);
  assert.match(script, /if\(!animationFault\) requestAnimationFrame\(animate\)/);
});


test('reef additions include five configured reef fish and animated anchored anemones', () => {
  for (const species of ['clownfish','parrotfish','blueTang','angelfish','butterflyfish','grouper','moorishIdol','barracuda']) assert.match(html, new RegExp(species+':'));
  assert.match(html, /function drawReefFish\(fish\)/);
  assert.match(html, /function drawAnemones\(\)/);
  assert.match(html, /drawAnemones\(\)/);
  assert.match(src, /REEF_ANEMONE_SITES/);
});

test('pelagic and benthic additions are represented in controls and renderers', () => {
  for (const species of ['wobbegong','marlin','tuna']) assert.match(html, new RegExp(species+':'));
  assert.match(html, /function drawWobbegong\(fish\)/);
  assert.match(html, /drawWobbegong\(fish\)/);
  assert.match(src, /wobbegong: 4\.8/);
  assert.match(src, /marlin: 5\.2/);
  assert.match(src, /tuna: 3\.8/);
});

test('one creature renderer fault cannot stop the habitat frame or hide every later animal', () => {
  assert.match(script, /for\(const fish of ordered\)\{[\s\S]*?try \{ drawFish\(fish\); \}[\s\S]*?catch\(error\)/);
  assert.match(script, /const renderFaults=new Map\(\)/);
  assert.match(script, /RENDER WARN/);
  assert.match(script, /school\.fish\.length\.toLocaleString\('en-US'\)\+' CREATURES · '+ANIMATED_MODEL_SPECIES.length+' ANIMATED SPECIES/);
});

test('coral renderer reads from its precomputed colony collection', () => {
  assert.match(script, /function drawCoral\(\)[\s\S]*?const \[x,z,type\]=coralColonies\[index\]/);
  assert.doesNotMatch(script, /const \[x,z,type\]=colonies\[index\]/);
});

test('habitat rendering keeps static reef geometry out of the frame loop and bounds particle workload', () => {
  assert.match(script, /const coralColonies=Array\.from\(\{length:320\}/);
  assert.match(script, /for\(let index=0;index<coralColonies\.length;index\+\+\)/);
  assert.doesNotMatch(script, /function drawCoral\(\)[\s\S]{0,500}Array\.from/);
  assert.match(script, /planktonParticles=Array\.from\(\{length:480\}/);
  assert.match(script, /renderAccumulator>=1\/24/);
});

test('30-species mix includes three new fish with ecology-adjusted weights', () => {
  for (const species of ['grouper','moorishIdol','barracuda']) assert.match(html, new RegExp(species+':'));
  assert.match(src, /grouper: 5\.8/);
  assert.match(src, /moorishIdol: 0\.20/);
  assert.match(src, /barracuda: 3\.2/);
  assert.match(src, /grouper: 2, moorishIdol: 5, barracuda: 3/);
  assert.match(html, /7 ANIMATED SPECIES/);
});


test('every habitat range slider supports long-press min/max editing persisted in local storage', () => {
  assert.match(html, /LONG-PRESS ANY SLIDER TO EDIT ITS MINIMUM AND MAXIMUM/);
  assert.match(script, /const SLIDER_BOUNDS_STORAGE_KEY='mocean\.sliderBounds\.v1'/);
  assert.match(script, /localStorage\.getItem\(SLIDER_BOUNDS_STORAGE_KEY/);
  assert.match(script, /localStorage\.setItem\(SLIDER_BOUNDS_STORAGE_KEY/);
  assert.match(script, /function editSliderBounds\(slider\)/);
  assert.match(script, /window\.prompt\('Set slider minimum value:'/);
  assert.match(script, /window\.prompt\('Set slider maximum value:'/);
  assert.match(script, /setTimeout\(\(\)=>\{pressTimer=null;editSliderBounds\(slider\);\},650\)/);
  assert.match(script, /document\.querySelectorAll\('input\[type="range"\]'\)/);
  assert.match(script, /slider\.dataset\.rangeKey=key/);
  assert.match(script, /savedSliderBounds\[slider\.dataset\.rangeKey\]/);
});
