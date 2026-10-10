import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKingdomEnvironment} from '../src/kingdomEnvironment.ts';

function maps(){const color=new T.Texture();color.colorSpace=T.SRGBColorSpace;return {color,normal:new T.Texture(),arm:new T.Texture()};}
function setup(){return createKingdomEnvironment({floor:maps(),stone:maps()});}

test('all card centres lie above the same continuous world floor',()=>{
 const world=setup();world.group.updateMatrixWorld(true);
 const ground=world.group.getObjectByName('world-ground');
 const ray=new T.Raycaster();
 for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3]){
  ray.set(new T.Vector3(x,3,z),new T.Vector3(0,-1,0));
  const hit=ray.intersectObject(ground)[0];assert.ok(hit,'ground under every legal zone');assert.ok(Math.abs(hit.point.y+.12)<.001);
 }
 // The floor extends into the camera foreground; its back edge is behind the courtyard wall.
 ground.geometry.computeBoundingBox();const bounds=new T.Box3().setFromObject(ground);
 assert.ok(bounds.max.z>35);assert.ok(bounds.min.z<-15&&bounds.min.z>-20);
 world.dispose();
});

test('architecture leaves every legal zone visible across the supported orbit',()=>{
 const world=setup();world.group.updateMatrixWorld(true);
 const architecture=world.group.children.filter(o=>o.userData.architecture);
 const ray=new T.Raycaster();
 for(const angle of [-.65,-.32,0,.32,.65]){
  const eye=new T.Vector3(Math.sin(angle)*23,10.5,Math.cos(angle)*23);
  for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3]){
   const target=new T.Vector3(x,.2,z);ray.set(eye,target.clone().sub(eye).normalize());ray.far=eye.distanceTo(target)-.02;
   assert.equal(ray.intersectObjects(architecture).length,0,`blocked zone ${x},${z}, orbit ${angle}`);
  }
 }
 world.dispose();
});

test('spatial scene has valid geometry and bounded draw/triangle counts',()=>{
 const world=setup();let draws=0,triangles=0;
 world.group.traverse(o=>{if(!(o instanceof T.Mesh))return;draws++;
  for(const attribute of Object.values(o.geometry.attributes))for(const value of attribute.array)assert.ok(Number.isFinite(value));
  const count=o.geometry.index?.count??o.geometry.getAttribute('position').count;
  triangles+=count/3*(o instanceof T.InstancedMesh?o.count:1);
 });
 assert.ok(draws<=16);assert.ok(triangles<135000);world.dispose();
});

test('PBR maps defer unloaded uploads, retain linear data and release only owned copies',()=>{
 const floor=maps(),stone=maps(),sources=[...Object.values(floor),...Object.values(stone)];let originalsDisposed=0,ownedDisposed=0;
 for(const t of sources)t.addEventListener('dispose',()=>originalsDisposed++);
 const world=createKingdomEnvironment({floor,stone}),ownedMaps=new Set(),geometry=new Set();
 world.group.traverse(o=>{if(!(o instanceof T.Mesh))return;geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map){assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.normalMap.colorSpace,T.NoColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(m.roughnessMap,m.aoMap);}for(const k of ['map','normalMap','roughnessMap','aoMap'])if(m[k])ownedMaps.add(m[k]);}});
 assert.equal(ownedMaps.size,6);
 for(const map of ownedMaps){assert.equal(map.version,0);assert.ok(!sources.includes(map));map.addEventListener('dispose',()=>ownedDisposed++);}
 let geometryDisposed=0;for(const g of geometry)g.addEventListener('dispose',()=>geometryDisposed++);
 const image={width:16,height:16};stone.color.image=image;assert.ok([...ownedMaps].some(m=>m.image===image));
 world.dispose();assert.equal(originalsDisposed,0);assert.equal(ownedDisposed,ownedMaps.size);assert.equal(geometryDisposed,geometry.size);
});

test('floor geometry cannot protrude through cards or ground-bound zone inlays',()=>{
 const world=setup();world.group.updateMatrixWorld(true);const floor=world.group.getObjectByName('stone-courtyard');
 const ray=new T.Raycaster();
 for(const x of [-7,-6,-3,0,3,6,7])for(const z of [-6,-5.3,-2.4,0,2.4,5.3,6]){
  ray.set(new T.Vector3(x,1,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(floor)[0];assert.ok(hit);assert.ok(hit.point.y<0&&hit.point.y>-.05);
 }
 world.dispose();
});
