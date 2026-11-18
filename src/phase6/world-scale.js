/**
 * Four-scale world presentation policy. Planet is an overview of the same
 * persistent habitat; ocean/geology/ecology remain the streamed local tiers.
 */
export const WORLD_SCALE_LEVELS = Object.freeze({
  planet: Object.freeze({ id:'planet', terrainCellSize:3.2 }),
  ocean: Object.freeze({ id:'ocean', terrainCellSize:3.2 }),
  geology: Object.freeze({ id:'geology', terrainCellSize:1.6 }),
  ecology: Object.freeze({ id:'ecology', terrainCellSize:.8 })
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export function normaliseWorldZoom(zoom,fitZoom){
 if(!Number.isFinite(zoom)||!Number.isFinite(fitZoom)||fitZoom<=0)throw new RangeError('zoom and fitZoom must be finite, with fitZoom positive.');
 return zoom/fitZoom;
}
export function createWorldScaleController(){
 let level='ocean';
 return Object.freeze({
  update(relativeZoom){
   if(!Number.isFinite(relativeZoom)||relativeZoom<=0)throw new RangeError('relativeZoom must be finite and positive.');
   if(level==='planet'){if(relativeZoom>=.22)level='ocean';}
   else if(relativeZoom<.16)level='planet';
   else if(level==='ocean'){if(relativeZoom>=4.25)level='ecology';else if(relativeZoom>=2.05)level='geology';}
   else if(level==='geology'){if(relativeZoom<1.78)level='ocean';else if(relativeZoom>=4.25)level='ecology';}
   else if(level==='ecology'){if(relativeZoom<1.78)level='ocean';else if(relativeZoom<3.72)level='geology';}
   const planetBlend=1-smoothstep(.10,.25,relativeZoom),localWorldBlend=1-planetBlend;
   const geologyBlend=smoothstep(1.45,2.3,relativeZoom),ecologyBlend=smoothstep(3.35,4.65,relativeZoom);
   return Object.freeze({level,relativeZoom,planetBlend,localWorldBlend,geologyBlend,ecologyBlend,terrainCellSize:WORLD_SCALE_LEVELS[level].terrainCellSize,streamLocalWorld:localWorldBlend>.8,showPlanet:planetBlend>.01,showLocalEcology:localWorldBlend>.015&&ecologyBlend>.015,showIndividualAnimals:localWorldBlend>.96&&ecologyBlend>=.96});
  },
  get level(){return level;}
 });
}
export function screenDragToHabitatPan({deltaX,deltaY,depth,focalLength,viewRight,viewUp}){
 if(![deltaX,deltaY,depth,focalLength,viewRight?.x,viewRight?.z,viewUp?.x,viewUp?.z].every(Number.isFinite)||depth<=0||focalLength<=0)throw new RangeError('Pan inputs must be finite and depth/focalLength positive.');
 const worldPerPixel=depth/focalLength,horizontalUpLength=Math.hypot(viewUp.x,viewUp.z),verticalCompensation=horizontalUpLength>1e-6?1/horizontalUpLength:0;
 return{x:-viewRight.x*deltaX*worldPerPixel-viewUp.x*deltaY*worldPerPixel*verticalCompensation**2,z:-viewRight.z*deltaX*worldPerPixel-viewUp.z*deltaY*worldPerPixel*verticalCompensation**2};
}
