import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planetarySurfaceElevation } from '../src/phase6/planetary-renderer.js';
import { seabedHeight } from '../src/phase6/seabed-height.js';
import { PLANETARY_WORLD_RADIUS } from '../src/phase6/planetary-navigation.js';

const source = await readFile(new URL('../schooling.html', import.meta.url), 'utf8');

test('planet overview remains visible as a zoom-scaled globe throughout the local handoff',()=>{
 assert.match(source,/drawPlanetaryGlobe\(ctx,viewWidth,viewHeight/);
 assert.match(source,/opacity:handoff\.planetOpacity/);
 assert.match(source,/planetScaleForZoom\(currentWorldScale.relativeZoom\)/);
});

test('planetary focus resolves from the existing local camera target',()=>{
 assert.match(source,/planetaryFrame\.localToGeographic\(camera\.target\.x,-camera\.target\.z\)/);
 assert.match(source,/focusLongitude:planetaryFocus\.longitude,focusLatitude:planetaryFocus\.latitude/);
});

test('planet zoom does not rebuild local terrain or reset simulated creatures',()=>{
 assert.match(source,/if\(currentWorldScale\.streamLocalWorld\)requestTerrainLod\(currentWorldScale\.terrainCellSize\)/);
 assert.match(source,/stepSchool\(school,dt\)/);
 assert.match(source,/for\(const fish of school\.fish\)/);
 assert.doesNotMatch(source,/school\.fish\s*=\s*\[\s*\]/);
});

test('camera rotation remains available throughout local geography and planetary scales',()=>{
 assert.match(source,/else rotateHabitatCamera\(dx\*\.0045,dy\*\.0045\)/);
 assert.match(source,/function rotateHabitatCamera\(deltaYaw,deltaPitch=0\)/);
 assert.match(source,/pitch=Math\.max\(-\.35,Math\.min\(1\.25/);
});
test('two-finger navigation supports pan, twist and zoom without changing simulation state',()=>{
 assert.match(source,/rotateHabitatCamera\(angle-pinchAngle\)/);
 assert.match(source,/zoom\*=next\/pinchDistance/);
 assert.match(source,/rotatePlanetaryView\(dx\*\.0045,dy\*\.0045\)/);
 assert.match(source,/planetYaw\=0;planetPitch\=0/);
});
test('planet size follows camera zoom and the outer zoom limit permits a distant overview',()=>{
 assert.match(source,/planetScaleForZoom\(currentWorldScale.relativeZoom\)/);
 assert.match(source,/function minimumCameraZoom\(\)\{return fitCameraZoom\(\)\*\.002;\}/);
 assert.match(source,/scale:planetScale/);
});

test('voxel terrain renders as native world-space geometry in the same camera as creatures',()=>{
 assert.match(source,/new THREE\.WebGLRenderer\(\{canvas:terrainCanvas,alpha:true/);
 assert.match(source,/stream\.attachRenderer\(THREE,terrainScene\)/);
 assert.match(source,/terrainRenderer\.render\(terrainScene,modelCamera\)/);
 assert.match(source,/modelRenderer\.render\(modelScene,modelCamera\)/);
 assert.match(source,/getContext\('2d',\{alpha:true\}\)/);
});

test('planet and local presentation use separate canvas layers so the globe is not overwritten by the local camera render',()=>{
 assert.match(source,/terrainCanvas\.id='school-terrain'/);
 assert.match(source,/modelCanvas\.id='school-models'/);
 assert.match(source,/modelCanvas\.style\.opacity=String\(ecologyAlpha\)/);
 assert.doesNotMatch(source,/useWebGLPlanet/);
});

test('local terrain prefetch begins before the globe-to-surface handoff',()=>{
 const prefetch=source.indexOf('if(currentWorldScale.streamLocalWorld)requestTerrainLod(currentWorldScale.terrainCellSize)');
 const handoff=source.indexOf('if(!handoff.localVisible)');
 assert.ok(prefetch>=0&&handoff>prefetch,'terrain must be requested while the planetary globe is still visible');
});
test('planetary globe never overlays streamed voxel triangles that can protrude through its surface',async()=>{
 const renderer=await readFile(new URL('../src/phase6/planetary-renderer.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/terrainMeshes,planetaryFrame/);
 assert.doesNotMatch(renderer,/terrainMeshes|planetaryFrame|surfaceForeshorten/);
 assert.match(source,/if\(!handoff\.localVisible\|\|!terrainReady\)/);
});
test('planet and map navigation re-anchor the local habitat without rotating the camera',()=>{
 assert.match(source,/function resetPlanetaryAnchor\(nextFocus\)/);
 assert.match(source,/planetaryFrame=createPlanetaryWorldFrame\(\{anchor:nextFocus,radius:PLANETARY_WORLD_RADIUS\}\)/);
 assert.match(source,/camera\.target\.x=0;camera\.target\.y=0;camera\.target\.z=0/);
 assert.match(source,/updateTerrainStreamsForCamera\(\)/);
});

test('zoom handoff keeps the camera at its authored pose',()=>{
 assert.match(source,/camera\.p\.x=baseCameraPosition\.x;camera\.p\.y=baseCameraPosition\.y;camera\.p\.z=baseCameraPosition\.z/);
 assert.doesNotMatch(source,/blendCameraToLocalSurface\(/);
});
test('planetary zoom crossfades from the globe to a flat map and then ecology',()=>{
 assert.match(source,/drawPlanetaryMap\(ctx,viewWidth,viewHeight/);
 assert.match(source,/drawPlanetaryMapOverlay\(planetaryFocus,handoff\.localOpacity,ecologyAlpha\)/);
 assert.match(source,/const opacity=handoffOpacity\*\(1-Math\.max\(0,Math\.min\(1,ecologyBlend\)\)\)/);
 assert.match(source,/panPlanetaryMap\(dx,dy\)/);
 assert.match(source,/modelCanvas\.style\.opacity=String\(ecologyAlpha\)/);
 assert.match(source,/drawPlanetaryMapOverlay\(planetaryFocus,handoff\.localOpacity,ecologyAlpha\)/);
});
test('planetary terrain stream covers the globe focus with a bounded 128 chunk cache',()=>{
 assert.match(source,/radius:4,prefetchRadius:5,maxChunks:128,cellSize,unbounded:true,includeStreamRocks:true/);
});

test('planet continents use seam-free deterministic spherical noise with layered terrain and clouds',async()=>{
 const renderer=await readFile(new URL('../src/phase6/planetary-renderer.js',import.meta.url),'utf8');
 assert.match(renderer,/export function planetarySurfaceElevation/);
 assert.match(renderer,/valueNoise3/);
 assert.match(renderer,/const SURFACE_CELLS/);
 assert.match(renderer,/const CLOUD_CELLS/);
 assert.match(renderer,/smoothstep/);
 assert.match(renderer,/const halo/);
 assert.match(renderer,/const basinBand/);
});

test('planetary elevation contains warped continental masses and elevated mountain systems',()=>{
 let min=1,max=0,land=0,samples=0;
 for(let lat=-1.35;lat<=1.35;lat+=.15){
  for(let lon=-Math.PI;lon<Math.PI;lon+=.15){
   const elevation=planetarySurfaceElevation(lon,lat);
   min=Math.min(min,elevation);max=Math.max(max,elevation);
   if(elevation>.585)land++;
   samples++;
  }
 }
 assert.ok(max-min>.2,'global relief should not collapse to a nearly uniform field');
 assert.ok(land>samples*.08&&land<samples*.8,'the field should contain substantial but non-total continental coverage');
 assert.ok(max>.72,'continental interiors should support elevated mountain regions');
});


test('planetary overview samples the exact local seabed field at its geographic anchor',()=>{
 const expected=.42+(seabedHeight(0,0)+8.65)*.012;
 assert.ok(Math.abs(planetarySurfaceElevation(0,0)-expected)<1e-12);
});
test('planetary and local bathymetry agree throughout the active tangent patch',()=>{
 const radius=PLANETARY_WORLD_RADIUS;
 for(const [east,north] of [[0,0],[12,-8],[-24,19],[42,31],[-55,-35]]){
  const distance=Math.hypot(east,north),angle=distance/radius;
  const longitude=distance<1e-12?0:Math.atan2(east/distance*Math.sin(angle),Math.cos(angle));
  const latitude=distance<1e-12?0:Math.asin(Math.sin(angle)*north/distance);
  const actual=planetarySurfaceElevation(longitude,latitude);
  const expected=.42+(seabedHeight(east,north)+8.65)*.012;
  assert.ok(Math.abs(actual-expected)<1e-10,'shared bathymetry mismatch at '+east+', '+north);
 }
});

test('planetary surface elevation is deterministic and longitude-seam continuous',()=>{
 for(let lat=-1.45;lat<=1.45;lat+=.29){
  for(let lon=-Math.PI;lon<=Math.PI;lon+=.37){
   const a=planetarySurfaceElevation(lon,lat),b=planetarySurfaceElevation(lon+Math.PI*2,lat);
   assert.ok(Number.isFinite(a)&&a>=0&&a<=1);
   assert.ok(Math.abs(a-b)<1e-10);
   assert.equal(a,planetarySurfaceElevation(lon,lat));
  }
 }
});

test('the initial camera opens at the planetary overview instead of skipping to geology',()=>{
 assert.match(source,/zoom=fitCameraZoom\(\)\*INITIAL_PLANETARY_RELATIVE_ZOOM/);
});
test('globe unfolds into the flat map independently while ecology waits for streamed terrain',()=>{
 assert.match(source,/handoffTarget=localWorldBlend>=\.34\?1:0/);
 assert.match(source,/if\(!handoff\.localVisible\|\|!terrainReady\)/);
 assert.match(source,/planetaryHandoffProgress\+=Math\.max\(-handoffStep/);
});

test('the planetary map is a cached flat atlas repeated across the viewport',async()=>{
 const map=await readFile(new URL('../src/phase6/planetary-map.js',import.meta.url),'utf8');
 const renderer=await readFile(new URL('../src/phase6/planetary-map-renderer.js',import.meta.url),'utf8');
 assert.match(map,/export function wrapUnit/);
 assert.match(map,/export function panPlanetMap/);
 assert.match(renderer,/export function planetaryMapElevation/);
 assert.match(renderer,/const MAP_WIDTH = 512/);
 assert.match(renderer,/const MAP_HEIGHT = 256/);
 assert.match(renderer,/getMapTexture/);
 assert.match(renderer,/ctx\.drawImage\(texture,left,top,mapWidth,mapHeight\)/);
 assert.doesNotMatch(renderer,/terrainMeshes|planetaryFrame/);
});
