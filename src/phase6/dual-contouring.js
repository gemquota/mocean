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

export function buildDualContourSurface({min=[-16,-8,-16],max=[16,8,16],cells=[32,16,32],sampleDistance,sampleColumn}) {
  if(typeof sampleDistance!=='function') throw new TypeError('sampleDistance must be a function');
  if(sampleColumn!==undefined&&typeof sampleColumn!=='function') throw new TypeError('sampleColumn must be a function');
  if(!Array.isArray(min)||!Array.isArray(max)||!Array.isArray(cells)||min.length!==3||max.length!==3||cells.length!==3) throw new TypeError('min, max and cells must be three-element arrays');
  const [nx,ny,nz]=cells.map(v=>Math.floor(v));
  if(nx<2||ny<2||nz<2||cells.some(v=>!Number.isFinite(v)||v!==Math.floor(v))||min.some((v,i)=>!Number.isFinite(v)||!Number.isFinite(max[i])||max[i]<=v)) throw new RangeError('Invalid voxel bounds or resolution');
  const step=max.map((v,i)=>(v-min[i])/[nx,ny,nz][i]);
  const sx=nx+1,sy=ny+1,sz=nz+1;
  const values=new Float32Array(sx*sy*sz);
  const point=(x,y,z)=>[min[0]+x*step[0],min[1]+y*step[1],min[2]+z*step[2]];
  // Traverse vertical columns together. Fields that expose sampleColumn
  // can reuse surface height/gradient work for every y sample in a column.
  for(let z=0;z<sz;z++)for(let x=0;x<sx;x++){
    const px=min[0]+x*step[0],pz=min[2]+z*step[2];
    const column=sampleColumn?.(px,pz);
    if(column!==undefined&&typeof column!=='function')throw new TypeError('sampleColumn must return a function');
    for(let y=0;y<sy;y++){
      const py=min[1]+y*step[1],d=column?column(py):sampleDistance(px,py,pz);
      if(!Number.isFinite(d))throw new TypeError('sampleDistance returned a non-finite value');
      values[key(x,y,z,sx,sy)]=d;
    }
  }
  // Precompute normalized lattice gradients once and interpolate them at
  // edge crossings. Re-sampling the signed-distance field six times for every
  // crossing dominated worker time on detailed habitat chunks.
  const gradients=new Float32Array(values.length*3);
  const gradientReady=new Uint8Array(values.length);
  const latticeGradient=index=>{
    if(gradientReady[index])return index*3;
    const x=index%sx,yz=(index-x)/sx,y=yz%sy,z=(yz-y)/sy;
    const xm=Math.max(0,x-1),xp=Math.min(sx-1,x+1);
    const ym=Math.max(0,y-1),yp=Math.min(sy-1,y+1);
    const zm=Math.max(0,z-1),zp=Math.min(sz-1,z+1);
    const dx=(values[key(xp,y,z,sx,sy)]-values[key(xm,y,z,sx,sy)])/((xp-xm)*step[0]||1);
    const dy=(values[key(x,yp,z,sx,sy)]-values[key(x,ym,z,sx,sy)])/((yp-ym)*step[1]||1);
    const dz=(values[key(x,y,zp,sx,sy)]-values[key(x,y,zm,sx,sy)])/((zp-zm)*step[2]||1);
    const length=Math.hypot(dx,dy,dz)||1,offset=index*3;
    gradients[offset]=dx/length;gradients[offset+1]=dy/length;gradients[offset+2]=dz/length;
    gradientReady[index]=1;
    return offset;
  };
  const gradientAt=(a,b,t)=>{
    const ia=latticeGradient(a),ib=latticeGradient(b),blend=1-t;
    const dx=gradients[ia]*blend+gradients[ib]*t;
    const dy=gradients[ia+1]*blend+gradients[ib+1]*t;
    const dz=gradients[ia+2]*blend+gradients[ib+2]*t;
    const length=Math.hypot(dx,dy,dz)||1;
    return [dx/length,dy/length,dz/length];
  };
  // Multi-component dual contouring: a cell may contain more than one
  // disconnected surface patch (for example, a cave roof and floor). Keep a
  // separate QEF vertex for each connected patch instead of welding them.
  const cellEdgeIds=new Int32Array(nx*ny*nz*12);cellEdgeIds.fill(-1);
  const positions=[],normals=[];
  const faces=[
    {corners:[0,1,2,3],edges:[0,1,2,3]},
    {corners:[4,5,6,7],edges:[4,5,6,7]},
    {corners:[0,1,5,4],edges:[0,9,4,8]},
    {corners:[3,2,6,7],edges:[2,10,6,11]},
    {corners:[0,3,7,4],edges:[3,11,7,8]},
    {corners:[1,2,6,5],edges:[1,10,5,9]}
  ];
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const ids=CORNERS.map(([a,b,c])=>key(x+a,y+b,z+c,sx,sy));
    const ps=CORNERS.map(([a,b,c])=>point(x+a,y+b,z+c));
    const ds=ids.map(index=>values[index]);
    if(ds.every(v=>v<0)||ds.every(v=>v>=0))continue;
    const crossing=EDGES.map(([ia,ib])=>(ds[ia]<0)!==(ds[ib]<0));
    const parent=Int8Array.from({length:12},(_,i)=>i);
    const find=v=>{while(parent[v]!==v){parent[v]=parent[parent[v]];v=parent[v];}return v;};
    const union=(u,v)=>{const ru=find(u),rv=find(v);if(ru!==rv)parent[rv]=ru;};
    for(const face of faces){
      const crossed=face.edges.filter(edge=>crossing[edge]);
      if(crossed.length===2)union(crossed[0],crossed[1]);
      else if(crossed.length===4){
        const centre=face.corners.reduce((sum,index)=>sum+ds[index],0)*.25;
        const centreInside=centre<0,cornerInside=ds[face.corners[0]]<0;
        if(centreInside===cornerInside){union(face.edges[0],face.edges[1]);union(face.edges[2],face.edges[3]);}
        else{union(face.edges[3],face.edges[0]);union(face.edges[1],face.edges[2]);}
      }
    }
    const groups=new Map();
    for(let edge=0;edge<12;edge++)if(crossing[edge]){
      const root=find(edge);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(edge);
    }
    const cellIndex=key(x,y,z,nx,ny);
    for(const group of groups.values()){
      const ata=[[0,0,0],[0,0,0],[0,0,0]],atb=[0,0,0],hits=[],ns=[];
      for(const edge of group){
        const [ia,ib]=EDGES[edge],da=ds[ia],db=ds[ib];
        const t=clamp(da/(da-db),0,1),p=ps[ia].map((v,i)=>v+(ps[ib][i]-v)*t),n=gradientAt(ids[ia],ids[ib],t);
        hits.push(p);ns.push(n);
        const q=n[0]*p[0]+n[1]*p[1]+n[2]*p[2];
        for(let r=0;r<3;r++){atb[r]+=n[r]*q;for(let c=0;c<3;c++)ata[r][c]+=n[r]*n[c];}
      }
      if(!hits.length)continue;
      const centre=point(x+.5,y+.5,z+.5),lambda=1e-5;
      for(let i=0;i<3;i++){ata[i][i]+=lambda;atb[i]+=lambda*centre[i];}
      const solved=solve3(ata,atb)??hits.reduce((acc,p)=>acc.map((v,i)=>v+p[i]/hits.length),[0,0,0]);
      const vertex=solved.map((v,i)=>clamp(v,min[i]+[x,y,z][i]*step[i],min[i]+([x,y,z][i]+1)*step[i]));
      // Multiple QEF patches can collapse to exactly collinear cell vertices at
      // sharp intersecting formations. A sub-millimetre deterministic tangential
      // nudge preserves shared topology while avoiding zero-area triangles.
      const gx=Math.round(min[0]/step[0])+x,gy=Math.round(min[1]/step[1])+y,gz=Math.round(min[2]/step[2])+z;
      const hash=((gx*73856093)^(gy*19349663)^(gz*83492791)^(group[0]*2654435761))>>>0;
      const jitter=Math.min(...step)*.001;
      vertex[0]+=(((hash&1023)/1023)-.5)*jitter;
      vertex[1]+=((((hash>>>10)&1023)/1023)-.5)*jitter;
      vertex[2]+=((((hash>>>20)&1023)/1023)-.5)*jitter;
      const normal=ns.reduce((acc,n)=>acc.map((v,i)=>v+n[i]),[0,0,0]),nl=Math.hypot(...normal)||1;
      const id=positions.length/3;positions.push(...vertex);normals.push(...normal.map(n=>n/nl));
      for(const edge of group)cellEdgeIds[cellIndex*12+edge]=id;
    }
  }
  const indices=[];
  const pushTriangle=(a,b,c)=>{
    if(a<0||b<0||c<0)return;
    const ia=a*3,ib=b*3,ic=c*3;
    const ux=positions[ib]-positions[ia],uy=positions[ib+1]-positions[ia+1],uz=positions[ib+2]-positions[ia+2];
    const vx=positions[ic]-positions[ia],vy=positions[ic+1]-positions[ia+1],vz=positions[ic+2]-positions[ia+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const gx=normals[ia]+normals[ib]+normals[ic],gy=normals[ia+1]+normals[ib+1]+normals[ic+1],gz=normals[ia+2]+normals[ib+2]+normals[ic+2];
    if(nx*gx+ny*gy+nz*gz<0)indices.push(a,c,b);else indices.push(a,b,c);
  };
  const quad=(a,b,c,d,flip)=>{
    if([a,b,c,d].some(v=>v<0))return;
    if(flip){pushTriangle(a,c,b);pushTriangle(a,d,c);}
    else{pushTriangle(a,b,c);pushTriangle(a,c,d);}
  };
  // Each sign-changing lattice edge owns one quad between its four incident
  // cell-component vertices. Edge IDs are local to each incident cell.
  for(let z=1;z<nz;z++)for(let y=1;y<ny;y++)for(let x=0;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x+1,y,z,sx,sy)];if((a<0)===(b<0))continue;
    quad(
      cellEdgeIds[key(x,y-1,z-1,nx,ny)*12+6],
      cellEdgeIds[key(x,y,z-1,nx,ny)*12+4],
      cellEdgeIds[key(x,y,z,nx,ny)*12+0],
      cellEdgeIds[key(x,y-1,z,nx,ny)*12+2],a>=0
    );
  }
  for(let z=1;z<nz;z++)for(let y=0;y<ny;y++)for(let x=1;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x,y+1,z,sx,sy)];if((a<0)===(b<0))continue;
    quad(
      cellEdgeIds[key(x-1,y,z-1,nx,ny)*12+5],
      cellEdgeIds[key(x-1,y,z,nx,ny)*12+1],
      cellEdgeIds[key(x,y,z,nx,ny)*12+3],
      cellEdgeIds[key(x,y,z-1,nx,ny)*12+7],a>=0
    );
  }
  for(let z=0;z<nz;z++)for(let y=1;y<ny;y++)for(let x=1;x<nx;x++){
    const a=values[key(x,y,z,sx,sy)],b=values[key(x,y,z+1,sx,sy)];if((a<0)===(b<0))continue;
    quad(
      cellEdgeIds[key(x-1,y-1,z,nx,ny)*12+10],
      cellEdgeIds[key(x,y-1,z,nx,ny)*12+11],
      cellEdgeIds[key(x,y,z,nx,ny)*12+8],
      cellEdgeIds[key(x-1,y,z,nx,ny)*12+9],a>=0
    );
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),vertexCount:positions.length/3,triangleCount:indices.length/3,bounds:{min:[...min],max:[...max]},cells:[nx,ny,nz]};
}

export function sphereSdf(x,y,z,cx,cy,cz,r){return Math.hypot(x-cx,y-cy,z-cz)-r;}
export function smoothUnion(a,b,k=1){const h=clamp(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h);}
