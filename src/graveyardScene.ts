import * as T from 'three';
import {publicPilePosition,type PublicPile} from './graveyardModel';
/** Shallow ground-bound card receptacle, readable in either environment. */
export function createPublicPile({own,area,cards,face,city=false,maps}:{own:boolean,area:PublicPile,cards:any[],face?:T.Texture,city?:boolean,maps?:{color:T.Texture,normal:T.Texture,arm:T.Texture}}){
 const group=new T.Group(),position=publicPilePosition(own,area);group.position.set(position.x,0,position.z);
 const color=area==='banished'?0xcbb27a:own?0x8ad7ed:0xbfa1ed;
 const stone=new T.MeshStandardMaterial({color:city?0x23394b:0xaaa394,metalness:city?.4:.08,roughness:.82,...(!city&&maps?{map:maps.color,normalMap:maps.normal,normalScale:new T.Vector2(.25,.25),roughnessMap:maps.arm}:{})});
 const floor=new T.Mesh(new T.BoxGeometry(1.95,.09,2.5),stone);floor.position.y=-.015;floor.receiveShadow=true;group.add(floor);
 const rim=new T.MeshStandardMaterial({color:city?0x6b91a3:0x827c68,metalness:.4,roughness:.52});
 for(const x of [-.96,.96]){const edge=new T.Mesh(new T.BoxGeometry(.07,.07,2.5),rim);edge.position.set(x,.06,0);group.add(edge);}
 for(const z of [-1.23,1.23]){const edge=new T.Mesh(new T.BoxGeometry(1.95,.07,.07),rim);edge.position.set(0,.06,z);group.add(edge);}
 const seal=new T.Mesh(new T.RingGeometry(.48,.51,48),new T.MeshBasicMaterial({color,transparent:true,opacity:cards.length?.62:.23,side:T.DoubleSide,depthWrite:false,toneMapped:false}));seal.rotation.x=-Math.PI/2;seal.position.y=.04;group.add(seal);
 const glow=new T.Mesh(new T.PlaneGeometry(1.65,2.22),new T.MeshBasicMaterial({color,transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;group.add(glow);
 const count=Math.min(cards.length,5);
 for(let i=0;i<count;i++){const card=new T.Mesh(new T.BoxGeometry(1.35,.022,1.97),new T.MeshStandardMaterial({color:0xc5c4b7,metalness:.05,roughness:.78}));card.position.set((i%2)*.026,.09+i*.028,-i*.013);card.rotation.y=(i%2?.025:-.02)*(own?1:-1);card.castShadow=true;group.add(card);}
 if(count&&face){const card=new T.Mesh(new T.PlaneGeometry(1.34,1.96),new T.MeshStandardMaterial({map:face,roughness:.64,metalness:0,side:T.DoubleSide}));card.rotation.x=-Math.PI/2;card.rotation.z=own?0:Math.PI;card.position.y=.09+(count-1)*.028+.018;group.add(card);}
 return group;
}
