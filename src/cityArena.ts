import * as T from 'three';
/** Transparent metallic ground accents keep the arena illustration continuous. */
export function createCityArena(){
 const group=new T.Group();group.name='neon-city-duel-ground';const texture=new T.TextureLoader().load('/game-assets/metal-floor.png');texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,3);
 const floor=new T.Mesh(new T.PlaneGeometry(20,15.6),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.12,depthWrite:false,toneMapped:false,color:0x95c4dc}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;group.add(floor);
 const points:T.Vector3[]=[];for(const s of [-1,1]){points.push(new T.Vector3(s*8.4,.01,-6.7),new T.Vector3(s*8.4,.01,6.7),new T.Vector3(-8.4,.01,s*6.7),new T.Vector3(8.4,.01,s*6.7));}
 const trim=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x6ad9ff,transparent:true,opacity:.6,depthWrite:false}));group.add(trim);
 return {group,dispose(){group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});texture.dispose();}};
}
