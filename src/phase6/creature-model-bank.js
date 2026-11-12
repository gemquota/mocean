import { getSpeciesModel } from './species-model-map.js';

export function resolveModelEntry(species, catalogue) {
  const mapping=getSpeciesModel(species);
  if(!mapping||!catalogue||!Array.isArray(catalogue.models))return null;
  const item=catalogue.models.find(entry=>
    entry.species===species &&
    String(entry.assetId)===String(mapping.assetId) &&
    entry.file===mapping.id+'.glb'
  );
  return item?{...item,collection:'naturalistic',folder:'naturalistic',mapping}:null;
}
