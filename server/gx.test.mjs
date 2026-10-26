import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,DECKS,RULES_VERSION,createGame,instance,legalActions,applyAction,projectGame,chooseAi} from './engine.mjs';
import {POOL,owned,initCollection,collectionView,validateCustom,validateExtra,pull} from './gacha.mjs';
import {actionChoices} from '../src/actionChoices.ts';
import {automaticPlayActions,dropNeedsChoice} from '../src/cardDrop.ts';
import {planVoiceSummon} from '../src/voiceModel.ts';
import {attackPreview,findVisibleCard} from '../src/battleModel.ts';
import {fusionReadiness,workshopCards,deckDraftIssues} from '../src/deckWorkshopModel.ts';
const j=JSON.stringify;
function blank(){const g=createGame();g.turn=3;for(const p of g.players){p.hand=[];p.grave=[];p.banished=[];p.extraDeck=[];p.deck=[];p.field.fill(null);p.spells.fill(null);}return g;}
function put(g,p,area,id,zone=0,props={}){const c={...instance(id),owner:p,summonedTurn:1,placedTurn:1,...props};if(['field','spells'].includes(area))g.players[p][area][zone]=c;else g.players[p][area].push(c);return c;}
function act(g,p,kind,match={}){const a=legalActions(g,p).find(a=>a.kind===kind&&Object.entries(match).every(([k,v])=>j(a[k])===j(v)));assert.ok(a,`missing ${kind} ${j(match)}`);applyAction(g,p,a);return a;}
function resolve(g){for(let i=0;i<40&&g.window&&!g.result;i++)applyAction(g,g.window.responder,{kind:'pass'});assert.ok(!g.window);}
function miracle(){const g=blank(),spell=put(g,0,'hand','miracle_fusion'),a=put(g,0,'grave','hero_avian'),b=put(g,0,'field','hero_burstinatrix',2,{faceUp:false,position:'defense'}),boss=put(g,0,'extraDeck','hero_flame_wingman');return {g,spell,a,b,boss};}
const draft=d=>({main:d.cards.flatMap(c=>Array(c.count).fill(c.card_id)),extra:d.extra||[]});
test('GX 01 adds 16 illustrated cards and two complete free presets while retaining DM',()=>{
 assert.equal(RULES_VERSION,'classic-gx-v1');assert.equal(Object.keys(CARDS).length,62);const added=Object.values(CARDS).filter(c=>c.releaseVersion==='gx-1');assert.equal(added.length,16);assert.equal(added.filter(c=>c.era==='GX').length,14);
 assert.equal(added.filter(c=>!c.hiddenPool).length,12);assert.equal(DECKS.length,8);assert.equal(DECKS.filter(d=>d.era==='DM').length,6);
 for(const c of added){assert.ok(c.rulesText);for(const path of [c.face,c.art]){const b=readFileSync(new URL('../public'+path,import.meta.url));assert.equal(b[0],255);assert.equal(b[1],216);}}
 for(const d of DECKS.filter(d=>d.era==='GX')){const v=draft(d);assert.deepEqual(validateCustom({},v.main),v.main);assert.deepEqual(validateExtra({},v.extra),v.extra);assert.deepEqual(deckDraftIssues(v,{},CARDS),[]);assert.ok(fusionReadiness(v,CARDS).every(r=>r.ready));}
});
test('GX upgrade retains old custom decks, collection, tickets, draw history and pity; only four new secrets need collecting',()=>{
 const old=draft(DECKS[0]),p={collection:{alexandrite_dragon:2,meteor_black_dragon:1},tickets:7,pity:49,dust:22,rewardPacks:3,drawHistory:[{requestId:'old',results:[]}],customDeck:old.main,customExtra:old.extra};const before=j(p);initCollection(p);for(const [k,v] of Object.entries(JSON.parse(before)))assert.deepEqual(p[k],v);
 const view=collectionView(p);assert.equal(view.baseSize,42);assert.equal(view.poolSize,19);assert.equal(view.legacyOwned,1);assert.equal(view.cardPoolVersion,'gx-1');assert.equal(owned(p,'cyber_dragon'),3);assert.equal(owned(p,'hero_thunder_giant'),0);assert.equal(owned(p,'alexandrite_dragon'),2);
 assert.equal(POOL.filter(c=>c.era==='GX').length,4);assert.ok(!POOL.some(c=>c.id==='alexandrite_dragon'));assert.ok(!view.cardCatalog.cyber_end_dragon);
 let index=0;const batch=pull(p,1,'gx-ur',max=>index++===0?0:POOL.filter(c=>c.rarity==='UR').findIndex(c=>c.id==='cyber_end_dragon'));assert.equal(batch.results[0].cardId,'cyber_end_dragon');assert.equal(batch.results[0].guaranteed,'pity');assert.equal(p.pity,0);assert.equal(p.tickets,6);assert.deepEqual(validateExtra(p,['cyber_end_dragon']),['cyber_end_dragon']);
});
test('HERO search and Fusion Sage require deliberate choices, reveal only selected card and preserve hidden deck order',()=>{
 for(const spellId of ['emergency_call','fusion_sage']){const g=blank(),spell=put(g,0,'hand',spellId);const hero=put(g,0,'deck','hero_neos'),other=put(g,0,'deck','cyber_dragon'),poly=put(g,0,'deck','polymerization');put(g,0,'deck','hero_sparkman');const view=projectGame(g,0),moves=automaticPlayActions(view,spell.uid),targetId=spellId==='emergency_call'?hero.id:poly.id;
 assert.equal(dropNeedsChoice(moves,{type:'play'}),true);assert.equal(actionChoices(moves,{},true).action,null);const chosen=actionChoices(moves,{searchId:j(targetId)},true).action;assert.ok(chosen);assert.ok(!moves.some(a=>a.searchId==='cyber_dragon'));
 const opponent=projectGame(g,1);assert.ok(!j(opponent).includes(hero.uid));assert.equal(opponent.cardCatalog.hero_neos,undefined);applyAction(g,0,chosen);assert.ok(!j(projectGame(g,1)).includes(targetId==='hero_neos'?hero.uid:poly.uid));resolve(g);
 assert.equal(g.players[0].hand[0].id,targetId);assert.equal(g.players[0].deck.length,3);assert.ok(g.players[0].deck.some(c=>c.uid===other.uid));assert.ok(g.events.some(e=>e.type==='reveal'&&e.id===targetId));assert.equal(projectGame(g,1).players[0].hand.length,0);assert.ok(!j(projectGame(g,1)).includes(other.uid));if(targetId==='hero_neos')assert.ok(projectGame(g,1).cardCatalog.hero_neos);
 assert.ok(!legalActions(g,0).some(a=>a.cardUid===spell.uid));}
 const g=blank();put(g,0,'hand','emergency_call');put(g,0,'deck','cyber_dragon');assert.ok(!legalActions(g,0).some(a=>a.kind==='activate'));
});
test('Cyber Dragon special summons face-up without tribute or normal use; drag and voice choose this route',()=>{
 const g=blank(),c=put(g,0,'hand','cyber_dragon');assert.ok(!legalActions(g,0).some(a=>a.kind==='specialSummon'));put(g,1,'field','celtic_guardian');put(g,1,'spells','trap_hole',0,{faceUp:false});
 const v=projectGame(g,0),drag=automaticPlayActions(v,c.uid,'defense'),voice=planVoiceSummon(v,CARDS,{uid:c.uid,position:'defense'});assert.ok(drag.every(a=>a.kind==='specialSummon'));assert.equal(voice.actions[0].kind,'specialSummon');act(g,0,'specialSummon',{position:'defense'});assert.equal(c.faceUp,true);assert.equal(g.players[0].normalUsed,false);assert.ok(!legalActions(g,1).some(a=>a.kind==='activate'));resolve(g);put(g,0,'hand','cyber_dragon');assert.ok(!legalActions(g,0).some(a=>a.kind==='specialSummon'));
 g.players[0].field.fill(null);g.players[0].normalUsed=true;assert.ok(legalActions(g,0).some(a=>a.kind==='specialSummon'));
});
test('Cyber Twin attacks twice, cannot change position after first attack, and resets next own turn',()=>{
 const g=blank(),c=put(g,0,'field','cyber_twin_dragon');put(g,0,'deck','kuriboh');put(g,1,'deck','kuriboh');g.phase='battle';act(g,0,'attack');resolve(g);assert.equal(g.players[1].lp,5200);assert.equal(c.attackCount,1);assert.equal(c.attacked,false);
 g.phase='main2';assert.ok(!legalActions(g,0).some(a=>a.kind==='position'));g.phase='battle';act(g,0,'attack');resolve(g);assert.equal(g.players[1].lp,2400);assert.equal(c.attackCount,2);assert.ok(!legalActions(g,0).some(a=>a.kind==='attack'));act(g,0,'phase');act(g,0,'phase');act(g,1,'phase',{phase:'end'});assert.equal(c.attackCount,0);act(g,0,'phase',{phase:'battle'});assert.ok(legalActions(g,0).some(a=>a.kind==='attack'));
});
test('Cyber Twin cancelled attacks consume one attack and replay refunds only the interrupted attempt',()=>{
 const g=blank(),c=put(g,0,'field','cyber_twin_dragon');put(g,1,'spells','magic_cylinder',0,{faceUp:false});g.phase='battle';act(g,0,'attack');act(g,1,'activate');resolve(g);assert.equal(c.attackCount,1);assert.equal(g.players[0].lp,5200);
 const t=put(g,1,'field','kuriboh');act(g,0,'attack');g.players[1].field[0]=null;g.players[1].grave.push(t);resolve(g);assert.equal(c.attackCount,1);act(g,0,'attack');resolve(g);assert.equal(c.attackCount,2);assert.ok(!legalActions(g,0).some(a=>a.kind==='attack'));
});
test('Cyber End and Bladedge pierce defense with truthful public damage previews',()=>{
 for(const [id,damage] of [['cyber_end_dragon',2000],['hero_bladedge',600],['cyber_twin_dragon',0]]){const g=blank();put(g,0,'field',id);const target=put(g,1,'field','mystical_elf',0,{position:'defense'});g.phase='battle';const a=legalActions(g,0).find(a=>a.kind==='attack');const preview=attackPreview(projectGame(g,0),a,CARDS);assert.match(preview.text,damage?/贯穿 ·/:/无贯穿/);applyAction(g,0,a);resolve(g);assert.equal(g.players[1].lp,8000-damage);assert.ok(g.players[1].grave.some(c=>c.uid===target.uid));}
});
test('Flame Wingman uses destroyed monster grave ATK for separate effect damage even after Kuriboh',()=>{
 const g=blank();put(g,0,'field','hero_flame_wingman');put(g,1,'field','celtic_guardian',0,{bonus:500});put(g,1,'hand','kuriboh');g.phase='battle';act(g,0,'attack');applyAction(g,1,{kind:'pass'});applyAction(g,0,{kind:'pass'});assert.equal(g.pending.kind,'damage');act(g,1,'kuriboh');assert.equal(g.players[1].lp,8000);assert.equal(g.pending.chain[0].damageAmount,1400);assert.equal(g.pending.chain[0].source,'trigger');assert.ok(!legalActions(g,1).some(a=>a.kind==='kuriboh'));resolve(g);assert.equal(g.players[1].lp,6600);
});
test('defending Flame Wingman also triggers when it destroys the attacking monster',()=>{
 const g=blank();put(g,0,'field','battle_ox');put(g,1,'field','hero_flame_wingman');g.phase='battle';act(g,0,'attack');resolve(g);assert.equal(g.players[0].lp,5900);assert.equal(g.players[1].lp,8000);
});
test('fusion-only HERO bosses cannot be revived, while properly summoned Cyber bosses can',()=>{
 const g=blank();put(g,0,'hand','monster_reborn');const a=put(g,0,'grave','hero_flame_wingman',0,{properSummoned:true}),b=put(g,0,'grave','hero_thunder_giant',0,{properSummoned:true}),c=put(g,1,'grave','cyber_twin_dragon',0,{properSummoned:true});put(g,0,'grave','cyber_end_dragon');const moves=legalActions(g,0).filter(a=>a.kind==='activate');assert.ok(moves.length&&moves.every(a=>a.targetUid===c.uid));assert.ok(!moves.some(x=>[a.uid,b.uid].includes(x.targetUid)));
});
test('Thunder Giant requires a chosen discard and face-up original-ATK target; cost is immediate and once per turn',()=>{
 const g=blank(),giant=put(g,0,'field','hero_thunder_giant'),cost=put(g,0,'hand','kuriboh');put(g,0,'hand','mst');const target=put(g,1,'field','hero_sparkman',0,{bonus:1200}),equal=put(g,1,'field','summoned_skull',1),hidden=put(g,1,'field','hero_avian',2,{faceUp:false});const moves=legalActions(g,0).filter(a=>a.kind==='activate'&&a.source==='field');assert.ok(moves.every(a=>a.targetUid!==equal.uid&&a.targetUid!==hidden.uid));assert.ok(moves.some(a=>a.targetUid===target.uid));assert.equal(actionChoices(moves,{}).action,null);assert.equal(actionChoices(moves,{discardUid:j(cost.uid)}).action,null);
 const chosen=actionChoices(moves,{discardUid:j(cost.uid),targetUid:j(target.uid)}).action;assert.ok(chosen);applyAction(g,0,chosen);assert.ok(g.players[0].grave.some(c=>c.uid===cost.uid));assert.equal(giant.effectUsedTurn,g.turn);assert.ok(g.players[1].field[0]);resolve(g);assert.ok(!g.players[1].field[0]);assert.ok(g.players[0].field[0]);assert.ok(!legalActions(g,0).some(a=>a.cardUid===giant.uid&&a.kind==='activate'));g.turn+=2;put(g,1,'field','hero_sparkman');assert.ok(legalActions(g,0).some(a=>a.cardUid===giant.uid&&a.kind==='activate'));
});
test('Miracle Fusion uses own grave and field, banishes public materials and preserves normal summon',()=>{
 const {g,spell,a,b,boss}=miracle();const hand=put(g,0,'hand','hero_avian'),enemy=put(g,1,'grave','hero_burstinatrix');const moves=automaticPlayActions(projectGame(g,0),spell.uid);assert.ok(moves.length);assert.ok(moves.every(x=>!x.materialUids.includes(hand.uid)&&!x.materialUids.includes(enemy.uid)));assert.equal(actionChoices(moves,{},true).action,null);
 act(g,0,'activate',{fusionId:boss.id,zone:2,position:'defense'});resolve(g);assert.equal(g.players[0].field[2].uid,boss.uid);assert.equal(boss.faceUp,true);assert.equal(g.players[0].normalUsed,false);assert.deepEqual(g.players[0].banished.map(c=>c.uid).sort(),[a.uid,b.uid].sort());assert.deepEqual(g.players[0].grave.map(c=>c.id),['miracle_fusion']);assert.equal(projectGame(g,1).players[0].banished.length,2);assert.equal(findVisibleCard(projectGame(g,0),a.uid).area,'banished');put(g,0,'hand','monster_reborn');assert.ok(!legalActions(g,0).some(x=>x.targetUid===a.uid||x.targetUid===b.uid));
});
test('Miracle Fusion excludes Cyber recipes, duplicate UIDs and atomically revalidates all materials',()=>{
 const {g,a,b}=miracle();put(g,0,'extraDeck','cyber_twin_dragon');put(g,0,'grave','cyber_dragon');put(g,0,'grave','cyber_dragon');const move=legalActions(g,0).find(a=>a.fusionId);assert.ok(!legalActions(g,0).some(a=>a.fusionId==='cyber_twin_dragon'));const before=j(g);assert.throws(()=>applyAction(g,0,{...move,materialUids:[a.uid,a.uid]}));assert.equal(j(g),before);
 applyAction(g,0,move);g.players[0].grave=g.players[0].grave.filter(c=>c.uid!==a.uid);g.players[0].hand.push(a);resolve(g);assert.equal(g.players[0].banished.length,0);assert.equal(g.players[0].field[2].uid,b.uid);assert.ok(g.players[0].extraDeck.some(c=>c.id==='hero_flame_wingman'));
});
test('Cyber fusion recipes require two or three distinct Cyber Dragon instances',()=>{
 const g=blank();put(g,0,'hand','polymerization');put(g,0,'hand','cyber_dragon');put(g,0,'extraDeck','cyber_twin_dragon');put(g,0,'extraDeck','cyber_end_dragon');assert.ok(!legalActions(g,0).some(a=>a.fusionId));put(g,0,'hand','cyber_dragon');assert.ok(legalActions(g,0).some(a=>a.fusionId==='cyber_twin_dragon'));assert.ok(!legalActions(g,0).some(a=>a.fusionId==='cyber_end_dragon'));put(g,0,'field','cyber_dragon');const a=act(g,0,'activate',{fusionId:'cyber_end_dragon',zone:0,position:'attack'});assert.equal(new Set(a.materialUids).size,3);resolve(g);assert.equal(g.players[0].field[0].id,'cyber_end_dragon');
});
test('Oversoul revives only own normal HERO monsters with a deliberate target',()=>{
 const g=blank(),s=put(g,0,'hand','oversoul'),hero=put(g,0,'grave','hero_neos');put(g,0,'grave','hero_bladedge');put(g,0,'grave','celtic_guardian');put(g,1,'grave','hero_avian');const moves=automaticPlayActions(projectGame(g,0),s.uid);assert.ok(moves.length&&moves.every(a=>a.targetUid===hero.uid));assert.equal(actionChoices(moves,{},true).action,null);act(g,0,'activate',{targetUid:hero.uid,position:'defense'});resolve(g);assert.equal(g.players[0].field[0].uid,hero.uid);assert.equal(g.players[0].field[0].faceUp,true);
});
test('GX lessons and Cyber Twin challenge have executable victory paths',()=>{
 for(const scenario of ['T06','T07']){const g=createGame({scenario});act(g,0,'activate',{position:'attack'});resolve(g);assert.equal(g.result?.winner,0);assert.equal(g.players[0].normalUsed,false);assert.equal(g.players[0].banished.length,scenario==='T07'?2:0);}
 const g=createGame({scenario:'C05'});act(g,0,'attack');resolve(g);assert.equal(g.result,null);act(g,0,'attack');resolve(g);assert.equal(g.result?.winner,0);
});
test('GX era filtering respects ownership and recipe checks count repeated materials and supporting spells',()=>{
 const filter={area:'main',era:'GX',kind:'all',query:''},available=workshopCards({},CARDS,filter);assert.ok(available.length&&available.every(c=>c.era==='GX'&&!c.hiddenPool));assert.ok(!available.some(c=>c.id==='fusion_sage'));assert.ok(workshopCards({},CARDS,{...filter,era:'DM'}).some(c=>c.id==='fusion_sage'));
 const p={collection:{hero_thunder_giant:1}};assert.ok(workshopCards(p,CARDS,{...filter,area:'extra'}).some(c=>c.id==='hero_thunder_giant'));
 let routes=fusionReadiness({main:['cyber_dragon','polymerization'],extra:['cyber_twin_dragon','cyber_twin_dragon','cyber_end_dragon']},CARDS);assert.equal(routes.length,2);assert.deepEqual(routes.map(r=>r.materials[0].missing),[1,2]);assert.ok(routes.every(r=>!r.ready));
 routes=fusionReadiness({main:['hero_avian','hero_burstinatrix','miracle_fusion'],extra:['hero_flame_wingman']},CARDS);assert.equal(routes[0].ready,true);assert.equal(fusionReadiness({main:['cyber_dragon','cyber_dragon','miracle_fusion'],extra:['cyber_twin_dragon']},CARDS)[0].spellReady,false);
});
test('AI uses GX actions without reading enemy hidden hands, grave materials remain usable',()=>{
 const {g}=miracle();const first=chooseAi(g,0,'hard');assert.equal(first.fusionId,'hero_flame_wingman');put(g,1,'hand','cyber_end_dragon');put(g,1,'extraDeck','hero_thunder_giant');assert.deepEqual(chooseAi(g,0,'hard'),first);applyAction(g,0,first);resolve(g);
 const cyber=blank();put(cyber,0,'hand','cyber_dragon');put(cyber,1,'field','hero_sparkman');assert.equal(chooseAi(cyber,0,'hard').kind,'specialSummon');
});
