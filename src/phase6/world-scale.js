/**
 * Three-scale world presentation policy. Planet is a navigable overview;
 * geology and ecology are progressively detailed views of the selected place.
 */
export const INITIAL_PLANETARY_RELATIVE_ZOOM = 0.12;

export const WORLD_SCALE_LEVELS = Object.freeze({
  planet: Object.freeze({ id:'planet', terrainCellSize:3.2 }),
  geology: Object.freeze({ id:'geology', terrainCellSize:1.6 }),
  ecology: Object.freeze({ id:'ecology', terrainCellSize:.8 })
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/**
 * Camera pose changes continuously across the complete planetary hand-off.
 * There is no late snap from a radial globe view to a tangent geography view.
 */
export function geographyCameraForBlend(blend){
 if(!Number.isFinite(blend))throw new RangeError('Geography camera blend must be finite.');
 const t=clamp(blend,0,1);
 return Object.freeze({
  rotationBlend:smoothstep(0,1,t),
  underwaterBlend:smoothstep(.58,.96,t),
  terrainBlur:0
 });
}
export function planetScaleForZoom(relativeZoom){
 if(!Number.isFinite(relativeZoom)||relativeZoom<=0)throw new RangeError('Planet zoom must be finite and positive.');
 // The globe reaches its full useful size at the start of the local hand-off,
 // then recedes below that threshold as the camera continues zooming out.
 return clamp(relativeZoom/.16,.035,1);
}
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
/**
 * Sequentially hands presentation from the globe to local geography. The
 * spherical globe is fully gone before the tangent-plane terrain appears;
 * the camera orientation blends independently over the whole zoom interval.
 */
export function planetaryHandoffForBlend(blend){
 if(!Number.isFinite(blend))throw new RangeError('Planet hand-off blend must be finite.');
 const t=clamp(blend,0,1);
 const planetOpacity=1-smoothstep(.46,.52,t);
 const localOpacity=smoothstep(.52,.58,t);
 return Object.freeze({
  planetOpacity,
  localOpacity,
  planetScaleMultiplier:1+2.2*smoothstep(0,.52,t),
  localVisible:t>=.52
 });
}
export function normaliseWorldZoom(zoom,fitZoom){
 if(!Number.isFinite(zoom)||!Number.isFinite(fitZoom)||fitZoom<=0)throw new RangeError('zoom and fitZoom must be finite, with fitZoom positive.');
 return zoom/fitZoom;
}
export function createWorldScaleController(){
 let level='planet';
 return Object.freeze({
  update(relativeZoom){
   if(!Number.isFinite(relativeZoom)||relativeZoom<=0)throw new RangeError('relativeZoom must be finite and positive.');
   if(relativeZoom<.14)level='planet';
   else if(level==='planet'&&relativeZoom>=.40)level='geology';
   else if(level==='geology'&&relativeZoom>=4.25)level='ecology';
   else if(level==='ecology'&&relativeZoom<3.72)level='geology';
   const planetBlend=1-smoothstep(.16,.42,relativeZoom),localWorldBlend=1-planetBlend;
   const geologyBlend=smoothstep(.34,.72,relativeZoom),ecologyBlend=smoothstep(3.35,4.65,relativeZoom);
   return Object.freeze({level,relativeZoom,planetBlend,localWorldBlend,geologyBlend,ecologyBlend,terrainCellSize:WORLD_SCALE_LEVELS[level].terrainCellSize,streamLocalWorld:localWorldBlend>.08,showPlanet:planetBlend>.01,showLocalEcology:localWorldBlend>.015&&ecologyBlend>.015,showIndividualAnimals:localWorldBlend>.96&&ecologyBlend>=.96});
  },
  get level(){return level;}
 }); 
}
export function screenDragToHabitatPan({deltaX,deltaY,depth,focalLength,viewRight,viewUp}){
 if(![deltaX,deltaY,depth,focalLength,viewRight?.x,viewRight?.z,viewUp?.x,viewUp?.z].every(Number.isFinite)||depth<=0||focalLength<=0)throw new RangeError('Pan inputs must be finite and depth/focalLength positive.');
 const worldPerPixel=depth/focalLength,horizontalUpLength=Math.hypot(viewUp.x,viewUp.z),verticalCompensation=horizontalUpLength>1e-6?1/horizontalUpLength:0;
 return{x:-viewRight.x*deltaX*worldPerPixel-viewUp.x*deltaY*worldPerPixel*verticalCompensation**2,z:-viewRight.z*deltaX*worldPerPixel-viewUp.z*deltaY*worldPerPixel*verticalCompensation**2};
}
