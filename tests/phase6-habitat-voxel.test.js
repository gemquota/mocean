import test from 'node:test';
import assert from 'node:assert/strict';
import { createHabitatVoxelTerrain } from '../src/phase6/habitat-voxel-terrain.js';
import { seabedHeight, proceduralGeologyRelief } from '../src/phase6/seabed-height.js';
import { createHabitatVoxelField } from '../src/phase6/voxel-field.js';

test('habitat voxel field contains solid seabed, open water and connected cave voids',()=>{
 const terrain=createHabitatVoxelTerrain();
 assert.ok(terrain.stats.vertices>1000);
 assert.ok(terrain.stats.triangles>1000);
 assert.ok(terrain.mesh.positions.every(Number.isFinite));
 assert.ok([...terrain.mesh.indices].every(index=>index<terrain.stats.vertices));
 const edgeUse=new Map();
 for(let i=0;i<terrain.mesh.indices.length;i+=3){
  const ids=[terrain.mesh.indices[i],terrain.mesh.indices[i+1],terrain.mesh.indices[i+2]],a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
  const ux=terrain.mesh.positions[b]-terrain.mesh.positions[a],uy=terrain.mesh.positions[b+1]-terrain.mesh.positions[a+1],uz=terrain.mesh.positions[b+2]-terrain.mesh.positions[a+2];
  const vx=terrain.mesh.positions[c]-terrain.mesh.positions[a],vy=terrain.mesh.positions[c+1]-terrain.mesh.positions[a+1],vz=terrain.mesh.positions[c+2]-terrain.mesh.positions[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const gx=terrain.mesh.normals[a]+terrain.mesh.normals[b]+terrain.mesh.normals[c],gy=terrain.mesh.normals[a+1]+terrain.mesh.normals[b+1]+terrain.mesh.normals[c+1],gz=terrain.mesh.normals[a+2]+terrain.mesh.normals[b+2]+terrain.mesh.normals[c+2];
  const alignment=nx*gx+ny*gy+nz*gz;
  assert.ok(alignment>0, 'terrain triangles must face outward; alignment='+alignment+' ids='+ids.join(',')+' centre='+[(terrain.mesh.positions[a]+terrain.mesh.positions[b]+terrain.mesh.positions[c])/3,(terrain.mesh.positions[a+1]+terrain.mesh.positions[b+1]+terrain.mesh.positions[c+1])/3,(terrain.mesh.positions[a+2]+terrain.mesh.positions[b+2]+terrain.mesh.positions[c+2])/3].join(','));
  for(const [u,v] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){const key=u<v?u+':'+v:v+':'+u;edgeUse.set(key,(edgeUse.get(key)||0)+1);}
 }
 assert.ok([...edgeUse.values()].every(count=>count<=2),'terrain must not contain non-manifold edges');
 for(const [key,count] of edgeUse){if(count!==1)continue;const [a,b]=key.split(':').map(Number);for(const id of [a,b]){const x=terrain.mesh.positions[id*3],z=terrain.mesh.positions[id*3+2];assert.ok(Math.abs(Math.abs(x)-24.5)<.8||Math.abs(Math.abs(z)-19.5)<.8,'open edges are allowed only at the outer voxel volume boundary');}}
 assert.ok(terrain.field(0,0,0)>0,'water above the seabed is empty');
 assert.ok(terrain.field(0,-13,0)<0,'deep seabed volume remains solid');
 assert.ok(terrain.field(-13,-9.05,-5)>0,'the carved tunnel is open');
 assert.ok(terrain.field(-13,-12,-5)<0,'rock remains below the tunnel');
 assert.ok(terrain.field(-16,-8,-2.4)<0,'connected ridge spine adds solid relief');
 assert.ok(terrain.field(-12.8,-8,-12.1)<0,'embedded boulder cluster adds finite rock volume');
 assert.ok(terrain.field(4,-7.45,-6.5)<0,'raised shelf has a solid upper surface');
 assert.ok(terrain.field(-14,-9.2,0)>0,'side gallery remains a carved cave void');
 assert.ok(terrain.field(7,-9.1,11.5)>0,'branched passage remains open');
 assert.ok(terrain.field(-6.8,-10.0,-7.0)>0,'first deep ravine is carved through the seabed');
 assert.ok(terrain.field(-6.8,-12.0,-7.0)>0,'ravine retains a deep lower channel');
 assert.ok(terrain.field(-6.8,-13.1,-7.0)<0,'ravine floor remains solid below its cut');
 assert.ok(terrain.field(-22,-10,0)>0,'cross-cut ravine opens a second deep channel');
 assert.ok(terrain.field(-22,-13.1,0)<0,'cross-cut ravine retains a solid floor');
 assert.ok(terrain.field(4,-10,14)>0,'southern ravine branch cuts through the reef');
 assert.ok(terrain.field(-22.5,-7.65,-9)<0,'stepped table-rock ledge has a solid cap');
 assert.ok(terrain.field(21.5,-7.72,3.5)<0,'outer shelf has a second raised ledge');
 assert.ok(terrain.field(-23,-8,-13.4)<0,'angular outer reef buttress adds solid relief');
 assert.ok(terrain.field(-17.5,-6.5,-14.2)<0,'angular outcrop rises above the sediment floor');
 assert.ok(terrain.field(-13,-9.65,-5)>0,'first enlarged cave chamber is hollow');
 assert.ok(terrain.field(8,-9.55,9)>0,'second enlarged cave chamber is hollow');
 assert.ok(terrain.field(17,-9.65,-9)>0,'third enlarged cave chamber is hollow');
 assert.ok(terrain.field(18.1,-9.6,-7.2)>0,'third cave side gallery is connected');
 const repeat=createHabitatVoxelTerrain();
 for(const point of [[-16,-8,-2.4],[-12.8,-8,-12.1],[4,-7.45,-6.5],[-14,-9.2,0],[7,-9.1,11.5]]){
  assert.equal(terrain.field(...point),repeat.field(...point),'geological field is deterministic');
 }
});

test('shared seabed relief is deterministic and matches the voxel contact surface',()=>{
 const samples=[];
 for(let z=-20;z<=20;z+=5)for(let x=-20;x<=20;x+=5)samples.push(seabedHeight(x,z));
 assert.ok(samples.every(Number.isFinite));
 assert.ok(Math.max(...samples)-Math.min(...samples)>.8,'multi-scale relief must be visible in the shared height field');
 assert.equal(seabedHeight(12.5,-8.25),seabedHeight(12.5,-8.25));
 const terrain=createHabitatVoxelTerrain();
 const floor=seabedHeight(40,40);
 assert.ok(terrain.field(40,floor+.5,40)>0,'water remains above the shared floor');
 assert.ok(terrain.field(40,floor-.5,40)<0,'solid seabed remains below the shared floor');
});

test('global seabed geology is deterministic, continuous and materially varied',()=>{
 const points=[];
 for(let z=-420;z<=420;z+=24)for(let x=-420;x<=420;x+=24)points.push([x,z,seabedHeight(x,z)]);
 const values=points.map(point=>point[2]);
 assert.ok(values.every(Number.isFinite));
 assert.ok(Math.max(...values)-Math.min(...values)>7,'global geology should contain meaningful basins and uplands');
 for(const [x,z] of [[64,96],[-128,224],[316,-88],[400,400]]){
  assert.equal(proceduralGeologyRelief(x,z),proceduralGeologyRelief(x,z),'world geology is deterministic');
  const h=seabedHeight(x,z),epsilon=.01;
  assert.ok(Math.abs(seabedHeight(x+epsilon,z)-h)<.1,'height field must not jump across chunk-scale movement');
  assert.ok(Math.abs(seabedHeight(x,z+epsilon)-h)<.1,'height field must remain continuous in both axes');
 }
 // Preserve the authored starter habitat exactly at its centre.
 const legacy=-8.65+Math.sin(.16*12.5-.07*8.25)*.48
  +Math.sin(-.31*8.25-.045*12.5)*.22
  +Math.cos(.075*12.5+.19*-8.25)*.16
  +Math.sin(.34*12.5+.23*-8.25)*Math.cos(.29*-8.25-.17*12.5)*.18
  +Math.sin(.57*12.5-.41*-8.25)*.07;
 assert.equal(seabedHeight(12.5,-8.25),legacy,'the existing near-origin seabed remains unchanged');
});

test('world-scale geology contains deterministic connected cave chambers and surface throats',()=>{
 const floor=()=>-8.65;
 const field=createHabitatVoxelField({x:41,y:15.5,z:31},floor);
 // Stable cave site in geology cell (0,1), deliberately beyond the authored reef.
 const chamberX=45.15712431215614,chamberZ=124.12410919531345;
 const shaftX=47.5382217015991,shaftZ=124.02810577126283;
 assert.ok(Math.hypot(chamberX,chamberZ)>65);
 assert.ok(field(chamberX,-12.473695988260138,chamberZ)>0,'chamber must be a real void below the seabed');
 assert.ok(field(shaftX,-10.55,shaftZ)>0,'surface throat must connect down into the chamber');
 assert.ok(field(chamberX+20,-12.47,chamberZ)<0,'surrounding rock must remain solid');
 const repeat=createHabitatVoxelField({x:41,y:15.5,z:31},floor);
 for(const point of [[chamberX,-12.47,chamberZ],[shaftX,-10.55,shaftZ],[chamberX+12,-12.47,chamberZ]]){
  assert.equal(field(...point),repeat(...point),'cave topology must be deterministic in world coordinates');
 }
});
