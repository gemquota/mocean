import fs from 'node:fs/promises';
import path from 'node:path';

const directory=path.resolve(process.argv[2]??'assets/models/osmocean/species');
const quaternius=[
  'anglerfish.glb',
  'armored_catfish.glb',
  'betta.glb',
  'black_lion_fish.glb',
  'blobfish.glb',
  'blue_goldfish.glb',
  'blue_tang.glb',
  'butterfly_fish.glb',
  'cardinal_fish.glb',
  'clownfish.glb',
  'coral_grouper.glb',
  'cowfish.glb',
  'flatfish.glb',
  'flower_horn.glb',
  'goblin_shark.glb',
  'goldfish.glb',
  'humphead.glb',
  'koi.glb',
  'lionfish.glb',
  'mandarin_fish.glb',
  'moorish_idol.glb',
  'parrot_fish.glb',
  'piranha.glb',
  'puffer.glb',
  'red_snapper.glb',
  'royal_gramma.glb',
  'shark.glb',
  'sunfish.glb',
  'swordfish.glb',
  'tang.glb',
  'tetra.glb',
  'tuna.glb',
  'turbot.glb',
  'yellow_tang.glb',
  'zebra_clown_fish.glb'
];
const gobkit=[
  {file:'jellyfish.glb',url:'https://gobkit.com/freebies/animal/Jellyfish.glb',id:'jellyfish'},
  {file:'seal.glb',url:'https://gobkit.com/freebies/animalB/Seal.glb',id:'seal'},
  {file:'whale.glb',url:'https://gobkit.com/freebies/animalB/Whale.glb',id:'whale'}
];
const required=[...quaternius,'dolphin_rigged.glb',...gobkit.map(item=>item.file)];
const manifestPath=process.argv[3];
if(!manifestPath) throw new Error('Gobkit manifest path is required for source/licence verification');
const manifest=JSON.parse(await fs.readFile(path.resolve(manifestPath),'utf8'));
const manifestModels=(manifest.packs??[]).flatMap(pack=>pack.models??[]);
for(const item of gobkit){
  const source=manifestModels.find(model=>model.url===item.url);
  if(!source||!source.rigged||!(source.animations??[]).length||!String(source.license??'').includes('CC0 1.0')){
    throw new Error('Gobkit source manifest does not confirm a rigged CC0 animated model: '+item.file);
  }
}

function readGlb(file){
  const bytes=file;
  if(bytes.length<20||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2) {
    throw new Error('Invalid glTF 2.0 binary');
  }
  const jsonLength=bytes.readUInt32LE(12);
  const jsonType=bytes.readUInt32LE(16);
  if(jsonType!==0x4e4f534a||20+jsonLength>bytes.length) {
    throw new Error('GLB JSON chunk is missing or malformed');
  }
  return JSON.parse(bytes.toString('utf8',20,20+jsonLength).trim());
}

const entries=[];
for(const file of required){
  const bytes=await fs.readFile(path.join(directory,file));
  const gltf=readGlb(bytes);
  const animations=(gltf.animations??[]).map((clip,index)=>clip.name||'Animation '+(index+1));
  const quaterniusAsset=quaternius.includes(file);
  const gobkitAsset=gobkit.some(item=>item.file===file);
  const proceduralDolphin=file==='dolphin_rigged.glb'&&Array.isArray(gltf.skins)&&gltf.skins.length>0;
  if(!animations.length&&(quaterniusAsset||gobkitAsset||!proceduralDolphin)) throw new Error(file+' contains neither embedded clips nor a reviewed procedural swim rig');
  entries.push({
    id:path.basename(file,'.glb'),
    file,
    animations,
    animationCount:animations.length,
    animationMode:animations.length?'baked-clips':'procedural-swim',
    source:quaterniusAsset
      ? 'Quaternius Animated Fish Bundle / Vitexus ishtaria-client'
      : gobkitAsset ? 'Gobkit Free 3D Assets / live CC0 manifest' : 'PolyFish / unclemattmakes-polyfish',
    license:quaterniusAsset||gobkitAsset?'CC0-1.0':'MIT',
    licenseFile:quaterniusAsset?'QUATERNIUS-CC0-LICENSE.txt':gobkitAsset?'GOBKIT-CC0-LICENSE.txt':'POLYFISH-MIT-LICENSE.txt'
  });
}
const catalogue={
  generatedAtBuild:true,
  totalModels:entries.length,
  totalAnimationClips:entries.reduce((sum,item)=>sum+item.animationCount,0),
  species:entries
};
await fs.writeFile(path.join(directory,'catalog.json'),JSON.stringify(catalogue,null,2)+'\\n');
console.log('Verified '+entries.length+' animated marine GLBs ('+catalogue.totalAnimationClips+' baked clips plus procedural dolphin swim).');
