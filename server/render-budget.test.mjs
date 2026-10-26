import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createZoneInlay,batchZoneInlays} from '../src/arenaStage.ts';
import {createPublicPile} from '../src/graveyardScene.ts';

test('batched sockets retain twenty separate world positions and distinct public action signals',()=>{
 const zones=[];for(const side of [-1,1])for(const z of [2.4,5.3])for(const x of [-6,-3,0,3,6]){const zone=createZoneInlay(false,side===1,x===0,x===3,x===6);zone.position.set(x,0,z*side);zones.push(zone);}
 const batch=batchZoneInlays(zones);assert.equal(batch.children.length,2);batch.updateMatrixWorld(true);
 const surfaces=batch.children.find(object=>object instanceof T.Mesh),ray=new T.Raycaster();
 for(const side of [-1,1])for(const z of [2.4,5.3])for(const x of [-6,-3,0,3,6]){ray.set(new T.Vector3(x,2,z*side),new T.Vector3(0,-1,0));assert.ok(ray.intersectObject(surfaces).length,`${x},${z*side}`);}
 const colors=batch.children.find(object=>object instanceof T.LineSegments).geometry.getAttribute('color');assert.equal(colors.itemSize,4);const signals=new Set();for(let i=0;i<colors.count;i++){signals.add([colors.getX(i),colors.getY(i),colors.getZ(i)].map(n=>n.toFixed(2)).join(':'));assert.ok(colors.getW(i)>=0&&colors.getW(i)<=1);}assert.ok(signals.size>=4,'own/opponent/legal/drop colours remain distinct');
});

test('a full public Graveyard retains its physical stack within a bounded draw budget',()=>{
 const pile=createPublicPile({own:true,area:'grave',cards:Array.from({length:12},(_,i)=>({id:'celtic_guardian',uid:String(i)})),face:new T.Texture()});let draws=0;
 pile.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Line)draws++;if(object instanceof T.Mesh)for(const attr of Object.values(object.geometry.attributes))for(const value of attr.array)assert.ok(Number.isFinite(value));});
 assert.ok(draws<=10,`public pile draws ${draws}`);const bounds=new T.Box3().setFromObject(pile);assert.ok(bounds.max.y>1.5,'raised seal retained');assert.ok(bounds.min.y<.1,'base stays grounded');
});
