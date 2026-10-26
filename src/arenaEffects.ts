import * as THREE from 'three';
import {PILE_TRANSFER_MS,pileTransferPhase} from './graveyardModel.ts';
export type ArenaEffect={group:THREE.Group,duration:number,update:(t:number)=>void};
const glow=(color:number,opacity:number)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
export function summonEffect(position:THREE.Vector3,color:number,circle:THREE.Texture,ace:boolean):ArenaEffect{
 const group=new THREE.Group();group.position.copy(position);group.position.y=.12;
 const radius=ace?2.2:1.45;
 const seal=new THREE.Mesh(new THREE.PlaneGeometry(radius*2.8,radius*2.8),new THREE.MeshBasicMaterial({map:circle,color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));seal.rotation.x=-Math.PI/2;group.add(seal);
 const rings=Array.from({length:3},(_,i)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,.025+i*.012,8,72),glow(color,0));mesh.rotation.x=Math.PI/2;mesh.position.y=.03+i*.025;group.add(mesh);return mesh;});
 const column=new THREE.Mesh(new THREE.CylinderGeometry(radius*.6,radius*.82,ace?6.5:3.7,48,1,true),glow(color,0));column.position.y=ace?3.2:1.9;group.add(column);
 const shards=Array.from({length:ace?16:9},(_,i)=>{const mesh=new THREE.Mesh(new THREE.ConeGeometry(.065,ace?1.3:.75,4),glow(i%3===0?0xffffff:color,0));mesh.userData.theta=i/(ace?16:9)*Math.PI*2;group.add(mesh);return mesh;});
 const positions=new Float32Array((ace?160:75)*3);const count=positions.length/3;for(let i=0;i<count;i++){const theta=i*2.39996,r=radius*(.35+(i%13)/13);positions[i*3]=Math.cos(theta)*r;positions[i*3+1]=(i%23)/23*5;positions[i*3+2]=Math.sin(theta)*r;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color,size:ace?.095:.075,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(particles);
 const light=new THREE.PointLight(color,0,10,2);light.position.y=2;group.add(light);
 return {group,duration:ace?3000:2100,update(t){
  // Charge, rising energy, materialization, then a fading shock wave.
  const charge=Math.min(1,t/.18),fade=Math.max(0,1-(t-.48)/.52),pulse=charge*fade;
  seal.material.opacity=.9*pulse;seal.rotation.z=t*(ace?-2.6:2.6);seal.scale.setScalar(.65+Math.min(1,t*3)*.55);
  column.material.opacity=.19*pulse;column.scale.set(1,Math.max(.05,Math.sin(Math.min(1,t/.5)*Math.PI/2)),1);column.rotation.y=t*2;
  rings.forEach((ring,i)=>{const wave=Math.max(0,(t-i*.08)/.75);ring.scale.setScalar(.3+wave*2.3);ring.material.opacity=wave<1?Math.sin(wave*Math.PI)*.8:0;});
  shards.forEach((mesh,i)=>{const theta=mesh.userData.theta+t*2.5;mesh.position.set(Math.cos(theta)*radius*(1-t*.4),.3+((t*5+i*.28)%5),Math.sin(theta)*radius*(1-t*.4));mesh.material.opacity=pulse*.7;mesh.scale.y=.3+charge*.7;});
  particles.rotation.y=-t*2.1;particles.position.y=t*1.3;particles.material.opacity=pulse*.85;light.intensity=pulse*(ace?14:7);
 }};
}
export function attackEffect(start:THREE.Vector3,end:THREE.Vector3):ArenaEffect{
 const group=new THREE.Group(),a=start.clone().setY(.9),b=end.clone().setY(.9),diff=b.clone().sub(a);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.07,.16,diff.length(),12),glow(0x8aeaff,0));beam.position.copy(a.clone().add(b).multiplyScalar(.5));beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.clone().normalize());group.add(beam);
 const orb=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8),glow(0xdbfaff,.9));group.add(orb);
 const shock=new THREE.Mesh(new THREE.TorusGeometry(.65,.07,8,40),glow(0xffd3a4,0));shock.rotation.x=Math.PI/2;shock.position.copy(b);group.add(shock);
 return {group,duration:1000,update(t){const flight=Math.min(1,t/.4);orb.position.lerpVectors(a,b,flight);orb.material.opacity=t<.5?.95:Math.max(0,1-t)*1.5;beam.material.opacity=t<.45?Math.sin(t/.45*Math.PI)*.8:Math.max(0,(.7-t)*.5);const impact=Math.max(0,(t-.36)/.64);shock.scale.setScalar(.3+impact*3);shock.material.opacity=Math.sin(impact*Math.PI)*.9;}};
}
export function disposeEffect(group:THREE.Group){group.traverse((object:any)=>{object.geometry?.dispose();for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])material.dispose();});}

/** Lift a public face toward the camera, trace its path, then seal it into the pile. */
export function publicPileEffect(start:THREE.Vector3,end:THREE.Vector3,face:THREE.Texture,banished=false,facing=new THREE.Quaternion()):ArenaEffect{
 const group=new THREE.Group(),color=banished?0xefc779:0xae9aff;
 const card=new THREE.Group();group.add(card);
 const stock=new THREE.Mesh(new THREE.BoxGeometry(1.50,2.18,.035),new THREE.MeshStandardMaterial({color:0xbdc6d5,roughness:.65,transparent:true,opacity:1}));card.add(stock);
 const front=new THREE.Mesh(new THREE.PlaneGeometry(1.48,2.16),new THREE.MeshBasicMaterial({map:face,transparent:true,opacity:1,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));front.position.z=.025;card.add(front);
 const portal=new THREE.Mesh(new THREE.RingGeometry(.75,.95,64),glow(color,0));portal.rotation.x=-Math.PI/2;portal.position.copy(end).setY(.34);group.add(portal);
 const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.03,.027,8,64),glow(color,0));orbit.rotation.x=-Math.PI/2;orbit.position.copy(end).setY(.35);group.add(orbit);
 const column=new THREE.Mesh(new THREE.CylinderGeometry(.72,.98,2.2,32,1,true),glow(color,0));column.position.copy(end).setY(1.2);group.add(column);
 const from=start.clone().setY(.18),lift=from.clone().add(new THREE.Vector3(0,1.35,0)),to=end.clone().setY(.2),arrival=to.clone().setY(.75),control=lift.clone().lerp(arrival,.5).add(new THREE.Vector3(0,1.25,0));
 const curve=new THREE.QuadraticBezierCurve3(lift,control,arrival),trail=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.035,6,false),glow(color,0));group.add(trail);
 const sparkGeometry=new THREE.BufferGeometry(),positions=new Float32Array(32*3);sparkGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const sparks=new THREE.Points(sparkGeometry,new THREE.PointsMaterial({color,size:.06,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(sparks);
 const flat=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 return {group,duration:PILE_TRANSFER_MS,update(t){
  const p=pileTransferPhase(t),u=p.travel;
  if(t<.22)card.position.lerpVectors(from,lift,p.lift);else if(t<.74)card.position.copy(curve.getPoint(u));else card.position.lerpVectors(arrival,to,p.sink);
  card.quaternion.copy(flat).slerp(facing,p.lift).slerp(flat,p.sink);card.scale.setScalar((1+.20*Math.sin(p.lift*Math.PI/2))*(1-.70*p.sink));
  front.material.opacity=p.fade;stock.material.opacity=p.fade;
  const seal=Math.sin(Math.max(0,Math.min(1,(t-.30)/.70))*Math.PI);portal.material.opacity=seal*.72;orbit.material.opacity=seal*.85;orbit.scale.setScalar(.85+seal*.35);column.material.opacity=p.sink*(1-p.sink)*.5;
  trail.geometry.setDrawRange(0,Math.round(48*6*6*u));trail.material.opacity=t>.22&&t<.84?.52*(1-Math.max(0,(t-.72)/.12)):0;
  for(let i=0;i<32;i++){const a=i*2.39996+t*1.7,r=.58+(i%5)*.08;positions[i*3]=to.x+Math.cos(a)*r;positions[i*3+1]=.25+((i/32+t*.7)%1)*1.45;positions[i*3+2]=to.z+Math.sin(a)*r;}
  sparkGeometry.attributes.position.needsUpdate=true;sparks.material.opacity=seal*.75;
 }};
}
