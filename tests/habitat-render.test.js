import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PROCEDURAL_VOXEL_SPECIES } from '../src/phase6/procedural-voxel-creature-renderer.js';

const html = readFileSync(new URL('../schooling.html', import.meta.url), 'utf8');
const src = readFileSync(new URL('../src/schooling.js', import.meta.url), 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'habitat page should contain its module script');
const script = match[1].replace(/^import .*?;\s*$/gm, '');

test('habitat browser module parses and initializes every fish before rendering', () => {
  assert.match(html, /from '\.\/src\/phase6\/procedural-voxel-creature-renderer\.js'/);
  assert.match(html, /from '\.\/src\/phase6\/habitat-voxel-terrain\.js'/);
  assert.match(html, /from '\.\/src\/phase6\/voxel-field\.js'/);
  assert.match(html, /import\('\.\/src\/phase6\/procedural-voxel-creature-renderer\.js'\)/);
  assert.doesNotMatch(html, /SchoolingCreatureRenderer/);
  assert.doesNotThrow(() => new vm.Script(script), 'browser module should remain syntactically valid');
  const created = script.indexOf('let school=createSchool(150,73421,{speciesPercentages:speciesMix,worldSize})');
  const initialized = script.indexOf('initialiseFishVisualState(school)');
  const rendered = script.indexOf('function render()');
  assert.ok(created >= 0 && initialized > created && initialized < rendered, 'initial school gait state must be initialized before render');
  assert.match(script, /function initialiseFishVisualState\(nextSchool\)[\s\S]*?fish\.gait=createGait\(\)/);
});

test('population control supports 10–1000 while retaining saved bounds for other sliders',()=>{
 assert.match(html,/id="population" type="range" min="10" max="1000" step="10" value="150"/);
 assert.match(html,/id="population-min">10 CREATURES/);
 assert.match(script,/const POPULATION_RANGE_VERSION_KEY='mocean\.populationRange\.v1'/);
 assert.match(script,/if\(populationRangeVersion!=='10-1000'\)/);
 assert.match(script,/localStorage\.setItem\(POPULATION_RANGE_VERSION_KEY,'10-1000'\)/);
 assert.match(script,/setPopulation\(populationSlider\.value\)/);
});

test('world dimensions default to 100 on every axis and allow a maximum of 1000',()=>{
 for(const axis of ['x','y','z']){
  assert.match(html,new RegExp('id="world-'+axis+'-value">100'));
  assert.match(html,new RegExp('id="world-'+axis+'" type="range" min="1" max="1000" step="1" value="100"'));
 }
 assert.match(script,/const speciesMix=filterToProceduralVoxelSpecies\(SCHOOLING_SPECIES_PERCENTAGES\),worldSize=\{x:100,y:100,z:100\}/);
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
  assert.match(html, /mola:'Ocean sunfish'/);
  assert.match(script, /function drawMola\(fish\)/);
  assert.match(script, /function drawSeagrassAndKelp\(\)/);
  assert.match(script, /drawHabitatVoxelTerrain\(ctx,project,viewWidth,viewHeight,zoom,school\.worldSize,habitatTerrainStream(?:,[^)]+)?\)/);
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
  assert.match(script, /for\(const \{fish\} of renderEntries\)\{[\s\S]*?try \{ drawFish\(fish\); \}[\s\S]*?catch\(error\)/);
  assert.match(script, /const renderFaults=new Map\(\)/);
  assert.match(script, /RENDER WARN/);
  assert.match(script, /school\.fish\.length\.toLocaleString\('en-US'\).*PROCEDURAL VOXEL SPECIES/);
});

test('coral renderer reads terrain-height anchors from its precomputed colony collection', () => {
  assert.match(script, /function drawCoral\(\)[\s\S]*?const \[x,z,type,floor\]=coralColonies\[index\]/);
  assert.doesNotMatch(script, /const \[x,z,type\]=colonies\[index\]/);
});

test('habitat rendering keeps static reef geometry out of the frame loop and bounds particle workload', () => {
  assert.match(script, /coralColonies=Array\.from\(\{length:320\}/);
  assert.match(script, /for\(let index=0;index<coralColonies\.length;index\+\+\)/);
  assert.doesNotMatch(script, /function drawCoral\(\)[\s\S]{0,500}Array\.from/);
  assert.match(script, /planktonParticles=Array\.from\(\{length:360\}/);
  assert.match(script, /renderAccumulator>=1\/24/);
});

test('33-species catalogue includes three additional modelled fish with ecology-adjusted weights', () => {
  for (const species of ['grouper','moorishIdol','barracuda']) assert.match(html, new RegExp(species+':'));
  assert.match(src, /grouper: 5\.8/);
  assert.match(src, /moorishIdol: 0\.20/);
  assert.match(src, /barracuda: 3\.2/);
  assert.match(src, /seahorse: 80, seaDragon: 70, anglerfish: 45/);
  assert.match(src, /grouper: 2, moorishIdol: 5, barracuda: 3/);
  assert.equal(PROCEDURAL_VOXEL_SPECIES.length, 33);
  assert.match(script, /PROCEDURAL_VOXEL_SPECIES\.length\+' PROCEDURAL VOXEL SPECIES'/);
  assert.match(script, /PROCEDURAL_VOXEL_SPECIES\.includes\(changed\)/);
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

test('live habitat integrates voxel terrain with species-batched procedural voxel creatures',()=>{
  assert.match(html,/three@0\.180\.0\/build\/three\.module\.js/);
  assert.match(script,/import\('\.\/src\/phase6\/procedural-voxel-creature-renderer\.js'\)/);
  assert.match(script,/new voxels\.ProceduralVoxelCreatureRenderer\(THREE/);
  assert.match(script,/function syncMarineModels\(ordered,dt\)/);
  assert.match(script,/batch\.update\(fishList,dt\)/);
  assert.match(script,/modelRenderer\.render\(modelScene,modelCamera\)/);
  assert.match(script,/MAX_INSTANCED_MARINE_ENTITIES=1000/);
  assert.match(script,/marineRenderedFish\.add\(fishList\[i\]\)/);
  assert.match(script,/Procedural voxel creature layer unavailable/);
});

test('model-only habitat never substitutes legacy Canvas creature drawings',()=>{
  assert.match(script,/function drawFish\(fish\)\{[\s\S]*?return;/);
  assert.match(html,/NO 2D CREATURE FALLBACKS/);
  assert.match(script,/marineRenderedFish\.add/);
  assert.match(script,/const MAX_INSTANCED_MARINE_ENTITIES=1000/);
});

test('voxel fallback remains available when streamed terrain fails and model context is lost',()=>{
  assert.match(script,/Voxel seabed failed; using safe heightfield fallback/);
  assert.match(script,/if\(!voxelFallbackWarned\)/);
  assert.match(script,/initialiseMarineModelLayer\(\)/);
  assert.match(script,/webglcontextlost/);
  assert.match(script,/Procedural voxel creature layer disabled; creatures will remain hidden/);
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

test('all schooling species spawn as procedural voxel creatures and remain enabled in prevalence controls', () => {
  assert.equal(PROCEDURAL_VOXEL_SPECIES.length,33);
  for (const species of ['fish','schoolFish','clownfish','parrotfish','blueTang','angelfish','butterflyfish','grouper','moorishIdol','barracuda','marlin','tuna','shark','whaleShark','wobbegong','mola','manta','stingray','orca','spermWhale','dolphin','jellyfish','turtle','seahorse','seaDragon','anglerfish','eel','sandEel','crab','lobster','mantis','seal','starfish']) {
    assert.ok(PROCEDURAL_VOXEL_SPECIES.includes(species), species + ' should have a procedural voxel body plan');
  }
  assert.match(script,/const speciesMix=filterToProceduralVoxelSpecies\(SCHOOLING_SPECIES_PERCENTAGES\)/);
  assert.match(script,/PROCEDURAL_VOXEL_SPECIES\.filter\(key=>key!==changed\)/);
  assert.match(script,/const MODELLED_SPECIES=new Set\(PROCEDURAL_VOXEL_SPECIES\)/);
  assert.match(script,/supported\?'':'disabled'/);
  assert.match(script,/MARINE_MODEL_BY_SPECIES\[fish\.species\]/);
  assert.match(script,/supported=PROCEDURAL_VOXEL_SPECIES\.includes\(species\)/);
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
  assert.match(script,/marineRenderedFish\.add\(fishList\[i\]\)/);
});

test('jellyfish remain upright while following heading with a vertical-axis root', () => {
  const adapter = readFileSync(new URL('../src/phase6/osmocean-marine-models.js', import.meta.url), 'utf8');
  const mapping = readFileSync(new URL('../src/phase6/species-model-map.js', import.meta.url), 'utf8');
  assert.match(mapping,/jellyfish: \{ collection: 'naturalistic', id: 'moon_jellyfish'.*orientation: 'vertical' \}/);
  assert.match(adapter,/mapping\.orientation \?\? 'horizontal'/);
  assert.match(mapping,/orientation: 'vertical'/);
});

test('schooling assigns deterministic species batches to matching procedural voxel profiles', () => {
  const renderer = readFileSync(new URL('../src/phase6/procedural-voxel-creature-renderer.js', import.meta.url), 'utf8');
  assert.match(renderer,/VOXEL_PROFILE_BY_SPECIES/);
  assert.match(renderer,/buildVoxelCreatureGeometry/);
  assert.match(script,/if\(!bySpecies\.has\(fish\.species\)\)bySpecies\.set\(fish\.species,\[\]\)/);
  assert.match(script,/marineModels\.createBatch\(species\)/);
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
