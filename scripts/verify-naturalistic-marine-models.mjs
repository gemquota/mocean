import fs from 'node:fs/promises';
import path from 'node:path';

const directory=path.resolve(process.argv[2]??'assets/models/osmocean/naturalistic');
const models=[
  {species:'barracuda',file:'barracuda.glb',assetId:'5875'},
  {species:'marlin',file:'blue_marlin.glb',assetId:'5873'},
  {species:'tuna',file:'bluefin_tuna.glb',assetId:'5870'},
  {species:'shark',file:'great_white_shark.glb',assetId:'5867'},
  {species:'whaleShark',file:'whale_shark.glb',assetId:'5864'},
  {species:'mola',file:'ocean_sunfish.glb',assetId:'5866'},
  {species:'manta',file:'manta_ray.glb',assetId:'5878'},
  {species:'stingray',file:'southern_stingray.glb',assetId:'5877'},
  {species:'orca',file:'orca.glb',assetId:'5861'},
  {species:'spermWhale',file:'sperm_whale.glb',assetId:'5860'},
  {species:'dolphin',file:'bottlenose_dolphin.glb',assetId:'39330'},
  {species:'jellyfish',file:'moon_jellyfish.glb',assetId:'5889'},
  {species:'turtle',file:'loggerhead_turtle.glb',assetId:'39340'},
  {species:'seahorse',file:'lined_seahorse.glb',assetId:'39345'},
  {species:'seaDragon',file:'leafy_seadragon.glb',assetId:'39346'}
];
const entries=[];
for(const model of models){
  const file=path.join(directory,model.file);
  const bytes=await fs.readFile(file);
  if(bytes.toString('ascii',0,4)!=='glTF') throw new Error(model.file+' is not a GLB file');
  if(bytes.readUInt32LE(4)!==2) throw new Error(model.file+' is not glTF 2.0');
  if(bytes.readUInt32LE(8)!==bytes.length) throw new Error(model.file+' has an invalid GLB length');
  const jsonLength=bytes.readUInt32LE(12);
  const jsonType=bytes.readUInt32LE(16);
  if(jsonType!==0x4e4f534a) throw new Error(model.file+' does not begin with a JSON GLB chunk');
  const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength).replace(/\0+$/,'').trim());
  if(gltf.asset?.version!=='2.0'||!(gltf.meshes?.length)) throw new Error(model.file+' has no valid glTF 2.0 mesh data');
  const primitives=gltf.meshes.reduce((sum,mesh)=>sum+(mesh.primitives?.length??0),0);
  if(!primitives) throw new Error(model.file+' has no mesh primitives');
  const animationCount=gltf.animations?.length??0;
  if(animationCount) throw new Error(model.file+' unexpectedly contains baked clips; expected a reviewed static pose');
  entries.push({species:model.species,file:model.file,assetId:model.assetId,bytes:bytes.length,meshes:gltf.meshes.length,primitives,animationMode:'procedural'});
}
const catalogue={source:'3DAssets.dev',license:'CC0 1.0 Universal',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',models:entries};
await fs.writeFile(path.join(directory,'catalog.json'),JSON.stringify(catalogue,null,2)+'\n');
console.log('Verified '+entries.length+' naturalistic CC0 marine GLBs for procedural swimming.');
