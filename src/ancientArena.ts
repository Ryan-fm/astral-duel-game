import * as T from 'three';

/** Roman ruin architecture is actual scene geometry, sharing the monsters' lighting/shadows. */
export function createAncientArena(){
 const group=new T.Group();group.name='roman-duel-ruins';const stone=new T.MeshStandardMaterial({color:0x8f8065,roughness:.92,metalness:.02}),edge=new T.MeshStandardMaterial({color:0x817259,roughness:.85}),gold=new T.MeshStandardMaterial({color:0xb59b56,metalness:.48,roughness:.6});
 const noise=new Uint8Array(128*128*4);let seed=20261010;for(let i=0;i<128*128;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=i%128,y=Math.floor(i/128),n=170+(seed>>>24)*.2+9*Math.sin(x*.17+y*.13);noise[i*4]=noise[i*4+1]=noise[i*4+2]=n;noise[i*4+3]=255;}const grain=new T.DataTexture(noise,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(5,5);grain.generateMipmaps=true;grain.minFilter=T.LinearMipmapLinearFilter;grain.magFilter=T.LinearFilter;grain.anisotropy=4;grain.needsUpdate=true;stone.bumpMap=grain;stone.bumpScale=.055;stone.map=grain;
 function box(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=stone){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d,Math.max(1,Math.round(w)),1,Math.max(1,Math.round(d))),m);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);return mesh;}
 function cylinder(r:number,h:number,x:number,y:number,z:number,m:T.Material=stone,r2=r){const mesh=new T.Mesh(new T.CylinderGeometry(r2,r,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 box(19.5,.46,15.5,0,-.64,0,edge);box(19.9,.18,15.9,0,-.93,0,stone);box(20.2,.18,16.2,0,-1.11,0,edge);
 // Physical stone slabs, shallow weathering seams, and an inlaid perimeter.
 for(let row=0;row<8;row++)for(let col=0;col<10;col++){const m=stone.clone();m.color.multiplyScalar(.93+.1*((Math.sin(row*17.17+col*8.19)+1)/2));box(1.883,.12,1.855,(col-4.5)*1.9,-.064,(row-3.5)*1.875,m);}
 for(const s of [-1,1]){box(.035,.015,14.6,s*9.1,.006,0,gold);box(18.2,.015,.035,0,.006,s*7.3,gold);}
 for(let i=0;i<14;i++){const x=-8.4+i*1.3;const a=box(.26,.012,.26,x,.005,-7.28,gold);a.rotation.y=Math.PI/4;const b=box(.26,.012,.26,x,.005,7.28,gold);b.rotation.y=Math.PI/4;}
 function column(x:number,z:number,height:number,broken=false){
  box(1.5,.2,1.5,x,-.32,z);box(1.15,.2,1.15,x,-.12,z);cylinder(.51,.18,x,.08,z);const shaft=cylinder(.37,height,x,height*.5+.18,z,stone,.32);if(broken){const p=shaft.geometry.getAttribute('position');for(let i=0;i<p.count;i++)if(p.getY(i)>height*.45)p.setY(i,p.getY(i)-.08-.17*(Math.sin(p.getX(i)*47+p.getZ(i)*31)+1));shaft.geometry.computeVertexNormals();}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const flute=cylinder(.033,height-.15,x+Math.cos(a)*.345,height*.5+.18,z+Math.sin(a)*.345,edge);flute.castShadow=false;}
  cylinder(.45,.16,x,height+.21,z);if(!broken){box(1.18,.17,1.18,x,height+.36,z);for(let i=0;i<4;i++){const a=i*Math.PI/2;const volute=new T.Mesh(new T.TorusGeometry(.11,.036,8,20),stone);volute.position.set(x+Math.cos(a)*.4,height+.15,z+Math.sin(a)*.4);volute.rotation.y=a;volute.castShadow=true;group.add(volute);}}
 }
 for(const s of [-1,1]){column(s*11.2,-3.8,6.2);column(s*11.8,3.8,3.3,true);column(s*9.2,-9.6,4.4,true);for(let i=0;i<3;i++){const stoneBlock=box(.7+i*.15,.4,.8,s*(10.7+i*.7),-.25,5.5+i*.3,edge);stoneBlock.rotation.y=.6*i;}}
 // Curved low spectator terraces extend the historical stage behind the board.
 for(let step=0;step<3;step++)for(let i=0;i<17;i++){const theta=(i/16-.5)*1.5,x=Math.sin(theta)*(13+step*.9),z=-Math.cos(theta)*(11.5+step*.9);const terrace=box(1.22,.33,1.05,x,-.35+step*.34,z);terrace.rotation.y=-theta;}
 return {group,dispose(){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grain.dispose();}};
}
