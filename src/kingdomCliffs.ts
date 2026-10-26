import * as T from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';

import {CLIFF_LAYOUT} from './kingdomLandscape.ts';

const ASSET='/game-assets/pbr/rock_face_01/rock_face_01_1k.gltf';
type LoadCliff=(url:string,ready:(gltf:GLTF)=>void,failed:()=>void)=>void;
function disposeModel(root:T.Object3D){
 const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse((o:any)=>{if(o.geometry)geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}});
 geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
/** Photogrammetry cliff copies share resources. A late load must never resurrect a disposed arena. */
export function createKingdomCliffs(load:LoadCliff=(url,ready,failed)=>{new GLTFLoader().load(url,ready,undefined,failed);},onUpdate:()=>void=()=>{}){
 const group=new T.Group();group.name='scanned-island-cliffs';let alive=true,model:T.Object3D|null=null;
 const fallback=new T.Group(),fallbackMaterial=new T.MeshStandardMaterial({color:0x77786c,roughness:1});
 for(const c of CLIFF_LAYOUT){const mesh=new T.Mesh(new T.IcosahedronGeometry(1,2),fallbackMaterial);mesh.position.set(c.x,c.y+4,c.z);mesh.scale.set(c.sx*2,c.sy*2,c.sz*2);fallback.add(mesh);}group.add(fallback);
 load(ASSET,gltf=>{
  if(!alive){disposeModel(gltf.scene);return;}model=gltf.scene;
  model.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.architecture=true;}});
  for(const c of CLIFF_LAYOUT){
   const cliff=model.clone(true);cliff.scale.set(c.sx,c.sy,c.sz);cliff.rotation.y=c.rotation;cliff.position.set(c.x,c.y,c.z);group.add(cliff);
  }
  fallback.visible=false;
  onUpdate();
 },()=>{/* Retain a world-space island foundation if a local asset fails to load. */});
 return {group,dispose(){if(!alive)return;alive=false;group.clear();fallback.traverse((o:any)=>o.geometry?.dispose());fallbackMaterial.dispose();if(model)disposeModel(model);}};
}
