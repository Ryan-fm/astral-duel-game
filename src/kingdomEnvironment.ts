import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CASTLE_LIFT} from './kingdomLandscape.ts';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type StoneMaps={color:T.Texture,normal:T.Texture,arm:T.Texture};
export type KingdomMaps={floor:StoneMaps,stone:StoneMaps};

/** A single world, with scanned PBR surfaces and camera-consistent near/far scenery. */
export function createKingdomEnvironment(maps:KingdomMaps){
 const group=new T.Group();group.name='kingdom-spatial-environment';
 const textures:T.Texture[]=[],materials:T.Material[]=[],batches=new Map<T.Material,T.BufferGeometry[]>();
 function copy(source:T.Texture,repeatX=1,repeatY=1){const t=source.clone();t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=4;if(!source.image)t.version=0;textures.push(t);return t;}
 function pbr(source:StoneMaps,color:number,repeatX=1,repeatY=1){
  const arm=copy(source.arm,repeatX,repeatY),m=new T.MeshStandardMaterial({map:copy(source.color,repeatX,repeatY),normalMap:copy(source.normal,repeatX,repeatY),normalScale:new T.Vector2(.55,.55),roughnessMap:arm,aoMap:arm,aoMapIntensity:.75,roughness:1,color});materials.push(m);return m;
 }
 const stone=pbr(maps.stone,0xc8d1d6),pale=stone.clone(),dark=stone.clone();pale.color.set(0xe0e2dd);dark.color.set(0x949eaa);materials.push(pale,dark);
 const paving=pbr(maps.floor,0xb5c1cc,52/4.4,44/4.4);paving.normalScale.set(.68,.68);paving.roughness=.82;
 const leafMaterial=new T.MeshStandardMaterial({color:0x596749,roughness:.87,side:T.DoubleSide,vertexColors:true});materials.push(leafMaterial);
 const stemMaterial=new T.MeshStandardMaterial({color:0x555240,roughness:1});materials.push(stemMaterial);
 const cloth=new T.MeshStandardMaterial({color:0x584952,roughness:1,side:T.DoubleSide});materials.push(cloth);
 const voidMaterial=new T.MeshBasicMaterial({color:0x111c20});materials.push(voidMaterial);
 const metal=new T.MeshStandardMaterial({color:0x5d5546,metalness:.55,roughness:.72});materials.push(metal);
 const seaTime={value:0},leafTime={value:0};
 cloth.onBeforeCompile=shader=>{shader.uniforms.bannerTime=leafTime;shader.vertexShader='uniform float bannerTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat loose=clamp((5.7-position.y)/3.7,0.,1.);transformed.z+=sin(bannerTime*1.4+position.x*3.+position.y*2.)*loose*.15;`);};cloth.customProgramCacheKey=()=> 'kingdom-banner-wind-v1';
 // Damp mineral staining follows stone world positions, independent of UV seams and camera motion.
 for(const material of [stone,pale,dark,paving]){
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vStoneWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vStoneWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`);
   shader.fragmentShader=`varying vec3 vStoneWorld;
    float patina(vec3 p){return .5+.25*sin(p.x*2.1+sin(p.z*1.3))+.25*sin(p.z*3.9+p.y*2.7);}
    `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float wear=patina(vStoneWorld);
    if(vStoneWorld.z<-35.0){
     float course=vStoneWorld.y*1.8;vec2 joint=fract(vec2(vStoneWorld.x*1.6+mod(floor(course),2.0)*.5,course));
     float seam=1.0-smoothstep(.015,.05,min(min(joint.x,1.0-joint.x),min(joint.y,1.0-joint.y)));
     diffuseColor.rgb*=1.0-seam*.28;
    }
    float margin=max(smoothstep(9.5,13.0,abs(vStoneWorld.x)),1.0-smoothstep(-13.0,-9.0,vStoneWorld.z));
    float stain=margin*(1.0-smoothstep(.15,2.1,vStoneWorld.y))*smoothstep(.32,.77,wear)*.58;
    diffuseColor.rgb*=.91+.09*smoothstep(.12,.85,wear);
    diffuseColor.rgb*=1.0-stain*.32;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.63,.8,.55),stain);`);
  };material.customProgramCacheKey=()=> 'kingdom-pbr-patina-v2';
 }
 function solid(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,rotation=0,project=true){
  const shape=geometry.index?geometry.toNonIndexed():geometry;shape.deleteAttribute('uv1');
  shape.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y+(z<-35?CASTLE_LIFT:0),z+(z<-35?-20:0)),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),new T.Vector3(1,1,1)));
  if(project){const p=shape.getAttribute('position'),n=shape.getAttribute('normal'),uv=shape.getAttribute('uv');
   for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));uv.setXY(i,(ay>ax&&ay>az?p.getX(i):ax>az?p.getZ(i):p.getX(i))*.45,(ay>ax&&ay>az?p.getZ(i):p.getY(i))*.45);}
  }
  if(shape!==geometry)geometry.dispose();const list=batches.get(material)||[];list.push(shape);batches.set(material,list);
 }
 function block(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=stone,rotation=0){
  const geometry=new RoundedBoxGeometry(w,h,d,z<-35?1:2,Math.min(.09,h*.16,w*.07,d*.07)),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  // Edge erosion varies per block, rather than repeating one perfect beveled box.
  const seed=x*7.73+z*4.23+y*11.1;
  for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),noise=Math.sin(vx*7+vy*13+vz*9+seed)*Math.sin(vz*11-vy*8+seed);const chip=.027*noise;
   p.setXYZ(i,vx+n.getX(i)*chip,vy+n.getY(i)*chip,vz+n.getZ(i)*chip);
  }geometry.computeVertexNormals();solid(geometry,m,x,y,z,rotation);
 }
 function cylinder(r:number,h:number,x:number,y:number,z:number,m:T.Material=stone,top=r){solid(new T.CylinderGeometry(top,r,h,32),m,x,y,z);}
 function rock(x:number,y:number,z:number,sx:number,sy:number,sz:number,seed:number,m:T.Material=dark){
  const g=new T.IcosahedronGeometry(1,1),p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),v=1+.14*Math.sin(vx*5+vy*8+vz*13+seed);p.setXYZ(i,vx*sx*v,vy*sy*v,vz*sz*v);}g.computeVertexNormals();solid(g,m,x,y,z,seed*.73);
 }
 // The courtyard is continuous; irregular slab joints and stone relief come from measured maps.
 const underlay=new T.Mesh(new T.PlaneGeometry(70,70),dark);underlay.name='world-ground';underlay.rotation.x=-Math.PI/2;underlay.position.set(0,-.12,17);underlay.receiveShadow=true;group.add(underlay);
 const floorGeometry=new T.PlaneGeometry(52,44,104,88),fp=floorGeometry.getAttribute('position');
 for(let i=0;i<fp.count;i++)fp.setZ(i,.008*Math.sin(fp.getX(i)*1.7)*Math.cos(fp.getY(i)*1.3));floorGeometry.computeVertexNormals();
 const floor=new T.Mesh(floorGeometry,paving);floor.name='stone-courtyard';floor.rotation.x=-Math.PI/2;floor.position.set(0,-.032,4);floor.receiveShadow=true;group.add(floor);
 function column(x:number,z:number,h:number,broken=false){
  block(1.7,.25,1.7,x,.1,z,dark);block(1.4,.2,1.4,x,.31,z,pale);cylinder(.64,.18,x,.5,z,pale);
  const shaft=new T.CylinderGeometry(.47,.56,h,64,14),p=shaft.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const vx=p.getX(i),vz=p.getZ(i),vy=p.getY(i),r=Math.hypot(vx,vz),a=Math.atan2(vz,vx),groove=.023*(1+Math.cos(a*20)),erode=.009*Math.sin(a*9+vy*8+x);
   if(r>.1){const radius=Math.max(.1,r-groove+erode);p.setX(i,vx*radius/r);p.setZ(i,vz*radius/r);}
   if(broken&&vy>h*.4)p.setY(i,vy-.12-.18*(1+Math.sin(a*3+x))-.045*Math.sin(a*7));
  }shaft.computeVertexNormals();solid(shaft,stone,x,.6+h/2,z);
  if(!broken){cylinder(.59,.16,x,h+.64,z,pale);cylinder(.67,.18,x,h+.82,z,pale);block(1.5,.25,1.5,x,h+1.03,z,pale);}
 }
 for(const side of [-1,1]){
  for(let i=0;i<4;i++){const z=-13+i*5.1;column(side*13,z,i>=2?2.15+(i%2)*.9:5.15,i>=2);}
  block(1,.55,5.15,side*13,6.32,-10.45,pale);block(.95,.4,1.65,side*13,6.27,-6.7,pale,.025*side);
  // Real masonry courses with staggered joints, chipped edges and a modest capstone.
  for(let row=0;row<3;row++)for(let i=0;i<17;i++)block(1.355,.545,.84,side*(4.1+i*1.38+(row%2)*.32),.25+row*.56,-14.3,i%3?stone:dark,(Math.sin(i*7+row)*.008));
  for(let i=0;i<14;i++)block(1.68,.22,1.05,side*(4.35+i*1.7),1.75,-14.3,pale);
  for(let step=0;step<4;step++)for(let i=0;i<6;i++)block(1.65,.33,1,side*9+(i-2.5)*1.65,step*.28,-12.1-step*.85,i%3?stone:dark);
 }
 for(let i=0;i<7;i++)for(let j=0;j<4;j++)block(1.28,.22+i*.22,.85,(j-1.5)*1.3,i*.11,-10.9-i*.72,j%3?stone:dark);
 for(const side of [-1,1]){
  for(let i=0;i<7;i++)block(1.36,.55,1.15,side*2.72,1.5+i*.57,-16,i%2?stone:pale,.005*Math.sin(i*8));
  block(1.6,.24,1.4,side*2.72,1.1,-16,dark);
 }
 for(let i=0;i<15;i++){
  const a=i*Math.PI/15+.008,b=(i+1)*Math.PI/15-.008,shape=new T.Shape();shape.moveTo(Math.cos(a)*2.16,Math.sin(a)*2.16);shape.lineTo(Math.cos(a)*2.98,Math.sin(a)*2.98);
  shape.absarc(0,0,2.98,a,b,false);shape.lineTo(Math.cos(b)*2.16,Math.sin(b)*2.16);shape.absarc(0,0,2.16,b,a,true);shape.closePath();
  solid(new T.ExtrudeGeometry(shape,{depth:1.05,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:2,curveSegments:4}),i%3?pale:stone,0,5.24,-16.55);
 }
 // Rubble is worn rock, not evenly spaced cubes. Everything remains outside card zones.
 for(const side of [-1,1])for(let i=0;i<30;i++){
  const x=side*(11.6+(i%5)*.76+.3*Math.sin(i*4.3)),z=-11+Math.floor(i/5)*3.1+.65*Math.sin(i*7.1),r=.22+(i%4)*.1;
  rock(x,r*.35,z,r,r*.45,r*.7,i+side);
 }
 const fallen=new T.CylinderGeometry(.5,.55,2.2,32,6);fallen.rotateZ(Math.PI/2);solid(fallen,stone,-12.2,.49,.9,.23);
 // Small, folded leaves and thin climbing stems give age and scale to the margins.
 function leaf(x:number,y:number,z:number,scale:number,rotation:number,seed:number){
  const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.55,.55,0,1.2);shape.quadraticCurveTo(.55,.55,0,0);
  const g=new T.ShapeGeometry(shape,3),p=g.getAttribute('position'),c=new Float32Array(p.count*3),color=new T.Color();
  for(let i=0;i<p.count;i++){p.setZ(i,.13*Math.abs(p.getX(i))-.08*Math.sin(p.getY(i)*3));color.setRGB(.76+.12*Math.sin(seed),.8+.12*Math.cos(seed*2),.68);c.set([color.r,color.g,color.b],i*3);}g.setAttribute('color',new T.BufferAttribute(c,3));g.scale(scale,scale,scale);g.computeVertexNormals();solid(g,leafMaterial,x,y,z,rotation,false);
 }
 for(const side of [-1,1])for(let vine=0;vine<3;vine++){
  const x=side*(12.5+vine*.32),z=-12.55+vine*.14,points:T.Vector3[]=[];
  for(let i=0;i<11;i++){const y=.2+i*.29,px=x+.12*Math.sin(i*.7+vine);points.push(new T.Vector3(px,y,z+.07*Math.sin(i)));leaf(px,y,z,.22+.06*Math.sin(i*3),side*.6+i*.5,i+vine);leaf(px,y-.08,z+.08,.15,-side*.9-i*.3,i+3);}
  solid(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.012,4,false),stemMaterial,0,0,0,0,false);
 }
 for(const side of [-1,1])for(let plant=0;plant<10;plant++)for(let i=0;i<5;i++)leaf(side*(11.6+(plant%3)*.9)+.1*Math.sin(i),.05,-9+Math.floor(plant/3)*4+.13*Math.cos(i),.22+(i%3)*.07,i*1.26+plant,i+plant);
 leafMaterial.onBeforeCompile=shader=>{shader.uniforms.leafTime=leafTime;shader.vertexShader='uniform float leafTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n transformed.x+=sin(position.x*.6+position.y*1.3+leafTime)*.028*min(position.y,2.0);`);};leafMaterial.customProgramCacheKey=()=> 'kingdom-leaf-wind';
 for(const side of [-1,1]){
  const banner=new T.PlaneGeometry(1.7,3.7,10,18),p=banner.getAttribute('position');for(let i=0;i<p.count;i++){p.setZ(i,Math.sin(p.getX(i)*4+p.getY(i)*.8)*.11);if(p.getY(i)<-1.7)p.setY(i,p.getY(i)+.1*(1+Math.sin(p.getX(i)*14)));}banner.computeVertexNormals();solid(banner,cloth,side*11.65,3.8,-13.7,0,false);block(2.1,.08,.12,side*11.65,5.7,-13.72,metal);
 }
 // Actual cliff and castle silhouettes replace the enormous flat illustrated ruins.
 for(const x of [8,17]){
  cylinder(1.35,6.1,x,1.65,-45,dark,1.25);cylinder(1.5,.35,x,4.7,-45,stone);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;block(.57,.72,.57,x+Math.sin(a)*1.23,5.2,-45+Math.cos(a)*1.23,stone,a);}
  // Arrow slits are dark recessed openings at far distance.
  block(.18,1,.04,x,2.4,-43.65,voidMaterial);
 }
 block(8.5,4.2,3.5,12.5,.7,-47,dark);block(4.8,7.5,4.3,12.7,2.3,-49,stone);
 for(let i=0;i<6;i++)block(.74,.7,.6,9+i*1.42,3.18,-45.25,stone);
 for(const x of [11.1,12.7,14.3])block(.35,1.2,.04,x,3.1,-46.82,voidMaterial);
 const entry=new T.Shape();entry.moveTo(-.72,0);entry.lineTo(.72,0);entry.lineTo(.72,1.62);entry.absarc(0,1.62,.72,0,Math.PI,false);entry.lineTo(-.72,0);
 solid(new T.ShapeGeometry(entry,8),voidMaterial,12.5,-1.55,-45.21);
 for(const side of [-1,1])for(let row=0;row<4;row++)block(.27,.42,.13,12.5+side*.91,-1.34+row*.44,-45.14,pale);
 for(let i=0;i<7;i++){const a=i*Math.PI/6;block(.3,.31,.13,12.5+Math.cos(a)*.87,.06+Math.sin(a)*.87,-45.13,pale);}
 const roof=new T.ConeGeometry(3.7,3,4);roof.rotateY(Math.PI/4);solid(roof,dark,12.7,7.55,-49);
 // Static batches keep the richer architecture affordable on a phone GPU.
 for(const [material,parts] of batches){const merged=mergeGeometries(parts);if(!merged)throw new Error('Invalid kingdom geometry');const mesh=new T.Mesh(merged,material);mesh.name=material===leafMaterial?'ruin-ivy':'ruin-architecture';mesh.userData.architecture=true;mesh.receiveShadow=true;mesh.castShadow=material!==cloth&&material!==leafMaterial;group.add(mesh);parts.forEach(g=>g.dispose());}
 const seaMaterial=new T.MeshStandardMaterial({color:0x174450,roughness:.22,metalness:.1,envMapIntensity:1.3});materials.push(seaMaterial);
 seaMaterial.onBeforeCompile=shader=>{
  shader.uniforms.seaTime=seaTime;shader.vertexShader='varying vec3 vSeaWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vSeaWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`);
  shader.fragmentShader='varying vec3 vSeaWorld;uniform float seaTime;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 p=vSeaWorld.xz;float t=seaTime;
   vec2 slope=vec2(0.);
   slope+=vec2(.81,.57)*cos(dot(p,vec2(.81,.57))*.47+t)*.035;
   slope+=vec2(-.39,.92)*cos(dot(p,vec2(-.39,.92))*.83-t*.73)*.022;
   slope+=vec2(.24,.97)*cos(dot(p,vec2(.24,.97))*2.7+t*1.6)*.009;
   slope+=vec2(.93,-.36)*cos(dot(p,vec2(.93,-.36))*5.2-t*2.1)*.006;
   normal=normalize(normal+mat3(viewMatrix)*vec3(slope.x,0.,slope.y));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float depth=clamp((-vSeaWorld.z-20.)/170.,0.,1.);
   diffuseColor.rgb=mix(vec3(.10,.28,.30),vec3(.035,.115,.17),depth);
   float shimmer=pow(max(0.,sin(vSeaWorld.x*.19+vSeaWorld.z*.23+seaTime)),16.);
   diffuseColor.rgb+=shimmer*.008;`);
 };seaMaterial.customProgramCacheKey=()=> 'kingdom-sea-multiscale-v2';
 const sea=new T.Mesh(new T.PlaneGeometry(800,800),seaMaterial);sea.name='island-sea';sea.rotation.x=-Math.PI/2;sea.position.set(0,-6.5,-120);group.add(sea);
 const flames:T.Mesh[]=[],flameMat=new T.MeshBasicMaterial({color:0xffc281,transparent:true,opacity:.6,depthWrite:false});materials.push(flameMat);
 for(const side of [-1,1]){const basin=new T.Mesh(new T.CylinderGeometry(.4,.2,.25,16),metal);basin.position.set(side*10.7,2,-10.5);group.add(basin);const flame=new T.Mesh(new T.ConeGeometry(.15,.45,8),flameMat);flame.position.set(side*10.7,2.36,-10.5);group.add(flame);flames.push(flame);const light=new T.PointLight(0xffbc79,7,7,2);light.position.set(side*10.7,2.7,-10.5);group.add(light);}
 const geometries=new Set<T.BufferGeometry>();group.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});
 return {group,update(time:number,motion:boolean){seaTime.value=motion?time*.0007:0;leafTime.value=motion?time*.0008:0;flames.forEach((f,i)=>f.scale.y=motion?1+Math.sin(time*.008+i)*.12:1);},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
