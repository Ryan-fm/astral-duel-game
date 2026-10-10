import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync,statSync} from 'node:fs';
import {CLIFF_LAYOUT} from '../src/kingdomLandscape.ts';
import {createKingdomCliffs} from '../src/kingdomCliffs.ts';

function model(){const scene=new T.Group(),geometry=new T.BoxGeometry(1,1,1),texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture});scene.add(new T.Mesh(geometry,material));return {scene,geometry,texture,material};}

test('late cliff asset completion releases resources without restoring an unmounted scene',()=>{
 let ready;const cliffs=createKingdomCliffs((_,done)=>{ready=done;});const asset=model();let disposed=0;
 for(const resource of [asset.geometry,asset.texture,asset.material])resource.addEventListener('dispose',()=>disposed++);
 cliffs.dispose();ready({scene:asset.scene});assert.equal(cliffs.group.children.length,0);assert.equal(disposed,3);
});

test('coastal photogrammetry copies share resources and release them only once',()=>{
 let ready;const cliffs=createKingdomCliffs((_,done)=>{ready=done;});const asset=model();let disposed=0;
 for(const resource of [asset.geometry,asset.texture,asset.material])resource.addEventListener('dispose',()=>disposed++);
 ready({scene:asset.scene});const copies=cliffs.group.children.filter(o=>o.visible);assert.equal(copies.length,CLIFF_LAYOUT.length);
 assert.equal(new Set(copies.map(c=>c.children[0].geometry)).size,1);assert.equal(new Set(copies.map(c=>c.children[0].material)).size,1);
 cliffs.dispose();cliffs.dispose();assert.equal(disposed,3);
});

test('failed asset loading retains a visible island foundation',()=>{
 const cliffs=createKingdomCliffs((_,__,failed)=>failed());assert.equal(cliffs.group.children[0].visible,true);assert.equal(cliffs.group.children[0].children.length,CLIFF_LAYOUT.length);cliffs.dispose();
});

test('all glTF buffers and images exist locally and keep a bounded triangle budget',()=>{
 const root=new URL('../public/game-assets/pbr/rock_face_01/',import.meta.url),gltf=JSON.parse(readFileSync(new URL('rock_face_01_1k.gltf',root)));
 for(const resource of [...gltf.buffers,...gltf.images]){assert.ok(!/^https?:/.test(resource.uri));assert.ok(statSync(new URL(resource.uri,root)).size>0);}
 let triangles=0;for(const m of gltf.meshes)for(const p of m.primitives)triangles+=gltf.accessors[p.indices].count/3;
 assert.ok(triangles<=21000);assert.ok(triangles*CLIFF_LAYOUT.length+135000+60000<320000);
});
