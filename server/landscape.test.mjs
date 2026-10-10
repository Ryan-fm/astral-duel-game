import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKingdomLandscape,islandHeight,CASTLE_LIFT,CLIFF_LAYOUT} from '../src/kingdomLandscape.ts';

function maps(){const texture=()=>new T.Texture();const color=texture();color.colorSpace=T.SRGBColorSpace;return {ground:{color,normal:texture(),arm:texture()},path:{color:color.clone(),normal:texture(),arm:texture()},twig:color.clone(),alpha:texture(),bark:color.clone()};}
test('gate approach, castle and cliff heights belong to one connected island',()=>{
 assert.equal(islandHeight(0,-16),1.4);assert.equal(islandHeight(25,-15),1.4);
 assert.ok(Math.abs(islandHeight(12.5,-69)-3.6)<.001);
 assert.ok(CASTLE_LIFT-1.65>=islandHeight(8,-65)-.1);
 for(let z=-16;z>=-69;z-=.5){const t=(-z-16)/53,x=t*12.5+Math.sin(t*Math.PI)*5;assert.ok(islandHeight(x,z)>0);assert.ok(Math.abs(islandHeight(x,z)-islandHeight(x,z-.5))<.5);}
 for(const c of CLIFF_LAYOUT){assert.ok(Math.abs(c.x)>25);assert.ok(c.z<=-20);assert.ok(c.y<-4);}
});
test('terrain and forest leave all twenty playable zones visible through the entire orbit',()=>{
 const world=createKingdomLandscape(maps());world.group.updateMatrixWorld(true);const ray=new T.Raycaster();
 for(const angle of [-.65,-.32,0,.32,.65]){
  const eye=new T.Vector3(Math.sin(angle)*23,10.5,Math.cos(angle)*23);
  for(const x of [-6,-3,0,3,6])for(const z of [-5.3,-2.4,2.4,5.3]){const target=new T.Vector3(x,.2,z);ray.set(eye,target.clone().sub(eye).normalize());ray.far=eye.distanceTo(target)-.02;assert.equal(ray.intersectObjects(world.group.children,true).length,0);}
 }
 const road=world.group.getObjectByName('castle-approach');for(const y of Array.from(road.geometry.getAttribute('normal').array).filter((_,i)=>i%3===1))assert.ok(y>0,'approach faces upward');
 let triangles=0,draws=0;world.group.traverse(o=>{if(!(o instanceof T.Mesh))return;draws++;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)assert.ok(Number.isFinite(v));triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3*(o.count??1);});
 assert.ok(draws<=7);assert.ok(triangles<60000);world.dispose();
});
test('landscape disposes owned maps and instance buffers once, leaving shared inputs intact',()=>{
 const inputs=maps(),source=[...Object.values(inputs.ground),...Object.values(inputs.path),inputs.twig,inputs.alpha,inputs.bark];let inputDisposed=0;source.forEach(t=>t.addEventListener('dispose',()=>inputDisposed++));
 const world=createKingdomLandscape(inputs),owned=new Set(),geometry=new Set();let instanceDisposed=0;
 world.group.traverse(o=>{if(!(o instanceof T.Mesh))return;geometry.add(o.geometry);if(o instanceof T.InstancedMesh)o.addEventListener('dispose',()=>instanceDisposed++);for(const v of Object.values(o.material))if(v instanceof T.Texture)owned.add(v);});
 let released=0;for(const t of owned){assert.equal(t.version,0);assert.ok(!source.includes(t));t.addEventListener('dispose',()=>released++);}assert.equal(owned.size,9);
 let geoDisposed=0;geometry.forEach(g=>g.addEventListener('dispose',()=>geoDisposed++));world.update(10000,true);world.update(10000,false);world.dispose();world.dispose();
 assert.equal(inputDisposed,0);assert.equal(released,9);assert.equal(geoDisposed,geometry.size);assert.equal(instanceDisposed,2);
});
