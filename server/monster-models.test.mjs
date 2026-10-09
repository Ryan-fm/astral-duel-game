import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMonsterActor,MONSTER_MODELS,shouldShowMonster} from '../src/monsterModels.ts';
import {CARDS,createGame,projectGame} from './engine.mjs';

test('every playable monster, including the hidden collection pool, has a real volumetric mesh',()=>{
 const ids=Object.values(CARDS).filter(c=>c.kind==='monster').map(c=>c.id);assert.deepEqual([...MONSTER_MODELS].sort(),ids.sort());
 for(const id of ids){const a=createMonsterActor(id);a.update(0,{},true);a.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(a.root),size=box.getSize(new THREE.Vector3());assert.ok(size.x>.8&&size.y>1&&size.z>.4,id+' has volume');assert.ok(box.min.y>=-.01,id+' stands on ground');let meshes=0;
 a.root.traverse(o=>{assert.notEqual(o.isSprite,true,id+' must not use billboards');if(!o.isMesh)return;meshes++;const positions=o.geometry.getAttribute('position');for(const n of positions.array)assert.ok(Number.isFinite(n),id+' valid geometry');assert.equal(o.castShadow,true);for(const m of Array.isArray(o.material)?o.material:[o.material])assert.equal(m.map,null,id+' does not reuse a card face');});assert.ok(meshes>0,id+' contains rendered meshes');a.dispose();}
});
test('face-down, unidentified and non-field cards never reveal a monster',()=>{
 const game=createGame({scenario:'T02'});game.players[1].field[0].faceUp=false;
 assert.equal(shouldShowMonster(projectGame(game,0).players[1].field[0],'field'),false);
 assert.equal(shouldShowMonster(game.players[1].field[0],'field'),false,'even an owner-known face-down card is not materialized');
 assert.equal(shouldShowMonster({id:'kuriboh',faceUp:true},'field'),true);assert.equal(shouldShowMonster({id:'kuriboh',faceUp:true},'hand'),false);assert.equal(shouldShowMonster({faceUp:true},'field'),false);
});
test('3D attack, summon and wing motion change geometry pose without changing gameplay statistics',()=>{
 const before=JSON.stringify(CARDS.blue_eyes),a=createMonsterActor('blue_eyes');a.update(0,{},true);const pose=a.root.getObjectByName('body').position.clone(),wing=a.root.getObjectByName('wing1').rotation.clone();a.update(1,{birth:.5,attack:.25,hit:0});assert.ok(a.root.getObjectByName('body').position.z>pose.z+.2);assert.notEqual(a.root.getObjectByName('wing1').rotation.y,wing.y);a.update(2,{},true);assert.equal(a.root.getObjectByName('body').position.z,0);assert.equal(a.root.getObjectByName('wing1').rotation.y,wing.y);assert.equal(JSON.stringify(CARDS.blue_eyes),before);a.dispose();
});
test('models can be ray-picked from their front and side surfaces',()=>{
 const a=createMonsterActor('kuriboh');a.update(0,{},true);a.root.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(a.root).getCenter(new THREE.Vector3());
 for(const p of [new THREE.Vector3(0,center.y,8),new THREE.Vector3(8,center.y,0)]){const ray=new THREE.Raycaster(p,center.clone().sub(p).normalize());assert.ok(ray.intersectObject(a.root,true).length>0);}
 a.dispose();
});
test('disposing batched sculptures releases each geometry and material once',()=>{
 const a=createMonsterActor('dark_magician'),gs=new Set(),ms=new Set();a.root.traverse(o=>{if(o.isMesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});let geometries=0,materials=0;for(const g of gs)g.addEventListener('dispose',()=>geometries++);for(const m of ms)m.addEventListener('dispose',()=>materials++);a.dispose();assert.equal(geometries,gs.size);assert.equal(materials,ms.size);
});
