import * as T from 'three';

/** Keep the illustrated arena ground visible; no raised board or duplicate pillars. */
export function createAncientArena(){
 const group=new T.Group();group.name='integrated-roman-ground';
 const texture=new T.TextureLoader().load('/game-assets/roman-stone.jpg');texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(8,6);texture.anisotropy=4;
 const floor=new T.Mesh(new T.PlaneGeometry(20,15.6),new T.MeshBasicMaterial({map:texture,color:0xb59d7b,transparent:true,opacity:.055,depthWrite:false,toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;group.add(floor);
 // Fine antique inlays delineate the playable floor, while its original masonry stays visible.
 const lines:T.Vector3[]=[];
 for(const s of [-1,1]){lines.push(new T.Vector3(s*8.4,.008,-6.7),new T.Vector3(s*8.4,.008,6.7),new T.Vector3(-8.4,.008,s*6.7),new T.Vector3(8.4,.008,s*6.7));}
 const border=new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),new T.LineBasicMaterial({color:0xc3a16c,transparent:true,opacity:.3,depthWrite:false}));group.add(border);
 const seal=new T.Mesh(new T.RingGeometry(.85,.9,64),new T.MeshBasicMaterial({color:0xc4a76f,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,toneMapped:false}));seal.rotation.x=-Math.PI/2;seal.position.y=.01;group.add(seal);
 return {group,dispose(){group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});texture.dispose();}};
}
