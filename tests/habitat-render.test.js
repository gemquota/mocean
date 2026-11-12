import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ANIMATED_MODEL_SPECIES } from '../src/phase6/animated-species-filter.js';

const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
const src = readFileSync(new URL('../src/schooling.js', import.meta.url), 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'habitat page should contain its module script');
const script = match[1].replace(/^import .*?;\s*$/gm, '');

test('habitat browser module parses and initializes every fish before rendering', () => {
  assert.match(html, /from '\.\/src\/phase6\/animated-species-filter\.js'/);
  assert.match(html, /from '\.\/src\/phase6\/habitat-voxel-terrain\.js'/);
  assert.match(html, /from '\.\/src\/phase6\/voxel-field\.js'/);
  assert.match(html, /import\('\.\/src\/phase6\/osmocean-marine-models\.js'\)/);
  assert.doesNotMatch(html, /SchoolingCreatureRenderer/);
  assert.doesNotThrow(() => new vm.Script(script), 'browser module should remain syntactically valid');
  const created = script.indexOf('let school=createSchool(150,73421,{speciesPercentages:speciesMix,worldSize})');
  const initialized = script.indexOf('initialiseFishVisualState(school)');
  const rendered = script.indexOf('function render()');
  assert.ok(created >= 0 && initialized > created && initialized < rendered, 'initial school gait state must be initialized before render');
  assert.match(script, /function initialiseFishVisualState\(nextSchool\)[\s\S]*?fish\.gait=createGait\(\)/);
});

test('population control defaults to 10–200 while retaining saved bounds for other sliders',()=>{
 assert.match(html,/id="population" type="range" min="10" max="200" step="10" value="150"/);
 assert.match(html,/id="population-min">10 CREATURES/);
 assert.match(script,/const POPULATION_RANGE_VERSION_KEY='mocean\.populationRange\.v1'/);
 assert.match(script,/if\(populationRangeVersion!=='10-200'\)/);
 assert.match(script,/localStorage\.setItem\(POPULATION_RANGE_VERSION_KEY,'10-200'\)/);
 assert.match(script,/setPopulation\(populationSlider\.value\)/);
});

test('world dimensions default to 100 on every axis and allow a maximum of 1000',()=>{
 for(const axis of ['x','y','z']){
  assert.match(html,new RegExp('id="world-'+axis+'-value">100'));
  assert.match(html,new RegExp('id="world-'+axis+'" type="range" min="1" max="1000" step="1" value="100"'));
 }
 assert.match(script,/const speciesMix=filterToAnimatedSpecies\(SCHOOLING_SPECIES_PERCENTAGES\),worldSize=\{x:100,y:100,z:100\}/);
 assert.match(script,/const WORLD_RANGE_VERSION_KEY='mocean\.worldRange\.v1'/);
 assert.match(script,/delete savedSliderBounds\['world-x'\];delete savedSliderBounds\['world-y'\];delete savedSliderBounds\['world-z'\]/);
 assert.match(script,/localStorage\.setItem\(WORLD_RANGE_VERSION_KEY,'1-1000-default-100'\)/);
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
  assert.match(script, /drawHabitatVoxelTerrain\(ctx,project,viewWidth,viewHeight,zoom,school\.worldSize\)/);
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
  assert.match(script, /school\.fish\.length\.toLocaleString\('en-US'\).*MODELLED SPECIES/);
});

test('coral renderer reads terrain-height anchors from its precomputed colony collection', () => {
  assert.match(script, /function drawCoral\(\)[\s\S]*?const \[x,z,type,floor\]=coralColonies\[index\]/);
  assert.doesNotMatch(script, /const \[x,z,type\]=colonies\[index\]/);
});

test('habitat rendering keeps static reef geometry out of the frame loop and bounds particle workload', () => {
  assert.match(script, /coralColonies=Array\.from\(\{length:320\}/);
  assert.match(script, /for\(let index=0;index<coralColonies\.length;index\+\+\)/);
  assert.doesNotMatch(script, /function drawCoral\(\)[\s\S]{0,500}Array\.from/);
  assert.match(script, /planktonParticles=Array\.from\(\{length:480\}/);
  assert.match(script, /renderAccumulator>=1\/24/);
});

test('33-species catalogue includes three additional modelled fish with ecology-adjusted weights', () => {
  for (const species of ['grouper','moorishIdol','barracuda']) assert.match(html, new RegExp(species+':'));
  assert.match(src, /grouper: 5\.8/);
  assert.match(src, /moorishIdol: 0\.20/);
  assert.match(src, /barracuda: 3\.2/);
  assert.match(src, /grouper: 2, moorishIdol: 5, barracuda: 3/);
  assert.equal(ANIMATED_MODEL_SPECIES.length, 16);
  assert.match(script, /ANIMATED_MODEL_SPECIES\.length\+' MODELLED SPECIES'/);
  assert.match(script, /ANIMATED_MODEL_SPECIES\.includes\(changed\)/);
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

test('live habitat integrates a real voxel surface and animated Osmocean GLB models',()=>{
  assert.match(html,/three@0\.180\.0\/build\/three\.module\.js/);
  assert.match(script,/drawHabitatVoxelTerrain\(ctx,project,viewWidth,viewHeight,zoom,school\.worldSize\)/);
  assert.match(script,/await Promise\.all\(\[import\('three'\),import\('\.\/src\/phase6\/osmocean-marine-models\.js'\)\]\)/);
  assert.match(script,/new adapter\.OsmoceanMarineModels\(THREE/);
  assert.match(script,/function syncMarineModels\(ordered,dt\)/);
  assert.match(script,/entry\.update\(dt\)/);
  assert.match(script,/entry\.root\.quaternion\.setFromUnitVectors/);
  assert.match(script,/if\(MODELLED_SPECIES\.has\(fish\.species\)\)return/);
  assert.match(script,/modelRenderer\.render\(modelScene,modelCamera\)/);
  assert.match(script,/catch\(error\)\{modelRenderer=null;marineModels=null;console\.warn\('Naturalistic model layer unavailable; modelled species will not use cartoon fallbacks/);
});
test('disabled species retain native procedural renderers without cartoon substitutions',()=>{
  assert.match(script,/if\(fish\.species==='eel'\)\{drawEel\(fish\);return;\}/);
  assert.match(script,/if\(fish\.species==='crab'\|\|fish\.species==='lobster'\)\{drawCrustacean\(fish\);return;\}/);
  assert.match(script,/if\(fish\.species==='starfish'\)\{drawStarfish\(fish\);return;\}/);
  assert.match(script,/if\(fish\.species==='sandEel'\)\{drawSandEel\(fish\);return;\}/);
  assert.match(script,/if\(MODELLED_SPECIES\.has\(fish\.species\)\)return/);
});

test('voxel and WebGL failures preserve the procedural habitat fallback',()=>{
  assert.match(script,/Voxel seabed failed; using safe heightfield fallback/);
  assert.match(script,/if\(!voxelFallbackWarned\)/);
  assert.match(script,/initialiseMarineModelLayer\(\)/);
  assert.match(script,/webglcontextlost/);
  assert.match(script,/Naturalistic GLB layer disabled; unsupported species keep their native renderers/);
});


test('habitat enforces the inner-world boundary and ties minimum camera zoom to world size', () => {
  assert.match(src, /export const SCHOOLING_WORLD_EDGE_MARGIN = 0\.1/);
  assert.match(src, /function constrainAgentToWorld\(agent, worldSize\)/);
  assert.match(src, /for \(const agent of survivors\) constrainAgentToWorld\(agent, limits\)/);
  assert.match(script, /function minimumCameraZoom\(\)/);
  assert.match(script, /baseDistance\/worldExtent/);
  assert.match(script, /zoom=Math\.max\(minimum,Math\.min\(Math\.max\(3\.5,minimum\*3\.5\),zoom\)\)/);
  assert.match(script, /applyZoom\(\);/);
});

test('only exact animated-model species can spawn and unsupported species are disabled in the prevalence controls', () => {
  assert.equal(ANIMATED_MODEL_SPECIES.length, 13);
  for (const species of ['barracuda','marlin','tuna','shark','whaleShark','mola','manta','stingray','orca','spermWhale','dolphin','jellyfish','turtle','seahorse','seaDragon','anglerfish']) {
    assert.ok(ANIMATED_MODEL_SPECIES.includes(species), species + ' should have a matching animated model');
  }
  for (const species of ['fish','schoolFish','clownfish','parrotfish','blueTang','angelfish','butterflyfish','grouper','moorishIdol','wobbegong','eel','crab','lobster','mantis','seal','starfish','sandEel']) {
    assert.ok(!ANIMATED_MODEL_SPECIES.includes(species), species + ' should remain temporarily disabled');
  }
  assert.match(script,/const speciesMix=filterToAnimatedSpecies\(SCHOOLING_SPECIES_PERCENTAGES\)/);
  assert.match(script,/ANIMATED_MODEL_SPECIES\.filter\(key=>key!==changed\)/);
  assert.match(script,/const MODELLED_SPECIES=new Set\(ANIMATED_MODEL_SPECIES\)/);
  assert.match(script,/supported\?'':'disabled'/);
  assert.match(script,/MARINE_MODEL_ORIENTATION\[fish\.species\]==='vertical'/);
  assert.match(script,/NO MODEL/);
});

test('naturalistic GLBs use procedural body, vertical-tail, ray-wing and jellyfish-pulse motion', () => {
  const adapter = readFileSync(new URL('../src/phase6/osmocean-marine-models.js', import.meta.url), 'utf8');
  const shader = readFileSync(new URL('../src/phase6/polyfish-swim-material.js', import.meta.url), 'utf8');
  assert.match(adapter,/flattenStaticModel/);
  assert.match(adapter,/applySwimMaterial\(visual,motion\)/);
  assert.match(adapter,/animationMode:'procedural-'\+motion/);
  assert.match(shader,/uWaveMode/);
  assert.match(shader,/uWingMax/);
  assert.match(shader,/'wing-wave'/);
  assert.match(script,/if\(MODELLED_SPECIES\.has\(fish\.species\)\)return/);
});

test('jellyfish remain upright while following heading with a vertical-axis root', () => {
  const adapter = readFileSync(new URL('../src/phase6/osmocean-marine-models.js', import.meta.url), 'utf8');
  const mapping = readFileSync(new URL('../src/phase6/species-model-map.js', import.meta.url), 'utf8');
  assert.match(mapping,/jellyfish: \{ collection: 'naturalistic', id: 'moon_jellyfish'.*orientation: 'vertical' \}/);
  assert.match(adapter,/mapping\.orientation \?\? 'horizontal'/);
  assert.match(script,/setFromAxisAngle\(new THREE\.Vector3\(0,1,0\),yaw\)/);
});

test('schooling assigns deterministic matching model variants per creature', () => {
  const adapter = readFileSync(new URL('../src/phase6/osmocean-marine-models.js', import.meta.url), 'utf8');
  assert.match(adapter,/MARINE_MODEL_VARIANTS_BY_SPECIES/);
  assert.match(script,/variants\[Math\.abs\(fish\.id\?\?0\)%variants\.length\]/);
  assert.match(script,/modelId\}\)\.then\(instance/);
});

test('Pages workflow stages only naturalistic CC0 models and validates each GLB', () => {
  const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const verifier = readFileSync(new URL('../scripts/verify-naturalistic-marine-models.mjs', import.meta.url), 'utf8');
  assert.match(workflow,/Stage naturalistic CC0 marine models/);
  assert.match(workflow,/3dassets\.dev\/assets/);
  assert.doesNotMatch(workflow,/Quaternius|Gobkit|PolyFish/);
  assert.match(verifier,/glTF/);
  assert.match(verifier,/animationMode:'procedural'/);
  assert.match(verifier,/CC0 1\.0 Universal/);
});

test('naturalistic model flattening preserves quantized GLB vertex precision', () => {
  const adapter = readFileSync(new URL('../src/phase6/osmocean-marine-models.js', import.meta.url), 'utf8');
  assert.match(adapter,/promoteQuantizedAttributes/);
  assert.match(adapter,/attribute\.getX\(index\)/);
  assert.match(adapter,/new THREE\.BufferAttribute\(values,itemSize,false\)/);
});

test('model review gallery displays only the naturalistic procedural CC0 catalogue', () => {
  const gallery = readFileSync(new URL('../creature-model-review.html', import.meta.url), 'utf8');
  const legacy = readFileSync(new URL('../osmocean-model-study.html', import.meta.url), 'utf8');
  assert.match(gallery,/naturalistic\/catalog\.json/);
  assert.match(gallery,/OsmoceanMarineModels/);
  assert.match(gallery,/PAUSE SWIM/);
  assert.doesNotMatch(gallery,/Quaternius|Gobkit|animated\/catalog\.json|static\/catalog\.json/);
  assert.match(legacy,/creature-model-review\.html/);
});
