import * as T from 'three';
import {publicPilePosition,type PublicPile} from './graveyardModel.ts';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** A sealed stone archive for GY, and a separate golden banishment prism. */
export function createPublicPile({own,area,cards,face,city=false,maps}:{own:boolean,area:PublicPile,cards:any[],face?:T.Texture,city?:boolean,maps?:{color:T.Texture,normal:T.Texture,arm:T.Texture}}){
 const group=new T.Group(),position=publicPilePosition(own,area),banished=area==='banished';group.position.set(position.x,0,position.z);group.name=`public-${area}-${own?'own':'opponent'}`;
 const color=banished?0xf2c373:0xae9aff;
 const stone=new T.MeshStandardMaterial({color:city?0x243146:0x465367,metalness:city?.35:.12,roughness:.74,...(!city&&maps?{map:maps.color,normalMap:maps.normal,normalScale:new T.Vector2(.32,.32),roughnessMap:maps.arm}:{})});
 const edge=new T.MeshStandardMaterial({color:banished?0x8f7850:0x77889f,metalness:.48,roughness:.42});
 const dark=new T.MeshStandardMaterial({color:0x0a101e,metalness:.18,roughness:.63});
 const light=new T.MeshBasicMaterial({color,transparent:true,opacity:.65,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 const make=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 make(new T.BoxGeometry(2.18,.17,2.55),stone,0,.025,0);
 make(new T.BoxGeometry(1.79,.025,2.17),dark,0,.122,0);
 for(const x of [-1.02,1.02])make(new T.BoxGeometry(.13,.2,2.55),edge,x,.15,0);
 for(const z of [-1.22,1.22])make(new T.BoxGeometry(1.96,.2,.13),edge,0,.15,z);
 // Four small carved pylons and a vertical seal make this distinct from a normal card socket.
 for(const x of [-.97,.97])for(const z of [-1.15,1.15]){
  make(new T.BoxGeometry(.23,.48,.23),stone,x,.35,z);
  make(new T.BoxGeometry(.18,.045,.18),light,x,.60,z);
 }
 const back=own?-1.16:1.16;
 if(!banished){
  const plaque=make(new T.CylinderGeometry(.66,.66,.14,6),stone,0,.94,back);plaque.rotation.x=Math.PI/2;plaque.rotation.z=Math.PI/6;
  const symbol=new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(-.21,1.10,back+(own?.09:-.09)),new T.Vector3(.21,1.10,back+(own?.09:-.09)),new T.Vector3(0,1.26,back+(own?.09:-.09)),new T.Vector3(0,.67,back+(own?.09:-.09)),new T.Vector3(-.21,.81,back+(own?.09:-.09)),new T.Vector3(.21,.81,back+(own?.09:-.09))]),new T.LineBasicMaterial({color,transparent:true,opacity:.9,toneMapped:false}));group.add(symbol);
 }else{
  const prism=make(new T.OctahedronGeometry(.29),new T.MeshStandardMaterial({color:0xeec787,emissive:0xaf7023,emissiveIntensity:.25,metalness:.55,roughness:.24}),0,.88,back);prism.rotation.z=.25;
 }
 const halo=make(new T.RingGeometry(.61,.69,64),light,0,.148,0);halo.rotation.x=-Math.PI/2;
 const orbit=make(new T.TorusGeometry(.88,.012,6,64),light,0,.155,0);orbit.rotation.x=-Math.PI/2;
 const dots=new T.Group();group.add(dots);for(let i=0;i<6;i++){const angle=i*Math.PI/3;const dot=new T.Mesh(new T.OctahedronGeometry(.035),light);dot.position.set(Math.cos(angle)*.84,.18,Math.sin(angle)*.84);dots.add(dot);}
 const count=Math.min(cards.length,5),stockMaterial=new T.MeshStandardMaterial({color:0xaab3c9,roughness:.7});
 for(let i=0;i<count;i++){const card=make(new T.BoxGeometry(1.30,.028,1.87),stockMaterial,i%2*.035,.19+i*.04,-i*.018);card.rotation.y=(i%2?.025:-.02)*(own?1:-1);}
 if(!count)stockMaterial.dispose();
 if(count&&face){const card=make(new T.PlaneGeometry(1.29,1.86),new T.MeshStandardMaterial({map:face,roughness:.68,metalness:0,side:T.DoubleSide}),0,.19+(count-1)*.04+.02,0);card.rotation.x=-Math.PI/2;card.rotation.z=own?0:Math.PI;}
 // Keep the moving rings separate; stone courses, trim, pylons and card edges share batches.
 function batch(parent:T.Group,skip:T.Object3D[]=[]){
  const parts=new Map<T.Material,T.BufferGeometry[]>();
  for(const child of [...parent.children]){if(!(child instanceof T.Mesh)||skip.includes(child)||Array.isArray(child.material))continue;child.updateMatrix();const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);const list=parts.get(child.material)||[];list.push(geometry);parts.set(child.material,list);child.geometry.dispose();parent.remove(child);}
  for(const [material,geometry] of parts){const merged=mergeGeometries(geometry)!;const mesh=new T.Mesh(merged,material);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;parent.add(mesh);geometry.forEach(part=>part.dispose());}
 }
 batch(dots);batch(group,[halo,orbit]);
 // Shared by all seal parts: one inexpensive pulse, no persistent point lights.
 group.userData.animate=(time:number,motion:boolean,arrival=0)=>{light.opacity=.40+(cards.length?.18:0)+(motion?Math.sin(time*.0014)*.07:0)+arrival*.28;halo.scale.setScalar(1+arrival*.22);dots.rotation.y=motion?time*.00015:0;dots.position.y=motion?Math.sin(time*.001)*.035:0;};
 return group;
}
