import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitatVoxelTerrain } from '../src/phase6/habitat-voxel-terrain.js';

test('habitat voxel field contains solid seabed, open water and connected cave voids',()=>{
 const terrain=createHabitatVoxelTerrain();
 assert.ok(terrain.stats.vertices>1000);
 assert.ok(terrain.stats.triangles>1000);
 assert.ok(terrain.mesh.positions.every(Number.isFinite));
 assert.ok([...terrain.mesh.indices].every(index=>index<terrain.stats.vertices));
 assert.ok(terrain.field(0,0,0)>0,'water above the seabed is empty');
 assert.ok(terrain.field(0,-13,0)<0,'deep seabed volume remains solid');
 assert.ok(terrain.field(-13,-9.05,-5)>0,'the carved tunnel is open');
 assert.ok(terrain.field(-13,-12,-5)<0,'rock remains below the tunnel');
});
