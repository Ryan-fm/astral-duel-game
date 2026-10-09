import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Local, volumetric sculptures. No card textures, billboards or network assets. */
export const MONSTER_MODELS = ['blue_eyes','dark_magician','red_eyes','summoned_skull','luster_dragon','battle_ox','celtic_guardian','mystical_elf','giant_soldier','kuriboh','alexandrite_dragon','dragon_zombie','gemini_elf','harpie_lady','hyozanryu','saggi','seiyaryu','silver_fang'] as const;
type Mat = T.MeshStandardMaterial;
type Vec = [number,number,number];
export type MonsterActor = {root:T.Group, id:string, height:number, update:(seconds:number,motion?:{birth?:number,attack?:number,hit?:number},still?:boolean)=>void, dispose:()=>void};
const v = (p:Vec)=>new T.Vector3(...p);
function material(color:number,metalness=.05,roughness=.65,emissive=0):Mat {return new T.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:emissive?.65:0});}
// Tiny geometric discoloration across surfaces gives stone/armor a worn, tactile finish.
function surfaceDetail(group:T.Group){group.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh)return;const m=o.material as Mat;if(m.emissive?.getHex()||m.roughness<.3)return;const g=o.geometry,p=g.getAttribute('position'),colors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const n=.93+.065*Math.sin(x*84+y*57+z*37)*Math.sin(y*92-x*39);colors[i*3]=n;colors[i*3+1]=n;colors[i*3+2]=n;}g.setAttribute('color',new T.BufferAttribute(colors,3));m.vertexColors=true;});}
function cuirass(parent:T.Group,m:Mat){const points=[new T.Vector2(.215,1.5),new T.Vector2(.26,1.7),new T.Vector2(.36,1.91),new T.Vector2(.34,2.13),new T.Vector2(.16,2.25)];const g=new T.LatheGeometry(points,32);g.scale(1,1,.65);mesh(parent,g,m);}

function mesh(parent:T.Group,g:T.BufferGeometry,m:Mat,p:Vec=[0,0,0],s:Vec=[1,1,1]) {const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function ell(parent:T.Group,m:Mat,p:Vec,s:Vec){return mesh(parent,new T.SphereGeometry(1,24,16),m,p,s);}
function bar(parent:T.Group,m:Mat,a:Vec,b:Vec,r=.07,r2=r){const d=v(b).sub(v(a));const o=mesh(parent,new T.CylinderGeometry(r2,r,d.length(),12),m,v(a).add(v(b)).multiplyScalar(.5).toArray() as Vec);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function curve(parent:T.Group,m:Mat,points:Vec[],radius:number,segments=28){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v)),segments,radius,8,false),m);}
function taper(parent:T.Group,m:Mat,points:Vec[],r:number,end=0,segments=20){
 const path=new T.CatmullRomCurve3(points.map(v)),frames=path.computeFrenetFrames(segments,false),vertices:number[]=[],indices:number[]=[],sides=10;
 for(let i=0;i<=segments;i++){const t=i/segments,p=path.getPoint(t),radius=r*(1-t)+end*t;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;const n=frames.normals[i].clone().multiplyScalar(Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius).add(p);vertices.push(n.x,n.y,n.z);}}
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,m);
}
function ring(parent:T.Group,m:Mat,p:Vec,r:number,thickness=.025){return mesh(parent,new T.TorusGeometry(r,thickness,8,32),m,p);}
function pivot(parent:T.Group,name:string,p:Vec){const g=new T.Group();g.name=name;g.position.set(...p);parent.add(g);return g;}
function plate(parent:T.Group,m:Mat,p:Vec,s:Vec,rotation=0){const o=mesh(parent,new T.SphereGeometry(1,20,12),m,p,s);o.rotation.z=rotation;return o;}
function eye(parent:T.Group,white:Mat,iris:Mat,p:Vec,size=.085){ell(parent,white,p,[size*1.35,size,size*.65]);ell(parent,iris,[p[0],p[1],p[2]+size*.55],[size*.53,size*.83,size*.22]);ell(parent,material(0xfaffff,.05,.2),[p[0]-size*.19,p[1]+size*.3,p[2]+size*.74],[size*.15,size*.18,size*.08]);}
function claws(parent:T.Group,m:Mat,origin:Vec,count=3,size=.2){for(let i=0;i<count;i++)taper(parent,m,[[origin[0]+(i-(count-1)/2)*size*.68,origin[1],origin[2]],[origin[0]+(i-(count-1)/2)*size*.68,origin[1]-.04,origin[2]+size*.75],[origin[0]+(i-(count-1)/2)*size*.68,origin[1]-.08,origin[2]+size]],size*.18);}
function fur(parent:T.Group,color:number,center:Vec,radii:Vec,count=1800,clearFace=false){
 const geometry=new T.ConeGeometry(1,1,3);geometry.translate(0,.5,0);const m=material(color,.03,.92),inst=new T.InstancedMesh(geometry,m,count),dummy=new T.Object3D();
 let placed=0;for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,a=i*2.3999632297,r=Math.sqrt(1-y*y),n=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),p=n.clone().multiply(v(radii)).add(v(center));if(clearFace&&p.z-center[2]>.4&&Math.abs(p.x-center[0])<.65&&p.y-center[1]>-.13&&p.y-center[1]<.52)continue;if(clearFace&&Math.abs(p.x-center[0])>.78&&p.y-center[1]<-.1&&p.y-center[1]>-.45&&p.z>center[2])continue;dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n.clone().add(new T.Vector3(n.z*.16,.08,-n.x*.16)).normalize());const length=.055+.105*((Math.sin(i*17.43)+1)/2);dummy.scale.set(.008,length,.008);dummy.updateMatrix();inst.setMatrixAt(placed,dummy.matrix);inst.setColorAt(placed++,new T.Color(color).multiplyScalar(.6+.6*((Math.sin(i*8.19)+1)/2)));}
 inst.count=placed;inst.castShadow=true;inst.receiveShadow=true;inst.instanceMatrix.needsUpdate=true;parent.add(inst);
}
function kuriboh(parent:T.Group){const brown=material(0x3b263f,.02,.92),gold=material(0xb9a742,.2,.58),claw=material(0xebe3a7,.1,.35),white=material(0xf6edfd,.02,.26),purple=material(0x68369e,.1,.23);const body=pivot(parent,'body',[0,1.06,0]);ell(body,brown,[0,0,0],[.88,.89,.73]);fur(body,0x514055,[0,0,0],[.88,.89,.73],4200,true);
 for(const s of [-1,1]){eye(body,white,purple,[s*.34,.21,.67],.23);ell(body,gold,[s*.92,-.24,.23],[.21,.17,.2]);claws(body,claw,[s*.95,-.25,.31],3,.25);ell(parent,gold,[s*.4,.17,.21],[.22,.15,.32]);claws(parent,claw,[s*.4,.13,.44],3,.19);}
 ell(body,material(0x25152f),[0,-.17,.723],[.06,.035,.025]);return body;}
function wing(parent:T.Group,name:string,side:number,p:Vec,skin:Mat,bone:Mat,size=1){
 const group=pivot(parent,name,p);group.scale.set(side*size,size,size);
 const ribs:Vec[][]=[[[0,0,0],[.48,.65,-.06],[1.05,1.35,-.06],[1.42,1.2,.02]],[[0,0,0],[.53,.73,-.02],[1.57,.82,.02],[1.95,.25,.11]],[[0,0,0],[.54,.6,.02],[1.16,.28,.08],[1.52,-.41,.16]],[[0,0,0],[.35,.19,.04],[.71,-.33,.12],[.82,-.75,.2]]];
 for(const points of ribs)taper(group,bone,points,.072,.018);
 // Curved, thick wing membranes join each finger to the next. Their folds catch real light.
 for(let panel=0;panel<ribs.length-1;panel++){const a=new T.CatmullRomCurve3(ribs[panel].map(v)),b=new T.CatmullRomCurve3(ribs[panel+1].map(v)),verts:number[]=[],idx:number[]=[],steps=18,rows=10;
  for(let i=0;i<=steps;i++)for(let j=0;j<=rows;j++){const t=i/steps,u=j/rows,q=a.getPoint(t).lerp(b.getPoint(t),u);q.z+=Math.sin(u*Math.PI)*Math.sin(t*Math.PI)*.17;q.x-=Math.sin(u*Math.PI)*t*t*.12;verts.push(q.x,q.y,q.z);}
  for(let i=0;i<steps;i++)for(let j=0;j<rows;j++){const k=i*(rows+1)+j;idx.push(k,k+rows+1,k+1,k+1,k+rows+1,k+rows+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();const membrane=skin.clone();membrane.side=T.DoubleSide;mesh(group,g,membrane);
 }
 return group;
}
function dragon(parent:T.Group,id:string){
 const palette:Record<string,[number,number,number]>={blue_eyes:[0xc2d6e0,0x6d95bb,0x1589dc],red_eyes:[0x28303a,0x552c38,0xf53d35],luster_dragon:[0x3082bc,0x245a89,0x60f4d6],alexandrite_dragon:[0xc4a85c,0x796d37,0x8ad778],dragon_zombie:[0x889363,0x58624e,0xf3c46a],hyozanryu:[0xcdd0f1,0x8685b1,0xc473ed],seiyaryu:[0xc887ab,0x865c8d,0x86d0fc]};
 const [base,mem,accent]=palette[id]||palette.blue_eyes,armor=material(base,.5,.34),belly=material(base,.24,.56),skin=material(mem,.25,.54),dark=material(0x172132,.15,.5),ivory=material(id==='red_eyes'?0x75818d:0xf0e8d2,.12,.38),glow=material(accent,.35,.23,accent);
 const body=pivot(parent,'body',[0,.05,0]);ell(body,armor,[0,1.22,-.2],[.46,.68,.69]);ell(body,belly,[0,1.05,.36],[.35,.57,.23]);
 for(let i=0;i<7;i++){plate(body,armor,[0,.62+i*.13,.53-(i-3)*(i-3)*.014],[.31-i*.018,.095,.075]);}
 const neck=pivot(body,'head',[0,1.54,.02]);taper(neck,armor,[[0,0,0],[0,.46,.12],[0,.94,.24],[0,1.3,.4]],.31,.21,24);
 for(let i=0;i<8;i++){const y=.1+i*.155;plate(neck,belly,[0,y,.31+y*.1],[.235-i*.006,.074,.09]);taper(neck,armor,[[0,y,-.24+y*.3],[0,y+.09,-.4+y*.29],[0,y+.16,-.42+y*.29]],.06);}
 const head=pivot(neck,'jaw',[0,1.27,.43]);ell(head,armor,[0,.15,-.04],[.27,.22,.32]);plate(head,armor,[0,.12,.37],[.245,.12,.45]);ell(head,dark,[0,-.095,.4],[.215,.09,.35]);plate(head,armor,[0,-.2,.34],[.23,.075,.38]);taper(head,armor,[[0,.3,-.2],[0,.38,.05],[0,.2,.72]],.055,.015);
 for(const s of [-1,1]){plate(head,armor,[s*.25,.22,.13],[.06,.11,.27],s*.18);ell(head,glow,[s*.242,.21,.19],[.045,.027,.074]);ell(head,dark,[s*.271,.212,.209],[.015,.027,.021]);plate(head,armor,[s*.229,.25,.23],[.065,.055,.19],s*.25);ell(head,dark,[s*.12,.138,.727],[.023,.013,.018]);taper(head,armor,[[s*.21,.26,-.1],[s*.28,.44,-.28],[s*.27,.65,-.36]],.086);taper(head,ivory,[[s*.17,-.008,.61],[s*.16,-.185,.66]],.042);for(let i=0;i<5;i++)taper(head,ivory,[[s*.195,-.007,.25+i*.09],[s*.19,-.15,.27+i*.09]],.029);}
 for(const s of [-1,1]){
  const leg=pivot(body,'leg'+s,[s*.36,.94,-.05]);ell(leg,armor,[s*.08,-.12,.06],[.27,.38,.3]);bar(leg,armor,[s*.1,-.18,.03],[s*.23,-.55,.22],.15,.21);ell(leg,armor,[s*.24,-.63,.35],[.2,.14,.33]);claws(leg,ivory,[s*.24,-.66,.56],3,.23);
  const arm=pivot(body,'arm'+s,[s*.36,1.57,.11]);bar(arm,armor,[0,0,0],[s*.28,-.35,.14],.14,.2);bar(arm,armor,[s*.28,-.35,.14],[s*.42,-.44,.46],.1,.13);ell(arm,armor,[s*.42,-.43,.45],[.15,.12,.17]);claws(arm,ivory,[s*.42,-.47,.54],3,.18);
  wing(body,'wing'+s,s,[s*.32,1.67,-.37],skin,armor,1.04);
 }
 taper(body,armor,[[0,.87,-.53],[.16,.48,-1.11],[.6,.26,-1.62],[.87,.35,-1.92],[.99,.63,-2.02]],.25,.025,36);
 for(let i=0;i<6;i++)taper(body,armor,[[.12+i*.13,.44-i*.028,-.92-i*.16],[.12+i*.13,.69-i*.028,-1-i*.16],[.12+i*.13,.76-i*.028,-1.06-i*.16]],.045);
 // Overlapping cheek and shoulder scales add surface structure, rather than a smooth toy shell.
 for(const s of [-1,1])for(let i=0;i<18;i++){const y=.95+(i%6)*.12,z=-.46+Math.floor(i/6)*.3;plate(body,armor,[s*(.38+Math.sin(y*3)*.035),y,z],[.095,.13,.13],s*.2);}
 if(id==='alexandrite_dragon'||id==='hyozanryu')for(const s of [-1,1])for(let i=0;i<4;i++)mesh(body,new T.OctahedronGeometry(.14,0),glow,[s*.46,1.2+i*.2,-.18]);
 if(id==='dragon_zombie'){for(const s of [-1,1])for(let i=0;i<6;i++)curve(body,ivory,[[0,.84+i*.16,.5],[s*.32,.89+i*.16,.48],[s*.43,.92+i*.16,.02]],.035);}
 return body;
}
function face(parent:T.Group,skin:Mat,hair:Mat,eyes=0x507684,elf=false){
 const head=pivot(parent,'head',[0,2.34,.045]);ell(head,skin,[0,.12,0],[.205,.27,.19]);ell(head,skin,[0,-.025,.06],[.145,.13,.13]);ell(head,skin,[0,.09,.185],[.035,.072,.043]);for(const s of [-1,1]){eye(head,material(0xe9ece1),material(eyes),[s*.085,.165,.16],.039);if(elf)taper(head,skin,[[s*.16,.13,.01],[s*.3,.21,-.015],[s*.36,.26,-.03]],.064);else ell(head,skin,[s*.2,.11,0],[.032,.065,.042]);}
 curve(head,material(0x81504d),[[-.07,-.03,.165],[0,-.04,.18],[.07,-.03,.165]],.01,12);
 ell(head,hair,[0,.29,-.04],[.221,.17,.195]);for(let i=0;i<7;i++){const x=(i-3)*.05;taper(head,hair,[[x,.34,.1],[x+.026,.19+.03*Math.sin(i),.18],[x+.02,.09+.04*Math.cos(i),.19]],.038);}
 return head;
}
function boots(parent:T.Group,m:Mat){for(const s of [-1,1]){const leg=pivot(parent,'leg'+s,[s*.2,1.05,0]);bar(leg,m,[0,0,0],[s*.075,-.4,.04],.13,.16);ell(leg,m,[s*.075,-.39,.08],[.15,.16,.17]);bar(leg,m,[s*.075,-.42,.04],[s*.12,-.88,.08],.13,.14);ell(leg,m,[s*.12,-.92,.19],[.16,.13,.29]);}}
function arms(parent:T.Group,skin:Mat,armor:Mat){for(const s of [-1,1]){const arm=pivot(parent,'arm'+s,[s*.39,2.07,0]);ell(arm,armor,[s*.03,.01,0],[.2,.15,.22]);bar(arm,skin,[s*.04,-.1,0],[s*.18,-.39,.035],.095,.12);ell(arm,armor,[s*.18,-.37,.04],[.125,.13,.12]);bar(arm,armor,[s*.18,-.4,.04],[s*.15,-.73,.18],.087,.13);ell(arm,skin,[s*.15,-.76,.18],[.085,.11,.065]);for(let i=0;i<3;i++)bar(arm,skin,[s*.15+(i-1)*.033,-.76,.21],[s*.15+(i-1)*.03,-.86,.245],.012);}}
function robe(parent:T.Group,m:Mat,trim:Mat,wide=.58){const points:Array<T.Vector2>=[];for(let i=0;i<=32;i++){const t=i/32;points.push(new T.Vector2(wide*(1-t)+.22*t+.035*Math.sin(t*Math.PI),.12+t*1.72));}const g=new T.LatheGeometry(points,48),pos=g.getAttribute('position');for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),a=Math.atan2(z,x),y=pos.getY(i),fold=1+.06*Math.sin(a*10)*Math.max(0,1-y/1.8);pos.setXYZ(i,x*fold,y,z*fold);}g.computeVertexNormals();mesh(parent,g,m);const hem=ring(parent,trim,[0,.14,0],wide,.03);hem.rotation.x=Math.PI/2;}
function human(parent:T.Group,id:string){
 const magician=id==='dark_magician',guardian=id==='celtic_guardian',elf=id==='mystical_elf',saggi=id==='saggi',harpie=id==='harpie_lady';
 const skin=material(elf?0x6fafd0:harpie?0xd7b1aa:0xd6b398,.02,.7),hair=material(guardian||elf?0xc0a05e:harpie?0xd780ab:0x353347),armor=material(magician?0x5c408e:guardian?0x356b49:elf?0xe8dfe1:harpie?0x83475f:0x66326f,magician||guardian?.45:.08,.44),trim=material(magician?0x9290ba:guardian?0xb8c4ae:0xc4a164,.65,.36),dark=material(0x333543,.2,.7);
 const body=pivot(parent,'body',[0,.04,0]);cuirass(body,armor);ell(body,armor,[0,1.63,0],[.22,.27,.19]);bar(body,skin,[0,2.17,0],[0,2.4,0],.105);arms(body,skin,armor);
 if(guardian){boots(body,armor);curve(body,trim,[[-.3,2.12,.15],[0,1.96,.24],[.3,2.12,.15]],.018);curve(body,trim,[[0,1.95,.24],[0,1.68,.19]],.012);for(const s of [-1,1]){plate(body,trim,[s*.39,2.15,0],[.23,.15,.25],s*.24);for(let i=0;i<3;i++)plate(body,armor,[s*.25,1.4-i*.1,.06],[.2,.105,.25],s*.25);}const head=face(body,skin,hair,0x567748,true);ell(head,armor,[0,.31,-.065],[.235,.23,.208]);for(const s of [-1,1])taper(head,trim,[[s*.15,.35,-.06],[s*.25,.61,-.09],[s*.21,.76,-.08]],.074);mesh(head,new T.OctahedronGeometry(.075),material(0xb34547,.4,.25),[0,.34,.19]);
  const sword=pivot(body.getObjectByName('arm1') as T.Group,'sword',[.15,-.72,.2]);bar(sword,dark,[0,-.14,0],[0,.2,0],.04);bar(sword,trim,[-.18,.17,0],[.18,.17,0],.035);const blade=mesh(sword,new T.ConeGeometry(.095,1.25,4),trim,[0,.82,0],[1,1,.4]);blade.rotation.y=Math.PI/4;
  const shield=pivot(body.getObjectByName('arm-1') as T.Group,'shield',[-.18,-.53,.21]);ell(shield,armor,[0,0,.07],[.27,.42,.065]);const edge=ring(shield,trim,[0,0,.09],.27,.025);edge.scale.y=1.5;curve(shield,trim,[[-.16,.15,.137],[0,-.18,.153],[.16,.15,.137]],.018);
 }else if(harpie){boots(body,material(0xa08b62));face(body,skin,hair,0x638b71);for(const s of [-1,1]){const w=wing(body,'wing'+s,s,[s*.4,2.05,-.1],material(0xbbccd1,.05,.68),material(0x9bb8c4,.15,.6),.8);for(let i=0;i<9;i++)plate(w,trim,[.5+i*.13,.7-i*.16,.1],[.055,.43,.037],-.65);claws(body,trim,[s*.32,.11,.37],3,.2);}
 }else{
  robe(body,armor,trim,magician?.57:elf?.61:.56);const head=face(body,skin,hair,magician?0x829cbc:0x56859b,elf);
  if(magician){const helm=pivot(head,'helmet',[0,.23,-.04]);const shape=new T.LatheGeometry([new T.Vector2(.25,0),new T.Vector2(.245,.16),new T.Vector2(.19,.4),new T.Vector2(.135,.65),new T.Vector2(.01,.87)],32);mesh(helm,shape,armor);for(let i=0;i<4;i++){const r=.247-i*.034;const band=ring(helm,trim,[0,.1+i*.17,0],r,.02);band.rotation.x=Math.PI/2;}
   for(const s of [-1,1]){plate(body,armor,[s*.4,2.2,-.04],[.27,.21,.27],s*.4);curve(body,trim,[[s*.38,2.31,.17],[s*.54,2.18,.19],[s*.55,2.02,.15]],.026);plate(head,armor,[s*.21,.03,-.01],[.074,.26,.2],-s*.22);}
   for(let i=0;i<5;i++){const band=ring(body,trim,[0,.34+i*.22,0],.54-i*.047,.015);band.rotation.x=Math.PI/2;}
   const staff=pivot(body.getObjectByName('arm1') as T.Group,'staff',[.17,-.72,.21]);bar(staff,material(0x4b9685,.6,.33),[0,-1.12,0],[0,1.55,0],.043);const crown=ring(staff,trim,[0,1.53,0],.17,.04);crown.rotation.y=.25;mesh(staff,new T.OctahedronGeometry(.125,1),material(0x74d6ba,.55,.2,0x216c59),[0,1.55,0]);
  }else if(elf){for(const s of [-1,1])taper(head,hair,[[s*.18,.26,-.13],[s*.24,-.16,-.16],[s*.28,-.62,-.2]],.1,.04);const crown=ring(head,trim,[0,.29,0],.205,.018);crown.rotation.x=Math.PI/2;mesh(head,new T.OctahedronGeometry(.035),material(0x73b4d1,.45,.28),[0,.29,.213]);}
  else if(saggi){const white=material(0xe4d7d4);ell(head,white,[0,.1,.038],[.2,.25,.173]);for(const s of [-1,1])eye(head,white,material(0x32393d),[s*.074,.16,.198],.039);ell(head,material(0xa83c66),[0,.07,.23],[.045,.052,.033]);for(let i=-1;i<=1;i++)taper(head,armor,[[i*.16,.32,0],[i*.23,.64,-.06],[i*.4,.81,0]],.14,.01);for(let i=-1;i<=1;i++)ell(head,trim,[i*.4,.81,0],[.07,.07,.07]);}
 }
 const belt=ring(body,trim,[0,1.59,0],.245,.037);belt.rotation.x=Math.PI/2;mesh(body,new T.OctahedronGeometry(.07),trim,[0,1.59,.248]);return body;
}
function skull(parent:T.Group){const bone=material(0xc797ba,.32,.47),muscle=material(0x2e263b,.2,.52),horn=material(0x404452,.5,.35),ivory=material(0xdac7d1,.2,.45),red=material(0xf5a960,.15,.26,0xad493a);const body=pivot(parent,'body',[0,.04,0]);ell(body,muscle,[0,1.65,0],[.43,.55,.25]);ell(body,bone,[0,1.46,.12],[.21,.4,.17]);
 for(const s of [-1,1]){for(let i=0;i<6;i++)curve(body,bone,[[0,1.48+i*.13,.23],[s*.28,1.47+i*.13,.25],[s*.4,1.53+i*.13,.1],[s*.31,1.58+i*.13,-.17]],.046);const leg=pivot(body,'leg'+s,[s*.24,1.1,0]);bar(leg,muscle,[0,0,0],[s*.08,-.48,.12],.12,.18);plate(leg,bone,[s*.08,-.2,.17],[.13,.31,.09]);bar(leg,bone,[s*.08,-.5,.12],[s*.16,-.93,.05],.1,.15);ell(leg,horn,[s*.16,-.97,.2],[.18,.09,.3]);claws(leg,ivory,[s*.16,-.97,.43],3,.22);
 const arm=pivot(body,'arm'+s,[s*.43,2.11,0]);ell(arm,bone,[0,0,0],[.25,.2,.29]);for(let i=0;i<3;i++)taper(arm,horn,[[s*.12,.08,-.03-i*.09],[s*.3,.33,-.11-i*.09],[s*.4,.39,-.13-i*.09]],.06);bar(arm,muscle,[s*.06,-.12,0],[s*.21,-.44,.05],.12,.17);bar(arm,bone,[s*.21,-.44,.05],[s*.34,-.71,.34],.11,.13);ell(arm,bone,[s*.34,-.72,.34],[.12,.16,.1]);claws(arm,ivory,[s*.34,-.76,.39],4,.22);
 wing(body,'wing'+s,s,[s*.26,2.15,-.25],material(0x765370,.12,.58),bone,.79);
 }
 const head=pivot(body,'head',[0,2.2,0]);ell(head,bone,[0,.23,.02],[.25,.31,.23]);ell(head,horn,[0,.01,.12],[.185,.085,.15]);ell(head,bone,[0,-.065,.09],[.19,.11,.16]);for(const s of [-1,1]){ell(head,horn,[s*.1,.27,.207],[.077,.085,.047]);ell(head,red,[s*.1,.26,.249],[.035,.043,.019]);taper(head,horn,[[s*.19,.4,-.1],[s*.36,.64,-.18],[s*.48,.81,-.09],[s*.5,.9,.04]],.095);for(let i=0;i<4;i++)bar(head,ivory,[s*(.022+i*.033),.04,.26],[s*(.022+i*.033),-.05,.26],.014);}
 ell(head,horn,[0,.13,.247],[.037,.057,.025]);return body;
}
function golem(parent:T.Group){const stone=material(0x879892,.15,.88),crease=material(0x3f514e,.1,.93);const body=pivot(parent,'body',[0,.02,0]);function rock(p:Vec,s:Vec){const g=new T.IcosahedronGeometry(1,1),a=g.getAttribute('position');for(let i=0;i<a.count;i++){const t=1+.06*Math.sin(a.getX(i)*37+a.getY(i)*19+a.getZ(i)*29);a.setXYZ(i,a.getX(i)*t,a.getY(i)*t,a.getZ(i)*t);}g.computeVertexNormals();return mesh(body,g,stone,p,s);}rock([0,1.6,0],[.68,.65,.39]);rock([0,1.01,0],[.41,.27,.3]);for(const s of [-1,1]){rock([s*.29,.57,0],[.24,.44,.25]);rock([s*.3,.16,.14],[.28,.17,.4]);rock([s*.79,1.81,0],[.3,.36,.32]);rock([s*.9,1.17,.05],[.23,.41,.23]);rock([s*.93,.85,.15],[.26,.19,.25]);for(let i=0;i<3;i++)bar(body,crease,[s*.87+i*.065,.94,.38],[s*.87+i*.065,.79,.38],.012);}
 const head=pivot(body,'head',[0,2.17,.06]);mesh(head,new T.IcosahedronGeometry(1,1),stone,[0,.13,0],[.32,.37,.29]);for(const s of [-1,1]){plate(head,crease,[s*.13,.18,.26],[.087,.03,.025]);plate(head,stone,[s*.13,.24,.25],[.12,.053,.055],s*.2);}plate(head,stone,[0,.07,.29],[.06,.12,.07]);curve(head,crease,[[-.1,-.02,.252],[0,-.035,.277],[.1,-.02,.252]],.014);for(let i=0;i<8;i++)curve(body,crease,[[-.35+i*.11,1.96,.307],[-.3+i*.085,1.65,.407],[-.34+i*.095,1.38,.369]],.009);return body;
}
function ox(parent:T.Group){const hide=material(0x8b6250,.05,.83),armor=material(0x3d7390,.5,.4),steel=material(0xa9b7b8,.7,.3),horn=material(0xe2ccb0,.2,.55);const body=pivot(parent,'body',[0,.03,0]);ell(body,hide,[0,1.76,0],[.49,.53,.3]);ell(body,armor,[0,1.32,0],[.41,.19,.3]);boots(body,material(0x4d4146));arms(body,hide,armor);for(const s of [-1,1])plate(body,armor,[s*.43,2.09,0],[.27,.2,.3]);const head=pivot(body,'head',[0,2.12,.04]);ell(head,hide,[0,.17,0],[.29,.32,.24]);ell(head,hide,[0,.03,.24],[.24,.16,.18]);for(const s of [-1,1]){eye(head,material(0xdfd3af),material(0x393325),[s*.134,.23,.208],.05);taper(head,horn,[[s*.23,.35,-.08],[s*.4,.5,-.12],[s*.5,.68,-.06],[s*.43,.82,.04]],.1);ell(head,material(0x42312b),[s*.09,.05,.402],[.034,.025,.015]);}
 const axe=pivot(body.getObjectByName('arm1') as T.Group,'axe',[.18,-.7,.21]);bar(axe,material(0x68432f),[0,-.58,0],[0,1.16,0],.045);ell(axe,steel,[.04,1.03,0],[.44,.29,.07]);ell(axe,armor,[-.03,1.02,.06],[.27,.19,.03]);return body;
}
function wolf(parent:T.Group){const body=pivot(parent,'body',[0,.03,0]),furMat=material(0xb1bdc9,.15,.81),dark=material(0x4d5868,.05,.86);ell(body,furMat,[0,.77,-.1],[.36,.4,.71]);for(const s of [-1,1])for(const z of [-.49,.43]){bar(body,furMat,[s*.24,.79,z],[s*.26,.16,z+.04],.11,.15);ell(body,furMat,[s*.26,.13,z+.14],[.13,.13,.21]);}const head=pivot(body,'head',[0,1.02,.54]);ell(head,furMat,[0,.11,0],[.27,.29,.28]);ell(head,furMat,[0,-.02,.28],[.18,.14,.25]);ell(head,dark,[0,.017,.483],[.14,.075,.05]);for(const s of [-1,1]){eye(head,material(0xe5d39f),material(0x384552),[s*.135,.15,.24],.05);taper(head,furMat,[[s*.19,.31,-.04],[s*.2,.55,-.06],[s*.2,.63,.04]],.135);}
 fur(body,0xafbac6,[0,.78,-.1],[.36,.4,.7],1100);taper(body,furMat,[[0,.83,-.62],[.2,1.02,-.95],[.36,1.34,-1.04],[.32,1.52,-.91]],.19,.04);return body;
}
function gemini(parent:T.Group){const body=pivot(parent,'body',[0,0,0]);for(const s of [-1,1]){const elf=pivot(body,'twin'+s,[s*.38,0,s*.09]);const b=human(elf,'mystical_elf');b.scale.setScalar(.85);b.rotation.y=s*.27;b.traverse(o=>{if(o instanceof T.Mesh){const m=o.material as Mat;if(m.color.getHex()===0x6fafd0)m.color.setHex(0xd2a998);if(s===1&&m.color.getHex()===0xc0a05e)m.color.setHex(0x9a5340);if(m.color.getHex()===0xe8dfe1)m.color.setHex(s===1?0x775675:0x65798b);}});}return body;}
/** Merge static sculpture pieces per material inside each joint, keeping animated joints intact. */
function batch(group:T.Group){for(const c of [...group.children])if(c instanceof T.Group)batch(c);const buckets=new Map<Mat,T.Mesh[]>();for(const c of group.children)if(c instanceof T.Mesh&&!(c instanceof T.InstancedMesh)&&c.material instanceof T.MeshStandardMaterial){const list=buckets.get(c.material)||[];list.push(c);buckets.set(c.material,list);}
 for(const [m,list] of buckets){if(list.length<2)continue;const gs=list.map(o=>{o.updateMatrix();const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();source.deleteAttribute('uv');source.applyMatrix4(o.matrix);return source;});const merged=mergeGeometries(gs);gs.forEach(g=>g.dispose());if(!merged)continue;for(const o of list){group.remove(o);o.geometry.dispose();}mesh(group,merged,m);}
}
export function createMonsterActor(id:string):MonsterActor {
 if(!MONSTER_MODELS.includes(id as typeof MONSTER_MODELS[number]))throw new Error(`No volumetric model for ${id}`);
 const root=new T.Group();root.name='monster:'+id;const sculpture=pivot(root,'sculpture',[0,0,0]);
 let body:T.Group;
 if(id==='kuriboh')body=kuriboh(sculpture);else if(id==='summoned_skull')body=skull(sculpture);else if(id==='giant_soldier')body=golem(sculpture);else if(id==='battle_ox')body=ox(sculpture);else if(id==='silver_fang')body=wolf(sculpture);else if(id==='gemini_elf')body=gemini(sculpture);else if(['blue_eyes','red_eyes','luster_dragon','alexandrite_dragon','dragon_zombie','hyozanryu','seiyaryu'].includes(id))body=dragon(sculpture,id);else body=human(sculpture,id);
 batch(sculpture);surfaceDetail(sculpture);root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(sculpture),size=bounds.getSize(new T.Vector3());const targetHeight=id==='kuriboh'?2.1:id==='silver_fang'?2.45:4.2;
 const scale=Math.min(targetHeight/size.y,(id.includes('dragon')||id==='blue_eyes'||id==='red_eyes'||id==='hyozanryu'||id==='seiyaryu'?4.25:3.05)/size.x);sculpture.scale.setScalar(scale);sculpture.position.y=-bounds.min.y*scale;
 const baseY=body.position.y,joints:Array<{node:T.Object3D,rot:T.Euler}>=[];body.traverse(o=>{if(o instanceof T.Group&&/^(head|wing|arm|leg|twin)/.test(o.name))joints.push({node:o,rot:o.rotation.clone()});});
 const phase=id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*.13,height=size.y*scale;
 return {root,id,height,update(seconds,motion={},still=false){const t=still?0:seconds+phase;const breathing=still?0:Math.sin(t*1.8)*.012;body.position.y=baseY+breathing;body.scale.set(1,1+breathing*.35,1);for(const {node,rot} of joints){node.rotation.copy(rot);if(still)continue;if(node.name.startsWith('wing')){const side=node.name.endsWith('-1')?-1:1;node.rotation.y=side*(Math.sin(t*1.3)*.075);node.rotation.z=side*Math.sin(t*.9)*.045;}else if(node.name==='head')node.rotation.y=Math.sin(t*.7)*.035;else if(node.name.startsWith('arm'))node.rotation.x=Math.sin(t*1.8)*.025;}
 const birth=motion.birth??1,emerge=1-Math.pow(1-birth,3);sculpture.scale.setScalar(scale*(.05+.95*emerge));sculpture.position.y=-bounds.min.y*scale-.38*(1-emerge);
 const attack=motion.attack??0,hit=motion.hit??0,lunge=Math.sin(Math.min(1,attack/.5)*Math.PI)*(attack<.5?1:0);body.position.z=lunge*.48-Math.sin(hit*Math.PI)*.18;body.rotation.x=-lunge*.18+Math.sin(hit*Math.PI)*.1;for(const {node} of joints)if(node.name.startsWith('arm'))node.rotation.x-=lunge*.65;
 },dispose(){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o instanceof T.InstancedMesh)o.dispose();}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
export function shouldShowMonster(card:{id?:string,faceUp?:boolean}|null,area:string){return area==='field'&&!!card?.faceUp&&!!card.id;}
