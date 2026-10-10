import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {StoneMaps} from './kingdomEnvironment';

export type LandscapeMaps={ground:StoneMaps,path:StoneMaps,twig:T.Texture,alpha:T.Texture,bark:T.Texture};
const smooth=(a:number,b:number,x:number)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function islandHeight(x:number,z:number){
 const r=Math.hypot(x/42,(z+55)/65),coast=1-smooth(.65,1.04,r);
 const detail=(Math.sin(x*.12+z*.08)+.55*Math.sin(x*.3-z*.17))*.9;
 let h=-8+12*coast+detail*coast;
 // A flattened castle foundation and an approach at the actual gate/stair elevation.
 h=T.MathUtils.lerp(h,3.6,1-smooth(8,16,Math.hypot(x-12.5,z+69)));
 const gateBlend=(1-smooth(27,37,Math.abs(x)))*(1-smooth(-16,-34,z));
 return T.MathUtils.lerp(h,1.4,gateBlend);
}
export const CASTLE_LIFT=5.3;
export const CLIFF_LAYOUT=[
 {x:-29,z:-20,y:-5,sx:4.8,sy:3.2,sz:4.8,rotation:.22},
 {x:30,z:-22,y:-5,sx:4.6,sy:3.2,sz:4.8,rotation:-.3},
 {x:-50,z:-59,y:-7,sx:6,sy:3.6,sz:6.5,rotation:.55},
 {x:49,z:-68,y:-7,sx:6,sy:3.7,sz:6,rotation:-.6},
 {x:-28,z:-101,y:-8,sx:5.5,sy:3.1,sz:5.5,rotation:.5},
 {x:28,z:-108,y:-8,sx:5.8,sy:3.3,sz:6,rotation:-.4},
];

/** The playable court remains clear; all landscape geometry starts behind or beside it. */
export function createKingdomLandscape(maps:LandscapeMaps){
 const group=new T.Group();group.name='kingdom-island-landscape';
 const owned:T.Texture[]=[],materials:T.Material[]=[],time={value:0};
 function copy(t:T.Texture,repeat=1){const c=t.clone();c.wrapS=c.wrapT=T.RepeatWrapping;c.repeat.set(repeat,repeat);c.anisotropy=4;if(!t.image)c.version=0;owned.push(c);return c;}
 const arm=copy(maps.ground.arm),grass=new T.MeshStandardMaterial({map:copy(maps.ground.color),normalMap:copy(maps.ground.normal),roughnessMap:arm,aoMap:arm,normalScale:new T.Vector2(.55,.55),roughness:1,aoMapIntensity:.6,vertexColors:true,color:0xd6dacb});materials.push(grass);
 grass.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vTerrain;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrain=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='varying vec3 vTerrain;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float approach=clamp((-vTerrain.z-16.)/53.,0.,1.);
   float pathX=approach*12.5+sin(approach*3.14159)*5.;
   float path=(1.-smoothstep(1.7,3.6,abs(vTerrain.x-pathX)))*(1.-smoothstep(70.,77.,-vTerrain.z));
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.35,1.03,.74),path*.85);
   diffuseColor.rgb*=.9+.1*sin(vTerrain.x*.13+sin(vTerrain.z*.15));`);
 };grass.customProgramCacheKey=()=> 'island-ground-path-v1';
 const ground=new T.PlaneGeometry(174,125,116,84);ground.rotateX(-Math.PI/2);ground.translate(0,0,-77);
 const p=ground.getAttribute('position'),uv=ground.getAttribute('uv'),colors=new Float32Array(p.count*3),color=new T.Color();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),h=islandHeight(x,z);p.setY(i,h);uv.setXY(i,x/5,z/5);
  const shore=smooth(-5,1,h),variation=.82+.13*Math.sin(x*.18+z*.1);
  color.setRGB(T.MathUtils.lerp(.5,.93*variation,shore),T.MathUtils.lerp(.53,variation,shore),T.MathUtils.lerp(.49,.79*variation,shore));colors.set([color.r,color.g,color.b],i*3);
 }
 ground.setAttribute('color',new T.BufferAttribute(colors,3));ground.computeVertexNormals();
 const groundParts=[ground];
 // Earth continues around the terrace sides, so the stone courtyard has a real foundation.
 for(const side of [-1,1]){
  const g=new T.PlaneGeometry(65,70,32,35);g.rotateX(-Math.PI/2);g.translate(side*54.5,0,20.5);
  const p=g.getAttribute('position'),uv=g.getAttribute('uv'),c=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),d=Math.abs(x)-22;
   const sideHeight=-.18+Math.sin(d/65*Math.PI)*.9-9*smooth(22,56,d)+Math.sin(z*.17)*.22*smooth(0,8,d);
   const h=T.MathUtils.lerp(sideHeight,islandHeight(x,z),smooth(2,-14.5,z));
   p.setY(i,h);uv.setXY(i,x/5,z/5);c.set([.86,.89,.74],i*3);
  }g.setAttribute('color',new T.BufferAttribute(c,3));g.computeVertexNormals();groundParts.push(g);
 }
 const terrainGeometry=mergeGeometries(groundParts)!;groundParts.forEach(g=>g.dispose());
 const terrain=new T.Mesh(terrainGeometry,grass);terrain.name='island-terrain';terrain.receiveShadow=true;terrain.userData.architecture=true;group.add(terrain);
 const pathArm=copy(maps.path.arm),pathMaterial=new T.MeshStandardMaterial({map:copy(maps.path.color),normalMap:copy(maps.path.normal),roughnessMap:pathArm,aoMap:pathArm,aoMapIntensity:.55,color:0xd0c7aa,roughness:1,transparent:true,alphaTest:.05});materials.push(pathMaterial);
 pathMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float pathEdge;varying float vPathEdge;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPathEdge=pathEdge;');
  shader.fragmentShader='varying float vPathEdge;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a*=smoothstep(0.,.16,vPathEdge)*(1.-smoothstep(.84,1.,vPathEdge));');
 };pathMaterial.customProgramCacheKey=()=> 'island-cobble-approach-v1';
 const pathGeo=new T.PlaneGeometry(1,1,4,72),pp=pathGeo.getAttribute('position'),pu=pathGeo.getAttribute('uv'),edge=new Float32Array(pp.count);
 for(let i=0;i<pp.count;i++){const u=pu.getX(i),t=pu.getY(i),z=-16-t*53,centre=t*12.5+Math.sin(t*Math.PI)*5,width=5.2+.4*Math.sin(t*37),x=centre+(u-.5)*width;
  pp.setXYZ(i,x,islandHeight(x,z)+.025,z);pu.setXY(i,x/4.4,z/4.4);edge[i]=u;
 }pathGeo.setAttribute('pathEdge',new T.BufferAttribute(edge,1));pathGeo.computeVertexNormals();
 const path=new T.Mesh(pathGeo,pathMaterial);path.name='castle-approach';path.receiveShadow=true;group.add(path);
 // Two distant headlands produce a broken coast line rather than an empty flat horizon.
 const distantMat=new T.MeshStandardMaterial({color:0x536663,roughness:1});materials.push(distantMat);
 for(const side of [-1,1]){
  const g=new T.PlaneGeometry(170,80,40,20);g.rotateX(-Math.PI/2);g.translate(side*115,0,-183);
  const pos=g.getAttribute('position');for(let i=0;i<pos.count;i++){const x=pos.getX(i)-side*115,z=pos.getZ(i)+183;const r=Math.hypot(x/80,z/38);pos.setY(i,-8+(1-smooth(.28,1,r))*(9+2*Math.sin(x*.06)));}g.computeVertexNormals();
  const mesh=new T.Mesh(g,distantMat);mesh.name='distant-headland';group.add(mesh);
 }
 const bark=new T.MeshStandardMaterial({map:copy(maps.bark,2),color:0xb3b1a0,roughness:1});materials.push(bark);
 const foliage=new T.MeshStandardMaterial({map:copy(maps.twig),alphaMap:copy(maps.alpha),alphaTest:.45,side:T.DoubleSide,color:0xb4c3a2,roughness:1});materials.push(foliage);
 foliage.onBeforeCompile=shader=>{
  shader.uniforms.forestTime=time;shader.vertexShader='uniform float forestTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 root=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   transformed.x+=sin(forestTime+root.x*.17+root.z*.12)*.035*uv.y;`);
 };foliage.customProgramCacheKey=()=> 'pine-needle-wind-v1';
 const twig=new T.PlaneGeometry(1,1),tu=twig.getAttribute('uv');
 // Use the horizontal needle cluster from the publisher's original atlas, without editing it.
 for(let i=0;i<tu.count;i++)tu.setXY(i,.64+tu.getX(i)*.35,.375+tu.getY(i)*.30);
 const trunks:T.BufferGeometry[]=[],poses:T.Matrix4[]=[],dummy=new T.Object3D();let count=0;
 function tree(x:number,z:number,height:number,seed:number){
  const root=islandHeight(x,z);const trunk=new T.CylinderGeometry(.05,height*.021,height,8,3);trunk.translate(x,root+height/2,z);trunks.push(trunk);
  for(let level=0;level<9;level++)for(let branch=0;branch<5;branch++){
   const t=level/9,y=root+height*(.3+.68*t),radius=height*(.22*(1-t)+.025),angle=branch*Math.PI*.4+seed+level*.6;
   for(let cluster=0;cluster<2;cluster++){
    const r=radius*(.48+cluster*.38);dummy.position.set(x+Math.cos(angle)*r,y+.1*Math.sin(seed+branch),z+Math.sin(angle)*r);
    dummy.rotation.set(-.45+(branch%3)*.32,angle+Math.PI/2,.12*Math.sin(seed+level));dummy.scale.set(radius*(1.05-cluster*.12),radius*.65,1);dummy.updateMatrix();poses.push(dummy.matrix.clone());
   }
  }count++;
 }
 for(const side of [-1,1])for(let i=0;i<31;i++){
  const x=side*(20+(i%6)*4.1+2*Math.sin(i*7.13)),z=-22-Math.floor(i/6)*13-3.5*Math.cos(i*5.3);
  if(islandHeight(x,z)<-.5||Math.hypot(x-12.5,z+69)<13)continue;
  tree(x,z,6.5+(i%5)*1.2,i*2.173+side);
 }
 const treeGeometry=mergeGeometries(trunks);if(treeGeometry){const mesh=new T.Mesh(treeGeometry,bark);mesh.name='pine-trunks';mesh.userData.architecture=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}trunks.forEach(g=>g.dispose());
 const needles=new T.InstancedMesh(twig,foliage,poses.length);needles.name='pine-needles';needles.userData.architecture=true;needles.userData.treeCount=count;poses.forEach((m,i)=>needles.setMatrixAt(i,m));needles.instanceMatrix.needsUpdate=true;needles.computeBoundingSphere();needles.castShadow=true;needles.receiveShadow=true;group.add(needles);
 // Sparse grass silhouettes break up the flat texture, with space left for the old approach.
 const bladePositions:number[]=[],bladeColors:number[]=[],bladeIndices:number[]=[];
 for(let b=0;b<3;b++){
  const a=b*Math.PI/3,dx=Math.cos(a)*.035,dz=Math.sin(a)*.035,start=bladePositions.length/3;
  bladePositions.push(-dx,0,-dz,dx,0,dz,dx+.035,.14,dz+.015,-dx+.035,.14,-dz+.015,.07,.26,.04);
  bladeColors.push(.56,.61,.34,.56,.61,.34,.76,.83,.54,.76,.83,.54,.9,.92,.65);
  bladeIndices.push(start,start+1,start+2,start,start+2,start+3,start+3,start+2,start+4);
 }
 const blades=new T.BufferGeometry();blades.setAttribute('position',new T.Float32BufferAttribute(bladePositions,3));blades.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));blades.setIndex(bladeIndices);blades.computeVertexNormals();
 const bladeMat=new T.MeshStandardMaterial({color:0x7f9163,vertexColors:true,side:T.DoubleSide,roughness:1});materials.push(bladeMat);
 const grassPoses:T.Matrix4[]=[];const random=(n:number)=>T.MathUtils.euclideanModulo(Math.sin(n*127.1+43.3)*43758.5453,1);
 for(let i=0;i<1600;i++){
  const x=(random(i+2)-.5)*79,z=-18-random(i+71)*88,h=islandHeight(x,z),t=T.MathUtils.clamp((-z-16)/53,0,1),pathX=t*12.5+Math.sin(t*Math.PI)*5;
  if(h<0||Math.sin(x*.18+z*.15)<.25||Math.abs(x-pathX)<3.2||Math.hypot(x-12.5,z+69)<10)continue;
  dummy.position.set(x,h,z);dummy.rotation.set(0,random(i+40)*Math.PI*2,0);dummy.scale.setScalar(.55+random(i+90)*.9);dummy.updateMatrix();grassPoses.push(dummy.matrix.clone());
 }
 const grassBlades=new T.InstancedMesh(blades,bladeMat,grassPoses.length);grassBlades.name='island-grass';grassPoses.forEach((m,i)=>grassBlades.setMatrixAt(i,m));grassBlades.computeBoundingSphere();grassBlades.receiveShadow=true;group.add(grassBlades);
 const geometries=new Set<T.BufferGeometry>();group.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});let disposed=false;
 return {group,update(now:number,motion:boolean){time.value=motion?now*.0006:0;},dispose(){if(disposed)return;disposed=true;group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());owned.forEach(t=>t.dispose());}};
}
