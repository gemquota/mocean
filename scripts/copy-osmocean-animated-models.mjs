import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.argv[2] || '_upstream/fish-assets/assets/quaternius/animated-fish-bundle/Models');
const output = path.resolve(process.argv[3] || 'assets/models/osmocean/animated');
const species = [
  'anglerfish', 'black_lion_fish', 'coral_grouper', 'goblin_shark',
  'humphead', 'lionfish', 'parrot_fish', 'puffer', 'shark',
  'sunfish', 'swordfish', 'tuna'
];

await fs.mkdir(output, { recursive: true });
const catalogue = [];
for (const id of species) {
  const from = path.join(source, id + '.glb');
  const to = path.join(output, id + '.glb');
  const bytes = await fs.readFile(from);
  if (bytes.length < 1024 || bytes.subarray(0, 4).toString() !== 'glTF') {
    throw new Error('Invalid or missing animated GLB: ' + from);
  }
  await fs.writeFile(to, bytes);
  catalogue.push({
    id, name: id.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    file: id + '.glb', collection: 'quaternius-animated-fish',
    license: 'CC0-1.0', animationExpected: true
  });
}
const license = await fs.readFile(path.resolve(source, '../License.txt'));
await fs.writeFile(path.join(output, 'QUATERNIUS-CC0-LICENSE.txt'), license);
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({
  source: 'Vitexus/ishtaria-client assets/quaternius/animated-fish-bundle',
  sourceCommit: 'f42095c120c29a892c0c221bdc8357ac982ccfca',
  originalBundle: 'Quaternius Animated Fish Bundle',
  license: 'CC0-1.0',
  species: catalogue
}, null, 2) + '\n');
console.log('Copied ' + catalogue.length + ' animated Quaternius fish models.');
