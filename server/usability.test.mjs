import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,DECKS,createGame,instance,applyAction,legalActions,autoPass,projectGame,finish} from './engine.mjs';
import {actionChoices,materialChoice} from '../src/actionChoices.ts';
import {actionsAtDrop,dropNeedsChoice} from '../src/cardDrop.ts';
import {unavailableReason} from '../src/battleModel.ts';
import {cardLimit,deckLimitIssues} from './deckLimits.mjs';
import {validateCustom,openRewardPack,initCollection,collectionView} from './gacha.mjs';
import {awardDuelRewards} from './duelRewards.mjs';
import {createWorld} from './world.mjs';
import {emptyWorld} from './worldStore.mjs';
import {createOfflineConnection} from '../src/offlineConnection.ts';
import {createToyConnection} from '../src/toyConnection.ts';
import {ToyCloudSave,saveSnapshot} from '../src/toyCloudSave.ts';
const base=()=>DECKS[0].cards.flatMap(c=>Array(c.count).fill(c.card_id));
const profile=()=>({name:'测试决斗者',completed:[],cosmetics:['night'],tickets:30});
const j=JSON.stringify;
const resolve=g=>{for(let i=0;i<20&&g.window;i++)applyAction(g,g.window.responder,{kind:'pass'});};
function blank(){const g=createGame();g.turn=3;for(const p of g.players){p.hand=[];p.grave=[];p.spells.fill(null);p.field.fill(null);}return g;}
function put(g,p,area,id,zone=0,more={}){const c={...instance(id),owner:p,placedTurn:1,summonedTurn:1,...more};if(['spells','field'].includes(area))g.players[p][area][zone]=c;else g.players[p][area].push(c);return c;}
function step(w,fn,now=Date.now()){const m=createWorld(w,now);m.tick();const result=fn?.(m);m.flush();return result;}
const send=(w,t,type,args={},requestId=crypto.randomUUID())=>step(w,m=>m.command(t,'a',{type,requestId,...args}));
function oldDeck(){const list=base();for(let i=0;i<list.length&&list.filter(id=>id==='mirror_force').length<3;i++)if(list[i]!=='mirror_force')list[i]='mirror_force';return list;}
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
async function offline(storage=memory(),options={}){const socket=createOfflineConnection(storage,options);let state;await new Promise(r=>socket.on('state',v=>{state=v;r();}));return{socket,get state(){return state;},cmd:(type,args={},requestId=crypto.randomUUID())=>socket.timeout(1000).emitWithAck('command',{type,...args,requestId})};}

test('pool Quick-Play spells can be deliberately set without activating; placement-turn rule stays enforced',()=>{
 assert.deepEqual(Object.values(CARDS).filter(c=>c.quick).map(c=>c.id).sort(),['mst','rush_recklessly']);
 for(const id of ['mst','rush_recklessly']){
  const g=blank(),spell=put(g,0,'hand',id),target=put(g,0,'field','celtic_guardian');put(g,1,'spells','mirror_force',0,{faceUp:false});
  const view=projectGame(g,0),sets=actionsAtDrop(view,spell.uid,{type:'play',intent:'set'});assert.ok(sets.length);assert.ok(sets.every(a=>a.kind==='set'));
  applyAction(g,0,sets[0]);assert.equal(g.players[0].hand.length,0);assert.equal(g.players[0].grave.length,0);assert.equal(spell.faceUp,false);assert.equal(target.bonus,0);
  assert.ok(!legalActions(g,0).some(a=>a.kind==='activate'&&a.cardUid===spell.uid));assert.match(unavailableReason(projectGame(g,0),spell,CARDS),/盖放当回合不能发动/);
  g.turn++;assert.ok(legalActions(g,0).some(a=>a.kind==='activate'&&a.cardUid===spell.uid));
 }
 const g=blank(),reborn=put(g,0,'hand','monster_reborn');put(g,0,'grave','celtic_guardian');applyAction(g,0,legalActions(g,0).find(a=>a.kind==='set'));assert.ok(legalActions(g,0).some(a=>a.kind==='activate'&&a.cardUid===reborn.uid),'normal spells may activate after setting on the same turn');
});

test('revival presents both public graveyards and requires even a sole target to be selected',()=>{
 const g=blank(),spell=put(g,0,'hand','monster_reborn'),mine=put(g,0,'grave','celtic_guardian'),other=put(g,1,'grave','battle_ox');
 const acts=actionsAtDrop(projectGame(g,0),spell.uid,{type:'play'});assert.ok(dropNeedsChoice(acts,{type:'play'}));assert.equal(actionChoices(acts,{},true).action,null);
 const selected=actionChoices(acts,{targetUid:j(other.uid)},true).action;assert.equal(selected.targetUid,other.uid);assert.ok(acts.includes(selected));applyAction(g,0,selected);resolve(g);
 assert.equal(g.players[0].field[0].uid,other.uid);assert.equal(other.owner,1);assert.ok(g.players[0].grave.some(c=>c.uid===mine.uid));
 const sole=acts.filter(a=>a.targetUid===mine.uid);assert.equal(actionChoices(sole,{},true).action,null);assert.ok(actionChoices(sole,{targetUid:j(mine.uid)},true).action);
 assert.equal(actionChoices(acts,{targetUid:j('forged')},true).action,null);
});

test('Ritual monster and individual hand/field tributes require deliberate selection before resolution',()=>{
 const g=createGame({scenario:'T05'}),spell=g.players[0].hand.find(c=>c.id==='black_luster_ritual');
 const acts=actionsAtDrop(projectGame(g,0),spell.uid,{type:'play'}),first=acts[0];
 let choices={},ui=actionChoices(acts,choices,true);assert.equal(ui.action,null);assert.equal(ui.selections.find(s=>s.key==='tributes').enabled,false);
 choices.ritualUid=j(first.ritualUid);ui=actionChoices(acts,choices,true);assert.equal(ui.action,null);
 const group=first.tributes;assert.ok(group.length>=2);for(const [i,uid] of group.entries()){
  const s=ui.selections.find(s=>s.key==='tributes');choices.tributes=materialChoice(s,uid);ui=actionChoices(acts,choices,true);if(i<group.length-1)assert.equal(ui.action,null);
 }
 assert.ok(ui.action);assert.deepEqual(ui.action.tributes,group);assert.equal(g.players[0].grave.length,0,'selection alone consumes nothing');
 applyAction(g,0,ui.action);resolve(g);assert.equal(g.result?.winner,0);assert.ok(group.every(uid=>g.players[0].grave.some(c=>c.uid===uid)));
 choices.ritualUid=j('forged');assert.equal(actionChoices(acts,choices,true).action,null);
});

test('Fusion and full-board tribute placement keep every legal material alternative without auto sacrifices',()=>{
 const fusion=createGame({scenario:'T04'}),spell=fusion.players[0].hand.find(c=>c.id==='polymerization'),acts=actionsAtDrop(projectGame(fusion,0),spell.uid,{type:'play'}),a=acts[0];
 assert.equal(actionChoices(acts,{},true).action,null);let choices={fusionId:j(a.fusionId)},ui=actionChoices(acts,choices,true);assert.equal(ui.action,null);
 for(const uid of a.materialUids){choices.materialUids=materialChoice(ui.selections.find(s=>s.key==='materialUids'),uid);ui=actionChoices(acts,choices,true);}assert.ok(ui.action);
 const g=blank(),boss=put(g,0,'hand','blue_eyes');for(let i=0;i<5;i++)put(g,0,'field','kuriboh',i);
 const moves=actionsAtDrop(projectGame(g,0),boss.uid,{type:'play'}),options=actionChoices(moves,{},true);assert.equal(options.action,null);assert.equal(options.selections.find(s=>s.key==='tributes').options.length,10);
 const chosen=moves.at(-1),plan=actionChoices(moves,{tributes:j(chosen.tributes)},true).action;assert.ok(plan);assert.ok(chosen.tributes.includes(g.players[0].field[plan.zone].uid));
});

test('every completed practice win yields one pack, while losses and repeated scenario rewards do not',()=>{
 const p=profile(),g=createGame();finish(g,0,'胜利');const reward=awardDuelRewards(p,g,0);assert.equal(reward.packs,1);awardDuelRewards(p,g,0);assert.equal(p.rewardPacks,1);
 const next=createGame();finish(next,0,'胜利');awardDuelRewards(p,next,0);assert.equal(p.rewardPacks,2);
 for(const mode of ['practice','match','friend']){const loss=createGame({mode});finish(loss,1,'投降');assert.equal(awardDuelRewards(p,loss,0).packs,0);}
 const online=createGame({mode:'match'});finish(online,0,'胜利');assert.equal(awardDuelRewards(p,online,0).packs,0);
 for(let i=0;i<2;i++){const tutorial=createGame({mode:'scenario',scenario:'T01'});finish(tutorial,0,'通关');const r=awardDuelRewards(p,tutorial,0);assert.equal(r.packs,i?0:1);assert.equal(r.tickets,i?0:3);}
 assert.equal(p.rewardPacks,3);assert.equal(p.tickets,33);assert.equal(projectGame(g,0).result.reward.packs,1);assert.equal(projectGame(g,1).result.reward,null);assert.equal(projectGame(g,0).result.rewards,undefined);
});

test('three-card pack is R+ guaranteed, shares UR pity, costs no tickets and survives duplicate opening',()=>{
 const p=profile();initCollection(p);p.rewardPacks=2;const first=openRewardPack(p,'pack',()=>0);assert.equal(first.count,3);assert.equal(first.source,'victory-pack');assert.deepEqual(first.results.map(r=>r.rarity),['N','N','R']);assert.equal(first.results[2].guaranteed,'pack');assert.equal(p.tickets,30);assert.equal(p.rewardPacks,1);
 assert.equal(openRewardPack(p,'pack',()=>0),first);assert.equal(p.rewardPacks,1);p.pity=49;const second=openRewardPack(p,'next',()=>0);assert.equal(second.results[0].rarity,'UR');assert.equal(p.rewardPacks,0);assert.throws(()=>openRewardPack(p,'empty',()=>0),/暂无胜利卡包/);assert.equal(collectionView(p).rewardPacks,0);
});

test('all six 40-card presets obey the visible game balance table and preserve six distinct routes',()=>{
 for(const d of DECKS){const list=d.cards.flatMap(c=>Array(c.count).fill(c.card_id));assert.equal(list.length,40);assert.deepEqual(deckLimitIssues(list,CARDS),[]);assert.equal(validateCustom({},list).length,40);assert.ok(list.filter(id=>CARDS[id].kind==='trap').length<=6);}
 assert.equal(cardLimit('mirror_force'),1);assert.equal(cardLimit('trap_hole'),2);assert.equal(cardLimit('kuriboh'),3);
 const legacy=oldDeck();assert.throws(()=>validateCustom({},legacy),/神圣防护罩最多加入 1 张/);assert.deepEqual(validateCustom({},legacy,{allowLegacyRestrictions:true}),legacy);
});

test('authoritative settlement and pack opening survive a serialized world and deduplicate commands',()=>{
 let w=emptyWorld(),token=step(w,m=>m.connect(null,'a'));assert.equal(send(w,token,'practice',{deck:'tempo_starter'}).ok,true);
 const g=Object.values(w.games)[0].g;g.phase='battle';g.turn=3;g.players[0].hand=[];g.players[1].hand=[];g.players[1].field.fill(null);g.players[1].spells.fill(null);g.players[1].lp=100;put(g,0,'field','celtic_guardian');
 const a=legalActions(g,0).find(a=>a.kind==='attack'),version=g.version;assert.equal(send(w,token,'action',{version,action:a},'win').ok,true);assert.equal(w.profiles[token].rewardPacks,1);
 assert.equal(send(w,token,'action',{version,action:a},'win').ok,true);assert.equal(w.profiles[token].rewardPacks,1);w=JSON.parse(j(w));step(w,m=>m.connect(token,'a'));assert.equal(step(w,m=>m.view(token)).game.result.reward.packs,1);
 assert.equal(send(w,token,'open-pack').ok,false);assert.equal(send(w,token,'leave').ok,true);const pack=send(w,token,'open-pack',{},'open');assert.equal(pack.ok,true);assert.equal(w.profiles[token].rewardPacks,0);assert.equal(send(w,token,'open-pack',{},'open').draw.id,pack.draw.id);assert.equal(w.profiles[token].tickets,30);
 w.profiles[token].customDeck=oldDeck();for(const type of ['practice','queue','create-room']){assert.equal(send(w,token,type,{deck:'custom'}).ok,false,type);assert.equal(w.profiles[token].customDeck.length,40);}assert.equal(send(w,token,'deck-save',{cards:base()}).ok,true);
});

test('solo win packs persist through refresh; failed opening preserves unopened packs and collection',async()=>{
 const storage=memory(),c=await offline(storage);try{
  assert.equal((await c.cmd('practice',{deck:'tempo_starter',scenario:'T01'})).ok,true);const v=c.state.game;await c.cmd('action',{version:v.version,action:v.legal.find(a=>a.kind==='summon'&&a.position==='attack')});assert.equal(c.state.game.result.reward.packs,1);await c.cmd('leave');
  const restored=await offline(storage);try{assert.equal(restored.state.profile.rewardPacks,1);const original=storage.setItem;storage.setItem=()=>{throw Error('quota');};assert.equal((await restored.cmd('open-pack')).ok,false);assert.equal(restored.state.profile.rewardPacks,1);assert.deepEqual(restored.state.profile.collection,{});storage.setItem=original;
   const b=await restored.cmd('open-pack',{},'same-pack');assert.equal(b.draw.count,3);await restored.cmd('open-pack',{},'same-pack');assert.equal(restored.state.profile.rewardPacks,0);assert.equal(restored.state.profile.tickets,33);
  }finally{restored.socket.disconnect();}
 }finally{c.socket.disconnect();}
});

test('Toy cloud snapshots retain pack balances and illegal legacy decks without deleting collections',async()=>{
 const values={},api={async getCloudStorage(keys){return Object.fromEntries(keys.map(k=>[k,values[k]]));},async setCloudStorage(data){Object.assign(values,data);}};
 const p=profile();initCollection(p);p.rewardPacks=7;p.customDeck=oldDeck();p.collection={vorse_raider:2};const cloud=new ToyCloudSave(api);await cloud.save(p);const restored=await new ToyCloudSave(api).load();assert.equal(restored.rewardPacks,7);assert.deepEqual(restored.customDeck,p.customDeck);assert.deepEqual(restored.collection,p.collection);assert.equal(saveSnapshot({...p,rewardPacks:undefined}).rewardPacks,0);
});

test('both public graveyards preserve card identities while the opponent hand and unrevealed sets stay hidden',()=>{
 const g=blank(),own=put(g,0,'grave','monster_reborn'),publicCard=put(g,1,'grave','mirror_force'),secret=put(g,1,'spells','magic_cylinder',2,{faceUp:false}),hand=put(g,1,'hand','blue_eyes');const v=projectGame(g,0);
 assert.equal(v.players[0].grave[0].uid,own.uid);assert.equal(v.players[1].grave[0].id,publicCard.id);assert.equal(v.players[1].spells[2].id,undefined);assert.deepEqual(v.players[1].hand,[]);assert.ok(!j(v).includes(hand.uid));assert.equal(v.players[1].spells[2].uid,secret.uid);
});


test('Toy account restoration accepts legacy restricted decks, but playing and saving them are blocked until repaired',async()=>{
 const values={},api={async getCloudStorage(keys){return Object.fromEntries(keys.map(k=>[k,values[k]]));},async setCloudStorage(data){Object.assign(values,data);}};
 const p=profile();initCollection(p);p.customDeck=oldDeck();p.rewardPacks=2;await new ToyCloudSave(api).save(p);const socket=await createToyConnection(api);let state;await new Promise(r=>socket.on('state',v=>{state=v;r();}));
 const command=(type,args={})=>socket.timeout(1000).emitWithAck('command',{type,...args,requestId:crypto.randomUUID()});
 try{assert.equal(state.storage.blocked,false);assert.deepEqual(state.profile.customDeck,p.customDeck);assert.equal(state.profile.rewardPacks,2);assert.equal((await command('practice',{deck:'custom'})).ok,false);assert.equal((await command('deck-save',{cards:p.customDeck})).ok,false);assert.equal((await command('deck-save',{cards:base()})).ok,true);assert.deepEqual((await new ToyCloudSave(api).load()).customDeck,base());assert.equal(state.profile.rewardPacks,2);}finally{socket.disconnect();}
});
