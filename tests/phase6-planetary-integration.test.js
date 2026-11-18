import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../schooling.html', import.meta.url), 'utf8');

test('planet view is a real spherical WebGL mesh with a deterministic 2D fallback',()=>{
 assert.match(source,/new THREE\.SphereGeometry\(1,112,80\)/);
 assert.match(source,/new THREE\.ShaderMaterial/);
 assert.match(source,/drawPlanetaryGlobe\(ctx,viewWidth,viewHeight/);
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

test('two-finger navigation supports pan, twist and zoom without changing simulation state',()=>{
 assert.match(source,/rotateHabitatCamera\(angle-pinchAngle\)/);
 assert.match(source,/zoom\*=next\/pinchDistance/);
 assert.match(source,/planetYaw\+=/);
});
