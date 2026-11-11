import fs from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(process.argv[2] || 'assets/models/osmocean/static');
const manifestUrl = 'https://3dassets.dev/api/v1/packs/open-ocean-and-deep-sea-life';
await fs.mkdir(output, { recursive: true });
const response = await fetch(manifestUrl);
if (!response.ok) throw new Error('Marine model manifest request failed: ' + response.status);
const payload = await response.json();
const pack = payload?.data;
if (pack?.licenseLabel !== 'CC0 1.0 Universal' || !Array.isArray(pack.assets)) {
  throw new Error('Unexpected pack metadata or licence; refusing unverified model assets.');
}
const assets = pack.assets.filter(asset =>
  asset.status === 'published' &&
  asset.category?.slug === 'animals' &&
  asset.license?.slug === 'cc0-1.0' &&
  asset.license?.attributionRequired === false &&
  asset.cdnUrl?.endsWith('/model.glb')
);
if (assets.length < 30) {
  throw new Error('Expected at least 30 published CC0 animal models, received ' + assets.length + '. Review the manifest before updating the catalogue.');
}
const species = [];
for (const asset of assets) {
  const file = asset.id + '.glb';
  const target = path.join(output, file);
  const model = await fetch(asset.cdnUrl);
  if (!model.ok) throw new Error('Model download failed for ' + asset.title + ': ' + model.status);
  const bytes = Buffer.from(await model.arrayBuffer());
  if (bytes.length < 1024 || bytes.subarray(0, 4).toString() !== 'glTF') {
    throw new Error('Downloaded GLB failed validation: ' + asset.title);
  }
  await fs.writeFile(target, bytes);
  species.push({
    id: String(asset.id),
    name: asset.title.replace(/ \(Ocean Animals: Whales, Sharks and Fish\)$/i, ''),
    file, sizeBytes: bytes.length,
    dimensionsMeters: asset.stats?.sizeMeters ?? null,
    triangles: asset.stats?.triangles ?? null,
    animationClips: asset.stats?.animations ?? [],
    rigged: Boolean(asset.stats?.animations?.length),
    sourceUrl: asset.url,
    license: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    aiGenerated: Boolean(asset.aiGenerated)
  });
}
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({
  pack: pack.title,
  source: pack.url,
  manifest: manifestUrl,
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  aiGenerated: Boolean(pack.aiGenerated),
  species
}, null, 2) + '\n');
console.log('Downloaded ' + species.length + ' CC0 static marine models (' +
  species.reduce((sum, item) => sum + item.sizeBytes, 0) + ' bytes).');
