import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitatVoxelField } from '../src/phase6/voxel-field.js';
import { createVegetationLayout, sampleTerrainTop } from '../src/phase6/vegetation-layout.js';

const worldSize={x:41,z:31};
const field=createHabitatVoxelField({x:41,y:15.5,z:31},()=>-8.65);

test('vegetation niches are generated from the terrain surface and are deterministic',()=>{
 const layout=createVegetationLayout(field,worldSize,73421);
 const repeat=createVegetationLayout(field,worldSize,73421);
 assert.deepEqual(layout,repeat);
 assert.ok(layout.grass.length>=12,'flat sediment plains should support seagrass beds');
 assert.ok(layout.kelp.length>=6,'rock ledges should support kelp');
 assert.ok(layout.walls.length>=4,'exposed vertical faces should support attached vegetation');
 assert.ok(layout.grass.every(p=>p.normal.y>.94&&p.y>-11.1&&p.y<-7.2));
 assert.ok(layout.kelp.every(p=>p.normal.y>.68&&p.normal.y<.94));
 assert.ok(layout.walls.every(p=>p.normal.y>=-.08&&p.normal.y<.68));
 for(const p of [...layout.grass,...layout.kelp,...layout.walls])assert.ok(Math.abs(field(p.x,p.y,p.z))<.22,'vegetation root must sit on the voxel surface');
});

test('terrain top sampler returns upward-facing roots on actual solid-water crossings',()=>{
 const p=sampleTerrainTop(field,-20,-15);
 assert.ok(p);
 assert.ok(p.normal.y>.2);
 assert.ok(Math.abs(field(p.x,p.y,p.z))<.08);
});
