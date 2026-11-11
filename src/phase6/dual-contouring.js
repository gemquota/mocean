/**
 * Dual-contouring surface extraction for signed-distance voxel fields.
 * Positive samples are air/water; negative samples are solid.
 * Pure geometry generation: no renderer or simulation dependencies.
 */
const CORNERS = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const key = (x,y,z,nx,ny) => (z*ny+y)*nx+x;

function solve3(a,b) {
  const m = [
    [a[0][0],a[0][1],a[0][2],b[0]],
    [a[1][0],a[1][1],a[1][2],b[1]],
    [a[2][0],a[2][1],a[2][2],b[2]]
  ];
  for (let c=0;c<3;c++) {
    let p=c;
    for(let r=c+1;r<3;r++) if(Math.abs(m[r][c])>Math.abs(m[p][c])) p=r;
    if(Math.abs(m[p][c])<1e-12) return null;
    [m[c],m[p]]=[m[p],m[c]];
    const d=m[c][c]; for(let j=c;j<4;j++)m[c][j]/=d;
    for(let r=0;r<3;r++) if(r!==c){const f=m[r][c];for(let j=c;j<4;j++)m[r][j]-=f*m[c][j];}
  }
  return [m[0][3],m[1][3],m[2][3]];
}

export function buildDualContourSurface({min=[-16,-8,-16],max=[16,8,16],cells=[32,16,32],sampleDistance}) {
  if(typeof sampleDistance!=='function') throw new TypeError('sampleDistance must be a function');
  if(!Array.isArray(min)||!Array.isArray(max)||!Array.isArray(cells)||min.length!==3||max.length!==3||cells.length!==3) throw new TypeError('min, max and cells must be three-element arrays');
  const [nx,ny,nz]=cells.map(v=>Math.floor(v));
  if(nx<2||ny<2||nz<2||cells.some(v=>!Number.isFinite(v)||v!==Math.floor(v))||min.some((v,i)=>!Number.isFinite(v)||!Number.isFinite(max[i])||max[i]<=v)) throw new RangeError('Invalid voxel bounds or resolution');
  const step=max.map((v,i)=>(v-min[i])/[nx,ny,nz][i]);
  const sx=nx+1,sy=ny+1,sz=nz+1;
  const values=new Float32Array(sx*sy*sz);
  const point=(x,y,z)=>[min[0]+x*step[0],min[1]+y*step[1],min[2]+z*step[2]];
  for(let z=0;z<sz;z++)for(let y=0;y<sy;y++)for(let x=0;x<sx;x++){
    const p=point(x,y,z),d=sampleDistance(p[0],p[1],p[2]);
    if(!Number.isFinite(d))throw new TypeError('sampleDistance returned a non-finite value');
    values[key(x,y,z,sx,sy)]=d;
  }
  const cellIds=new Int32Array(nx*ny*nz);cellIds.fill(-1);
  const positions=[],normals=[];
  const gradient=(p)=>{
    const e=Math.min(...step)*.35;
    const dx=sampleDistance(p[0]+e,p[1],p[2])-sampleDistance(p[0]-e,p[1],p[2]);
    const dy=sampleDistance(p[0],p[1]+e,p[2])-sampleDistance(p[0],p[1]-e,p[2]);
    const dz=sampleDistance(p[0],p[1],p[2]+e)-sampleDistance(p[0],p[1],p[2]-e);
    const l=Math.hypot(dx,dy,dz)||1; return [dx/l,dy/l,dz/l];
  };
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const ps=CORNERS.map(([a,b,c])=>point(x+a,y+b,z+c));
    const ds=CORNERS.map(([a,b,c])=>values[key(x+a,y+b,z+c,sx,sy)]);
    if(ds.every(v=>v<0)||ds.every(v=>v>=0))continue;
    const ata=[[0,0,0],[0,0,0],[0,0,0]],atb=[0,0,0],hits=[],ns=[];
    for(const [ia,ib] of EDGES){
      const da=ds[ia],db=ds[ib]; if((da<0)===(db<0))continue;
      const t=clamp(da/(da-db),0,1),p=ps[ia].map((v,i)=>v+(ps[ib][i]-v)*t),n=gradient(p);
      hits.push(p);ns.push(n);
      const q=n[0]*p[0]+n[1]*p[1]+n[2]*p[2];
      for(let r=0;r<3;r++){atb[r]+=n[r]*q;for(let c=0;c<3;c++)ata[r][c]+=n[r]*n[c];}
    }
    if(!hits.length)continue;
    const centre=point(x+.5,y+.5,z+.5),lambda=1e-5;
    for(let i=0;i<3;i++){ata[i][i]+=lambda;atb[i]+=lambda*centre[i];}
    const solved=solve3(ata,atb)??hits.reduce((a,p)=>a.map((v,i)=>v+p[i]/hits.length),[0,0,0]);
    const v=solved.map((n,i)=>clamp(n,min[i]+([x,y,z][i])*step[i],min[i]+([x,y,z][i]+1)*step[i]));
    const normal=ns.reduce((a,n)=>a.map((v,i)=>v+n[i]),[0,0,0]),nl=Math.hypot(...normal)||1;
    const id=positions.length/3;positions.push(...v);normals.push(...normal.map(n=>n/nl));
    cellIds[key(x,y,z,nx,ny)]=id;
  }
  const indices=[];
  const quad=(a,b,c,d,flip)=>{if([a,b,c,d].some(v=>v<0))return;if(flip)indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d);};
  // Each sign-changing lattice edge owns one quad between its four incident cells.
  for(let z=1;z<nz;z++)for(let y=1;y<ny;y++)for(let x=0;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x+1,y,z,sx,sy)];if((a<0)===(b<0))continue;
    quad(cellIds[key(x,y-1,z-1,nx,ny)],cellIds[key(x,y,z-1,nx,ny)],cellIds[key(x,y,z,nx,ny)],cellIds[key(x,y-1,z,nx,ny)],a>=0);
  }
  for(let z=1;z<nz;z++)for(let y=0;y<ny;y++)for(let x=1;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x,y+1,z,sx,sy)];if((a<0)===(b<0))continue;
    quad(cellIds[key(x-1,y,z-1,nx,ny)],cellIds[key(x-1,y,z,nx,ny)],cellIds[key(x,y,z,nx,ny)],cellIds[key(x,y,z-1,nx,ny)],a>=0);
  }
  for(let z=0;z<nz;z++)for(let y=1;y<ny;y++)for(let x=1;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x,y,z+1,sx,sy)];if((a<0)===(b<0))continue;
    quad(cellIds[key(x-1,y-1,z,nx,ny)],cellIds[key(x,y-1,z,nx,ny)],cellIds[key(x,y,z,nx,ny)],cellIds[key(x-1,y,z,nx,ny)],a>=0);
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),vertexCount:positions.length/3,triangleCount:indices.length/3,bounds:{min:[...min],max:[...max]},cells:[nx,ny,nz]};
}

export function sphereSdf(x,y,z,cx,cy,cz,r){return Math.hypot(x-cx,y-cy,z-cz)-r;}
export function smoothUnion(a,b,k=1){const h=clamp(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h);}
