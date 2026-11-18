import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldScaleController,normaliseWorldZoom,screenDragToHabitatPan,planetScaleForZoom,planetaryHandoffForBlend,geographyCameraForBlend} from '../src/phase6/world-scale.js';
test('world zoom normalisation preserves the planetary range below local fit',()=>{
 assert.equal(normaliseWorldZoom(2,1),2);assert.equal(normaliseWorldZoom(4,2),2);assert.equal(normaliseWorldZoom(.5,1),.5);assert.throws(()=>normaliseWorldZoom(1,0),RangeError);
});
test('planet, ocean, geology and ecology expose distinct presentation tiers',()=>{
 const scales=createWorldScaleController(),planet=scales.update(.1);assert.equal(planet.level,'planet');assert.equal(planet.showPlanet,true);assert.equal(planet.showIndividualAnimals,false);assert.equal(planet.terrainCellSize,3.2);assert.equal(planet.streamLocalWorld,false);
 const ocean=scales.update(.5);assert.equal(ocean.level,'ocean');assert.equal(ocean.localWorldBlend,1);assert.equal(ocean.terrainCellSize,3.2);assert.equal(ocean.streamLocalWorld,true);
 const geology=scales.update(2.2);assert.equal(geology.level,'geology');assert.equal(geology.terrainCellSize,1.6);assert.ok(geology.geologyBlend>.9);assert.ok(geology.ecologyBlend<.1);
 const ecology=scales.update(4.8);assert.equal(ecology.level,'ecology');assert.equal(ecology.terrainCellSize,.8);assert.equal(ecology.showIndividualAnimals,true);assert.equal(ecology.ecologyBlend,1);
});
test('planet zoom policy uses hysteresis while the presentation hand-off never double-renders surfaces',()=>{
 const scales=createWorldScaleController();assert.equal(scales.update(.12).level,'planet');assert.equal(scales.update(.19).level,'planet');const blend=scales.update(.19);assert.ok(blend.planetBlend>0&&blend.localWorldBlend>0);assert.equal(blend.streamLocalWorld,false);
 const before=planetaryHandoffForBlend(.499),after=planetaryHandoffForBlend(.5);
 assert.equal(before.planetOpacity,1);assert.equal(before.localOpacity,0);
 assert.equal(after.planetOpacity,0);assert.equal(after.localOpacity,1);
 assert.ok(after.planetScaleMultiplier>before.planetScaleMultiplier);
 assert.throws(()=>planetaryHandoffForBlend(NaN),RangeError);assert.equal(scales.update(.41).level,'ocean');
 assert.equal(scales.update(2.06).level,'geology');assert.equal(scales.update(1.9).level,'geology');assert.equal(scales.update(1.77).level,'ocean');assert.equal(scales.update(4.26).level,'ecology');assert.equal(scales.update(3.9).level,'ecology');assert.equal(scales.update(3.71).level,'geology');
});
test('geography entry eases camera rotation, submerges viewpoint and clears terrain blur',()=>{
 const before=geographyCameraForBlend(.499),entry=geographyCameraForBlend(.5),early=geographyCameraForBlend(.56),settled=geographyCameraForBlend(.68);
 assert.ok(before.rotationBlend>.89);
 assert.ok(entry.rotationBlend<before.rotationBlend,'camera should ease back slightly at the presentation switch');
 assert.ok(settled.rotationBlend>early.rotationBlend&&settled.rotationBlend===1,'remaining rotation completes just inside geography mode');
 assert.equal(entry.underwaterBlend,0);
 assert.ok(early.underwaterBlend>0&&early.underwaterBlend<1);
 assert.equal(settled.underwaterBlend,1);
 assert.ok(entry.terrainBlur>early.terrainBlur&&settled.terrainBlur===0);
 assert.throws(()=>geographyCameraForBlend(NaN),RangeError);
});
test('screen drag pans in habitat plane and compensates for shallow view elevation',()=>{
 const right=screenDragToHabitatPan({deltaX:100,deltaY:0,depth:50,focalLength:500,viewRight:{x:1,z:0},viewUp:{x:0,z:.25}});assert.ok(right.x<0);assert.ok(Math.abs(right.z)<1e-12);
 const vertical=screenDragToHabitatPan({deltaX:0,deltaY:100,depth:50,focalLength:500,viewRight:{x:1,z:0},viewUp:{x:0,z:.25}});assert.ok(vertical.z<0);assert.ok(Math.abs(vertical.z)>Math.abs(right.x)*3.9);
});

test('planet apparent size tracks zoom and remains bounded for deep-space overview',()=>{
 assert.ok(planetScaleForZoom(.02)<planetScaleForZoom(.08));
 assert.equal(planetScaleForZoom(.16),1);
 assert.equal(planetScaleForZoom(.5),1);
 assert.equal(planetScaleForZoom(.0001),.035);
 assert.throws(()=>planetScaleForZoom(0),RangeError);
});
