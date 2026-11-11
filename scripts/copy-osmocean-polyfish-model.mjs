import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.argv[2] || '_upstream/polyfish');
const output = path.resolve(process.argv[3] || 'assets/models/osmocean/polyfish');
await fs.mkdir(output, { recursive: true });
const model = await fs.readFile(path.join(source, 'assets/models/fish_rigged.glb'));
if (model.length < 1024 || model.subarray(0, 4).toString() !== 'glTF') {
  throw new Error('Pinned PolyFish rigged model is missing or invalid.');
}
await fs.writeFile(path.join(output, 'fish_rigged.glb'), model);
await fs.copyFile(path.join(source, 'LICENSE'), path.join(output, 'POLYFISH-MIT-LICENSE.txt'));
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({
  source: 'unclemattmakes/polyfish',
  sourceCommit: '1c0d7636f2c71fd81d001a597c13554f9cbdd417',
  id: 'polyfish-rigged',
  name: 'PolyFish rigged shoal fish',
  file: 'fish_rigged.glb',
  license: 'MIT',
  animation: 'Procedural vertex swim shader adapted by Osmocean; no baked clip assumed'
}, null, 2) + '\n');
console.log('Copied the pinned PolyFish rigged model and MIT licence.');
