import { performance } from 'node:perf_hooks';
import { createGeologicalField } from '../src/phase6/geological-field.js';
import { buildDualContourSurface } from '../src/phase6/dual-contouring.js';

const field=createGeologicalField({seed:6102026});
const options={min:[-48,-24,-36],max:[48,5,36],cells:[64,30,48]};
const pointOptions={...options,sampleDistance:(x,y,z)=>field.sampleDistance(x,y,z)};
const columnOptions={...pointOptions,sampleColumn:(x,z)=>field.sampleDistanceColumn(x,z)};

function build(config){return buildDualContourSurface(config);}
function median(values){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];}
function measure(config){
  const samples=[];
  for(let i=0;i<4;i++){
    const start=performance.now();
    const mesh=build(config);
    const elapsed=performance.now()-start;
    if(i>0)samples.push(elapsed);
    if(!mesh.vertexCount||!mesh.triangleCount)throw new Error('Benchmark produced an empty mesh');
  }
  return {medianMs:median(samples),samplesMs:samples};
}

// Check output parity before comparing timings. The benchmark is invalid if
// the faster path changes topology or vertex placement.
const reference=build(pointOptions),optimised=build(columnOptions);
for(const key of ['positions','normals','indices']){
  if(reference[key].length!==optimised[key].length)throw new Error(key+' length differs');
  for(let i=0;i<reference[key].length;i++){
    if(reference[key][i]!==optimised[key][i])throw new Error(key+' differs at '+i);
  }
}
const point=measure(pointOptions),column=measure(columnOptions);
const speedup=point.medianMs/column.medianMs;
console.log(JSON.stringify({
  benchmark:'geological dual-contour column sampling',
  cells:options.cells,
  parity:'exact',
  pointSampling:point,
  columnSampling:column,
  speedup: Number(speedup.toFixed(3))
},null,2));
