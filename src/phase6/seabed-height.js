/**
 * Shared seabed elevation field for rendering and creature contact.
 * The original authored habitat is preserved near the origin. Beyond it, a
 * deterministic, world-coordinate geology field supplies continuous shelves,
 * mountain spines, escarpments and branching canyon relief across streamed chunks.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const fade=t=>t*t*t*(t*(t*6-15)+10);
function hash2(x,z){
 let h=(Math.imul(x,374761393)+Math.imul(z,668265263))|0;
 h=Math.imul(h^(h>>>13),1274126177);
 return ((h^(h>>>16))>>>0)/4294967295;
}
function noise2(x,z){
 const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
 const a=hash2(ix,iz),b=hash2(ix+1,iz),c=hash2(ix,iz+1),d=hash2(ix+1,iz+1);
 const u=a+(b-a)*fx,v=c+(d-c)*fx;
 return u+(v-u)*fz;
}
const legacyHeight=(x,z)=>-8.65
  +Math.sin(x*.16+z*.07)*.48
  +Math.sin(z*.31-x*.045)*.22
  +Math.cos(x*.075+z*.19)*.16
  +Math.sin(x*.34+z*.23)*Math.cos(z*.29-x*.17)*.18
  +Math.sin(x*.57-z*.41)*.07;

/** Multi-scale, domain-warped global bathymetry in metres. */
export function proceduralGeologyRelief(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Geology coordinates must be finite');
 const wx=(noise2(x*.018+17,z*.018-9)-.5)*18;
 const wz=(noise2(x*.018-23,z*.018+31)-.5)*18;
 const px=x+wx,pz=z+wz;
 const continental=(noise2(px*.012+4,pz*.012-12)-.5)*5.4;
 const regional=(noise2(px*.038-8,pz*.038+19)-.5)*2.7;
 const local=(noise2(px*.11+21,pz*.11+6)-.5)*1.15;
 const detail=(noise2(px*.31-14,pz*.31-27)-.5)*.34;
 const ridgeField=noise2(px*.027+33,pz*.027-5);
 const ridged=1-Math.abs(2*noise2(px*.052-19,pz*.052+11)-1);
 const mountainMask=smoothstep(.48,.72,ridgeField);
 const ridge=(ridged*2.9-.65)*mountainMask;
 // A primary canyon and a tributary network follow warped, continuous paths.
 const trunkZ=13*Math.sin(px*.018+noise2(px*.012,pz*.012)*1.8)
   +4.5*Math.sin(px*.052+1.7)+wz*.22;
 const trunkDistance=Math.abs(pz-trunkZ);
 const trunk=-4.1*Math.exp(-.5*(trunkDistance/2.35)**2);
 const shoulder=1.15*Math.exp(-.5*((trunkDistance-4.2)/1.15)**2);
 const branchZ=-19+9*Math.sin(px*.031+.8)+noise2(px*.035+7,pz*.035-4)*3;
 const branchDistance=Math.abs(pz-branchZ);
 const tributary=-2.35*Math.exp(-.5*(branchDistance/1.55)**2);
 // Broad shelf breaks create terraces without quantised height steps.
 const shelfSignal=noise2(px*.021+61,pz*.021+37);
 const shelf=1.05*Math.exp(-Math.pow((shelfSignal-.56)/.055,2));
 // Repeating but widely spaced depositional fans sit at canyon outlets. Their
 // tapered lobes merge with the basin floor and have softly eroded margins.
 const fanCell=Math.floor(px/240),fanCentreX=(fanCell+.5)*240;
 const fanCentreZ=fanCell*71+18*Math.sin(fanCell*1.7);
 const fanDx=px-fanCentreX,fanDz=pz-fanCentreZ;
 const fanLength=fanDz/58,fanWidth=5+Math.max(0,fanLength)*17;
 const fanEdge=noise2(px*.085+fanCell*13,pz*.085-7)*.28;
 const fan=smoothstep(-.08,.18,fanLength)*(1-smoothstep(.82,1.08,fanLength))
  *Math.exp(-.5*Math.pow(fanDx/(fanWidth+fanEdge),2))*1.25;
 return continental+regional+local+detail+ridge+trunk+shoulder+tributary+shelf+fan;
}


/** Stable geological province identity for world-space terrain and materials. */
export function geologicalProvinceAt(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Geology coordinates must be finite');
 const wx=(noise2(x*.006+91,z*.006-37)-.5)*24;
 const wz=(noise2(x*.006-53,z*.006+73)-.5)*24;
 const px=x+wx,pz=z+wz;
 const province=noise2(px*.0038+11,pz*.0038-29);
 const fracture=noise2(px*.021-17,pz*.021+43);
 const ridge=noise2(px*.012+67,pz*.012+5);
 if(ridge>.69&&fracture>.43)return 'basalt-spires';
 if(province<.27)return 'fractured-shelf';
 if(province>.73)return 'boulder-field';
 if(fracture>.7)return 'limestone-karst';
 if(ridge<.3)return 'sediment-basin';
 return 'eroded-rock';
}

export const seabedHeight=(x,z)=>{
 const legacy=legacyHeight(x,z);
 const distance=Math.hypot(x,z);
 const worldBlend=smoothstep(28,55,distance);
 const global=-8.65+proceduralGeologyRelief(x,z);
 return legacy+(global-legacy)*worldBlend;
};
