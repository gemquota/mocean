import test from 'node:test';
import assert from 'node:assert/strict';
import {
  geographicToUnitVector, unitVectorToGeographic, localTangentToGeographic, geographicToLocalTangent, createPlanetaryWorldFrame, planetFocusAtScreenCentre, blendCameraToLocalSurface,
  greatCircleDistance, orbitCameraPose, classifyPlanetaryZoom
} from '../src/phase6/planetary-navigation.js';

const near = (a,b,tolerance=1e-9) => assert.ok(Math.abs(a-b) <= tolerance, `${a} != ${b}`);

test('geographic positions round-trip through unit sphere coordinates', () => {
  for (const [longitude,latitude] of [[0,0],[1.2,.7],[-2.4,-.8],[Math.PI,0]]) {
    const result=unitVectorToGeographic(geographicToUnitVector(longitude,latitude));
    near(Math.atan2(Math.sin(result.longitude-longitude),Math.cos(result.longitude-longitude)),0);
    near(result.latitude,latitude);
  }
});

test('local tangent offsets preserve orientation and approximate local metric distances', () => {
  const anchor={longitude:0,latitude:0},radius=6371000;
  const east=localTangentToGeographic(anchor,1000,0,radius);
  const north=localTangentToGeographic(anchor,0,1000,radius);
  assert.ok(east.longitude>0);
  near(east.latitude,0);
  near(north.longitude,0);
  assert.ok(north.latitude>0);
  near(greatCircleDistance(anchor,east,radius),1000,1e-5);
  near(greatCircleDistance(anchor,north,radius),1000,1e-5);
});

test('tangent mapping remains stable across the date line and near high latitudes', () => {
  const anchor={longitude:Math.PI-.0001,latitude:1.2};
  const next=localTangentToGeographic(anchor,5000,2500,6371000);
  assert.ok(next.longitude>=-Math.PI && next.longitude<=Math.PI);
  assert.ok(next.latitude>anchor.latitude);
  near(greatCircleDistance(anchor,next,6371000),Math.hypot(5000,2500),1e-5);
});

test('orbit camera pose clamps pitch and distance without changing its target', () => {
  const pose=orbitCameraPose({target:{x:1,y:2,z:3},yaw:Math.PI/2,pitch:9,distance:2,minDistance:.5,maxDistance:5});
  near(pose.position.x,1+2*Math.cos(Math.PI*.495));
  near(pose.position.y,2+2*Math.sin(Math.PI*.495));
  near(pose.position.z,3);
  assert.equal(pose.distance,2);
  assert.deepEqual(pose.target,{x:1,y:2,z:3});
});

test('planetary zoom classification adds a true outer scale above ocean view', () => {
  assert.equal(classifyPlanetaryZoom(.08),'planet');
  assert.equal(classifyPlanetaryZoom(.5),'ocean');
  assert.equal(classifyPlanetaryZoom(2.4),'geology');
  assert.equal(classifyPlanetaryZoom(5),'ecology');
  assert.throws(()=>classifyPlanetaryZoom(0),RangeError);
});

test('spherical local mapping round-trips habitat coordinates at toy planet scale',()=>{
 const frame=createPlanetaryWorldFrame({anchor:{longitude:1.1,latitude:.62},radius:2500});
 for(const [east,north] of [[0,0],[40,-20],[-120,85],[250,130]]){
  const geographic=frame.localToGeographic(east,north),local=frame.geographicToLocal(geographic);
  near(local.east,east,1e-7);near(local.north,north,1e-7);
 }
});
test('local tangent inverse rejects ambiguous antipode',()=>{
 assert.throws(()=>geographicToLocalTangent({longitude:0,latitude:0},{longitude:Math.PI,latitude:0},1000),RangeError);
});

test('planet drag moves the geographic focus to the surface point under screen centre',()=>{
 const focus={longitude:.72,latitude:-.24};
 const unchanged=planetFocusAtScreenCentre(focus,0,0);
 near(unchanged.longitude,focus.longitude);near(unchanged.latitude,focus.latitude);
 const moved=planetFocusAtScreenCentre(focus,.31,-.17);
 assert.ok(Math.abs(moved.longitude-focus.longitude)+Math.abs(moved.latitude-focus.latitude)>.01);
 const frame=createPlanetaryWorldFrame({anchor:{longitude:0,latitude:0},radius:2500});
 const local=frame.geographicToLocal(moved),roundTrip=frame.localToGeographic(local.east,local.north);
 near(roundTrip.longitude,moved.longitude,1e-8);near(roundTrip.latitude,moved.latitude,1e-8);
});

test('planetary-to-local camera orientation rotates continuously without changing camera distance',()=>{
 const target={x:3,y:-2,z:7},localPosition={x:3,y:12.6,z:61};
 const start=blendCameraToLocalSurface({target,localPosition,blend:0});
 const middle=blendCameraToLocalSurface({target,localPosition,blend:.5});
 const end=blendCameraToLocalSurface({target,localPosition,blend:1});
 const distance=Math.hypot(localPosition.x-target.x,localPosition.y-target.y,localPosition.z-target.z);
 near(start.x,target.x);near(start.z,target.z);near(start.y,target.y+distance);
 near(end.x,localPosition.x);near(end.y,localPosition.y);near(end.z,localPosition.z);
 near(Math.hypot(middle.x-target.x,middle.y-target.y,middle.z-target.z),distance);
 assert.ok(middle.elevation> end.elevation && middle.elevation<1);
 assert.ok(start.elevation>middle.elevation && middle.elevation>end.elevation);
});
