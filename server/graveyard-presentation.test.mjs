import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {publicPileMoves,publicPilePosition,visiblePileCards,pileTransferPhase,PILE_TRANSFER_MS} from '../src/graveyardModel.ts';
import {createPublicPile} from '../src/graveyardScene.ts';
import {publicPileEffect,disposeEffect} from '../src/arenaEffects.ts';
import {createGame,applyAction,projectGame,legalActions} from './engine.mjs';
const state=()=>({id:'duel',version:1,you:0,players:[0,1].map(()=>({field:Array(5).fill(null),spells:Array(5).fill(null),hand:[],grave:[],banished:[]}))});
const clone=x=>structuredClone(x);
test('initial, restored, repeated and out-of-order snapshots do not replay public pile transfers',()=>{
 const g=state();g.players[0].grave=[{uid:'old',id:'kuriboh'}];
 for(const previous of [null,{...g,id:'previous-duel'},g,{...g,version:3}])assert.deepEqual(publicPileMoves(previous,g),[]);
});
test('multiple cards entering a public pile are identified by uid even when the count stays equal',()=>{
 const before=state();before.players[0].grave=[{uid:'old',id:'kuriboh'}];before.players[0].field[0]={uid:'new',id:'celtic_guardian'};
 const next=clone(before);next.version++;next.players[0].grave=[{uid:'new',id:'celtic_guardian'}];next.players[0].field[0]=null;
 assert.deepEqual(publicPileMoves(before,next),[{uid:'new',id:'celtic_guardian',player:0,area:'grave',fromPlayer:0,fromArea:'field',fromZone:0}]);
 assert.equal(before.players[0].field[0].uid,'new');
});
test('a borrowed monster returns to its owner grave instead of the former controller',()=>{
 const before=state();before.players[0].field[2]={uid:'borrowed',id:'battle_ox',owner:1};
 const next=clone(before);next.version++;next.players[0].field[2]=null;next.players[1].grave.push({uid:'borrowed',id:'battle_ox',owner:1});
 const [move]=publicPileMoves(before,next);assert.equal(move.player,1);assert.equal(move.fromPlayer,0);assert.equal(move.fromZone,2);
});
test('a face-down card has no revealed identity until it actually enters a public pile',()=>{
 const before=state();before.players[1].spells[0]={uid:'hidden',faceUp:false};before.players[1].hand=[{uid:'also-hidden'}];
 const next=clone(before);next.version++;next.players[1].spells[0]=null;next.players[1].grave=[{uid:'hidden',id:'mirror_force',faceUp:true}];
 assert.deepEqual(publicPileMoves(before,next).map(m=>m.id),['mirror_force']);assert.equal(before.players[1].spells[0].id,undefined);
 next.players[1].grave.push({uid:'unknown'});assert.equal(publicPileMoves(before,next).length,1);
});
test('banished material uses a distinct destination and revival does not create a false grave entry',()=>{
 const before=state();before.players[0].grave=[{uid:'hero',id:'hero_avian'},{uid:'revived',id:'battle_ox'}];
 const next=clone(before);next.version++;next.players[0].grave=[];next.players[0].banished=[{uid:'hero',id:'hero_avian'}];next.players[0].field[0]={uid:'revived',id:'battle_ox'};
 assert.deepEqual(publicPileMoves(before,next).map(m=>[m.uid,m.area,m.fromArea]),[['hero','banished','grave']]);
 assert.deepEqual(publicPilePosition(true,'grave'),{x:-8.65,y:.1,z:2.65});assert.notDeepEqual(publicPilePosition(true,'grave'),publicPilePosition(true,'banished'));
 assert.equal(publicPilePosition(false,'grave').x,-publicPilePosition(true,'grave').x);
});
test('archive order is newest first, excludes unknown identities and leaves network state immutable',()=>{
 const g=state();g.players[1].grave=[{uid:'a',id:'kuriboh'},{uid:'x'},{uid:'b',id:'kuriboh'}];
 assert.deepEqual(visiblePileCards(g,1,'grave').map(c=>c.uid),['b','a']);assert.equal(g.players[1].grave[0].uid,'a');
});
test('real GX Miracle Fusion moves public grave materials to banished piles, including the used spell to grave',()=>{
 const game=createGame({scenario:'T07'}),before=projectGame(game,0),action=legalActions(game,0).find(a=>a.kind==='activate'&&a.materialUids?.length===2);assert.ok(action);
 applyAction(game,0,action);for(let i=0;i<20&&game.window;i++)applyAction(game,game.window.responder,{kind:'pass'});
 const after=projectGame(game,0),moves=publicPileMoves(before,after);assert.equal(moves.filter(m=>m.area==='banished').length,2);assert.ok(moves.some(m=>m.area==='grave'&&m.id==='miracle_fusion'));
});
test('card travel remains finite, lands at the public pile and disposes only owned GPU resources',()=>{
 const texture=new T.Texture(),effect=publicPileEffect(new T.Vector3(3,0,2),new T.Vector3(-8.65,.1,2.65),texture);let textureDisposed=false;texture.addEventListener('dispose',()=>textureDisposed=true);
 for(const t of [0,.2,.5,.79,1]){effect.update(t);effect.group.updateMatrixWorld(true);effect.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
 const card=effect.group.children[0];assert.ok(card.position.distanceTo(new T.Vector3(-8.65,.2,2.65))<.001);disposeEffect(effect.group);assert.equal(textureDisposed,false);texture.dispose();
});


test('pile transfer holds the readable face before travelling and seals only at arrival',()=>{
 assert.equal(PILE_TRANSFER_MS,2300);
 const read=pileTransferPhase(.2);assert.ok(read.lift>.95);assert.equal(read.travel,0);assert.equal(read.sink,0);assert.equal(read.fade,1);
 const fly=pileTransferPhase(.5);assert.ok(fly.travel>.4&&fly.travel<.7);assert.equal(fly.sink,0);
 const land=pileTransferPhase(.82);assert.equal(land.travel,1);assert.ok(land.sink>.4&&land.sink<.6);assert.equal(land.fade,1);
 assert.equal(pileTransferPhase(1).fade,0);
 const facing=new T.Quaternion().setFromEuler(new T.Euler(-.6,.2,0)),texture=new T.Texture(),effect=publicPileEffect(new T.Vector3(0,0,0),new T.Vector3(8,.1,3),texture,false,facing);
 effect.update(.22);assert.ok(effect.group.children[0].quaternion.angleTo(facing)<.001);assert.ok(effect.group.children[0].position.y>1.5);disposeEffect(effect.group);texture.dispose();
});

test('GY altar has a raised seal and an animated arrival mark, outside all legal card columns',()=>{
 const own=createPublicPile({own:true,area:'grave',cards:[]}),other=createPublicPile({own:false,area:'banished',cards:[]});
 for(const group of [own,other]){group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group);assert.ok(bounds.max.y>.8);assert.ok(bounds.max.x<-7.1||bounds.min.x>7.1);group.userData.animate(0,false,0);group.userData.animate(1000,true,1);group.traverse(o=>{if(o.material?.opacity!==undefined)assert.ok(o.material.opacity>=0&&o.material.opacity<=1);});disposeEffect(group);}
});
