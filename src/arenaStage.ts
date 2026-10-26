import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Ground-bound inlays. No opaque stage: the environment's own floor remains visible. */
export function createArenaStage(city:boolean){
 const group=new T.Group();group.name=city?'city-inlays':'roman-inlays';
 const metal=city?0x81d9f5:0x91d1db,dim=city?0x42758f:0x607e9d;
 const materials:T.Material[]=[],textures:T.Texture[]=[];
 function line(points:T.Vector3[],color=metal,opacity=.48,loop=false){const m=new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});materials.push(m);const mesh=loop?new T.LineLoop(new T.BufferGeometry().setFromPoints(points),m):new T.Line(new T.BufferGeometry().setFromPoints(points),m);group.add(mesh);return mesh;}
 const point=(x:number,z:number)=>new T.Vector3(x,.003,z);
 // A seal and engraved centre seam provide a focal point between the two players.
 const radius=city?1.05:1.12;
 for(const r of [radius,radius*.83]){line(Array.from({length:64},(_,i)=>point(Math.sin(i*Math.PI/32)*r,Math.cos(i*Math.PI/32)*r)),metal,.42,true);}
 for(let i=0;i<16;i++){const a=i*Math.PI/8;line([point(Math.sin(a)*radius*1.03,Math.cos(a)*radius*1.03),point(Math.sin(a)*radius*1.11,Math.cos(a)*radius*1.11)],metal,.55);}
 const star:T.Vector3[]=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.24:.64;star.push(point(Math.sin(a)*r,Math.cos(a)*r));}line(star,metal,.65,true);
 for(const side of [-1,1]){
  line([point(side*1.5,0),point(side*6.9,0)],metal,.48);
  line([point(side*1.6,.07),point(side*6.65,.07)],dim,.35);
  for(const x of [2.2,4.3,6.4])line([point(side*x-.12,0),point(side*x,-.14),point(side*x+.12,0),point(side*x,.14)],metal,.48,true);
 }
 // Stepped corner marks surround the field without creating an outer board silhouette.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*7.55,z=sz*6.95;
  line([point(x-sx*.7,z),point(x,z),point(x,z-sz*.65)],metal,.65);
  line([point(x-sx*.46,z-sz*.13),point(x-sx*.13,z-sz*.13),point(x-sx*.13,z-sz*.46)],dim,.6);
 }
 // Sparse dust motes are spatial, rather than a CSS film over the whole screen.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.16,'rgba(255,255,255,.7)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
 const texture=new T.CanvasTexture(canvas);textures.push(texture);
 const positions=new Float32Array(28*3);for(let i=0;i<28;i++){positions[i*3]=Math.sin(i*7.3)*10;positions[i*3+1]=.5+(i%7)*.37;positions[i*3+2]=Math.cos(i*3.9)*7;}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const dustMaterial=new T.PointsMaterial({map:texture,color:city?0x9de9ff:0xb0e6dc,size:city?.065:.047,transparent:true,opacity:city?.36:.25,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});materials.push(dustMaterial);const dust=new T.Points(geometry,dustMaterial);group.add(dust);
 return {group,update(time:number,motion:boolean){dust.visible=motion;if(motion){dust.rotation.y=Math.sin(time*.00004)*.025;dust.position.y=Math.sin(time*.00035)*.16;}},dispose(){group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}

export function createZoneInlay(city:boolean,own:boolean,legal:boolean,drop:boolean,hover:boolean){
 const group=new T.Group(),color=new T.Color(hover?0xffdc92:drop?0x97fff4:legal?0xbfefff:own?(city?0x89cbdf:0x8fcfdc):(city?0xb9a9db:0xbaaddf));
 const material=new T.MeshBasicMaterial({color,transparent:true,opacity:hover?.26:drop?.13:legal?.07:city?.038:.045,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 const plane=new T.Mesh(new T.PlaneGeometry(2.18,2.5),material);plane.rotation.x=-Math.PI/2;plane.position.y=.008;group.add(plane);
 // Per-vertex alpha packs corners, shadow cuts, perimeter and engraving into one draw.
 const positions:number[]=[],colors:number[]=[],w=1.09,h=1.25;
 function segment(x:number,z:number,x2:number,z2:number,alpha:number,c=color,y=.012){
  positions.push(x,y,z,x2,y,z2);for(let i=0;i<2;i++)colors.push(c.r,c.g,c.b,alpha);
 }
 const strong=hover||drop?1:legal?.9:city?.58:.65,dim=hover||drop?.8:city?.22:.32;
 for(const sx of [-1,1])for(const sz of [-1,1]){
  segment(sx*w,sz*(h-.55),sx*w,sz*h,strong);segment(sx*w,sz*h,sx*(w-.48),sz*h,strong);
  segment(sx*(w-.085),sz*(h-.38),sx*(w-.085),sz*(h-.085),strong*.8);segment(sx*(w-.085),sz*(h-.085),sx*(w-.34),sz*(h-.085),strong*.8);
 }
 for(const side of [-1,1]){segment(-w,side*h,w,side*h,dim);segment(side*w,-h,side*w,h,dim);segment(-.45,side*h,.45,side*h,strong);segment(side*w,-.6,side*w,.6,strong);}
 const diamond=[[0,-.4],[.24,0],[0,.4],[-.24,0]];
 for(let i=0;i<4;i++)segment(...diamond[i] as [number,number],...diamond[(i+1)%4] as [number,number],drop?.65:.2);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,4));
 group.add(new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false})));
 return group;
}

/** All twenty legal sockets keep individual signals but cost only two world draws. */
export function batchZoneInlays(zones:T.Group[]){
 const group=new T.Group(),planes:T.BufferGeometry[]=[],lines:T.BufferGeometry[]=[];group.name='batched-card-sockets';
 for(const zone of zones){zone.updateMatrix();for(const child of [...zone.children]){
  if(!(child instanceof T.Mesh||child instanceof T.LineSegments)||Array.isArray(child.material))continue;
  child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix).applyMatrix4(zone.matrix);
  if(child instanceof T.Mesh){const material=child.material as T.MeshBasicMaterial,color=material.color,values=new Float32Array(geometry.getAttribute('position').count*4);for(let i=0;i<values.length;i+=4)values.set([color.r,color.g,color.b,material.opacity],i);geometry.setAttribute('color',new T.BufferAttribute(values,4));planes.push(geometry);}else lines.push(geometry);
  child.geometry.dispose();child.material.dispose();zone.remove(child);
 }}
 if(planes.length){const mesh=new T.Mesh(mergeGeometries(planes)!,new T.MeshBasicMaterial({vertexColors:true,transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false}));mesh.renderOrder=-10;group.add(mesh);}
 if(lines.length){const mesh=new T.LineSegments(mergeGeometries(lines)!,new T.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false}));mesh.renderOrder=-9;group.add(mesh);}
 [...planes,...lines].forEach(geometry=>geometry.dispose());return group;
}
