import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {CARDS,DECKS,createGame,instance,legalActions,applyAction,projectGame,chooseAi} from './engine.mjs';
import {owned,validateCustom,validateExtra,POOL,collectionView} from './gacha.mjs';
import {actionsAtDrop,dropNeedsChoice} from '../src/cardDrop.ts';import {planVoiceSummon} from '../src/voiceModel.ts';
const base=()=>DECKS[0].cards.flatMap(c=>Array(c.count).fill(c.card_id));
function blank(){const g=createGame();g.turn=3;for(const p of g.players){p.hand=[];p.grave=[];p.field.fill(null);p.spells.fill(null);p.extraDeck=[];}return g;}
function put(g,p,area,id,zone=0,props={}){const c={...instance(id),owner:p,summonedTurn:1,placedTurn:1,...props};if(['field','spells'].includes(area))g.players[p][area][zone]=c;else g.players[p][area].push(c);return c;}
function resolve(g){for(let i=0;i<20&&g.window;i++)applyAction(g,g.window.responder,{kind:'pass'});assert.ok(!g.window);}
function play(g,extra={}){const a=legalActions(g,0).find(a=>a.kind==='activate'&&Object.entries(extra).every(([k,v])=>JSON.stringify(a[k])===JSON.stringify(v)));assert.ok(a,JSON.stringify(extra));applyAction(g,0,a);return a;}
function fusion(){const g=blank();const spell=put(g,0,'hand','polymerization');put(g,0,'hand','gaia');put(g,0,'field','curse_of_dragon',2,{faceUp:false,position:'defense'});const boss=put(g,0,'extraDeck','gaia_dragon_champion');return {g,spell,boss};}
function ritual(){const g=blank(),spell=put(g,0,'hand','black_luster_ritual'),boss=put(g,0,'hand','black_luster_soldier');put(g,0,'hand','celtic_guardian');put(g,0,'field','mystical_elf',2);return {g,spell,boss};}
test('DM update has real card assets, supported recipes, six legal presets and a DM-only draw pool',()=>{
 assert.equal(Object.keys(CARDS).length,46);assert.equal(POOL.length,15);assert.ok(POOL.every(c=>c.era==='DM'));assert.equal(DECKS.length,6);
 for(const c of Object.values(CARDS)){for(const file of [c.art,c.face]){const bytes=readFileSync(new URL('../public'+file,import.meta.url));assert.equal(bytes[0],255,c.id);assert.equal(bytes[1],216,c.id);}if(c.summonType==='fusion')assert.ok(c.materials.every(id=>CARDS[id]));}
 for(const d of DECKS){const p={};assert.equal(validateCustom(p,d.cards.flatMap(c=>Array(c.count).fill(c.card_id))).length,40);assert.deepEqual(validateExtra(p,d.extra||[]),d.extra||[]);}
 const old={collection:{alexandrite_dragon:2}};assert.equal(owned(old,'alexandrite_dragon'),2);assert.equal(collectionView(old).legacyOwned,1);assert.equal(collectionView(old).poolOwned,0);
});
test('fusion uses controller hand and own set field materials, frees their zone and preserves normal summon',()=>{
 const {g,boss}=fusion();for(const [i,id] of ['battle_ox','mystical_elf','kuriboh','celtic_guardian'].entries())put(g,0,'field',id,[0,1,3,4][i]);
 put(g,1,'spells','trap_hole',0,{faceUp:false});const a=play(g,{zone:2,position:'defense',fusionId:boss.id});assert.equal(a.materialUids.length,2);assert.ok(!legalActions(g,1).some(a=>a.kind==='activate'));resolve(g);
 assert.equal(g.players[0].field[2].uid,boss.uid);assert.equal(boss.faceUp,true);assert.equal(boss.position,'defense');assert.equal(boss.properSummoned,true);assert.equal(g.players[0].normalUsed,false);assert.equal(g.players[0].extraDeck.length,0);assert.deepEqual(g.players[0].grave.map(c=>c.id).sort(),['curse_of_dragon','gaia','polymerization']);
});
test('fusion requires named distinct materials and an owned Extra Deck monster; forged recipes do not mutate',()=>{
 const {g}=fusion();g.players[0].hand.find(c=>c.id==='gaia').id='celtic_guardian';assert.ok(!legalActions(g,0).some(a=>a.fusionId));
 g.players[0].hand.find(c=>c.id==='celtic_guardian').id='gaia';const a=legalActions(g,0).find(a=>a.fusionId);const before=JSON.stringify(g);assert.throws(()=>applyAction(g,0,{...a,materialUids:[a.materialUids[0],a.materialUids[0]]}));assert.equal(JSON.stringify(g),before);g.players[0].extraDeck=[];assert.ok(!legalActions(g,0).some(a=>a.fusionId));
});
test('chain revalidation consumes no partial materials if a selected material disappears',()=>{
 const {g}=fusion();const a=play(g,{position:'attack'});const material=g.players[0].hand.find(c=>c.uid===a.materialUids[0]);g.players[0].hand=g.players[0].hand.filter(c=>c!==material);g.players[0].grave.push(material);resolve(g);
 assert.equal(g.players[0].extraDeck.length,1);assert.equal(g.players[0].field[2].id,'curse_of_dragon');assert.equal(g.players[0].grave.filter(c=>c.id==='curse_of_dragon').length,0);assert.ok(g.players[0].grave.some(c=>c.id==='polymerization'));
});
test('destroying Polymerization with chained MST does not negate its fusion effect',()=>{
 const {g,spell,boss}=fusion();put(g,1,'spells','mst',0,{faceUp:false});play(g,{position:'attack'});const mst=legalActions(g,1).find(a=>a.targetUid===spell.uid);assert.ok(mst);applyAction(g,1,mst);resolve(g);assert.ok(g.players[0].field.some(c=>c?.uid===boss.uid));
});
test('ritual uses designated monster in hand and level-total tributes, never normal summons or sets the ritual monster',()=>{
 const {g,boss}=ritual();assert.ok(!legalActions(g,0).some(a=>a.kind==='summon'&&a.cardUid===boss.uid));const a=play(g,{zone:2,position:'defense',ritualUid:boss.uid});assert.equal(a.tributes.length,2);assert.ok(!a.tributes.includes(boss.uid));resolve(g);assert.equal(g.players[0].field[2].uid,boss.uid);assert.equal(boss.faceUp,true);assert.equal(boss.properSummoned,true);assert.equal(g.players[0].normalUsed,false);
});
test('ritual rejects insufficient levels, wrong spell and unnecessary excess tributes; one high-level tribute is legal',()=>{
 const {g,boss}=ritual();g.players[0].field[2].id='giant_soldier';assert.ok(!legalActions(g,0).some(a=>a.ritualUid));put(g,0,'hand','blue_eyes');put(g,0,'hand','kuriboh');const acts=legalActions(g,0).filter(a=>a.ritualUid);assert.ok(acts.some(a=>a.tributes.length===1));assert.ok(!acts.some(a=>a.tributes.some(uid=>g.players[0].hand.find(c=>c.uid===uid)?.id==='blue_eyes')&&a.tributes.length>1));g.players[0].hand.find(c=>c.id==='black_luster_ritual').id='black_magic_ritual';assert.ok(!legalActions(g,0).some(a=>a.ritualUid===boss.uid));
});
test('a fusion or ritual monster can only be revived after proper summoning; ownership stays with its original owner',()=>{
 const g=blank();const raw=put(g,1,'grave','black_luster_soldier');const proper=put(g,1,'grave','b_skull_dragon',0,{properSummoned:true});put(g,0,'hand','monster_reborn');assert.ok(!legalActions(g,0).some(a=>a.targetUid===raw.uid));play(g,{targetUid:proper.uid,position:'attack'});resolve(g);assert.equal(g.players[0].field[0].uid,proper.uid);assert.equal(proper.owner,1);
});
test('opponent Extra Deck reveals count only, never instance ids or hidden acquired card definitions',()=>{
 const g=blank(),secret=put(g,1,'extraDeck','meteor_black_dragon');const v=projectGame(g,0);assert.equal(v.players[1].extraCount,1);assert.deepEqual(v.players[1].extraDeck,[]);assert.equal(v.cardCatalog.meteor_black_dragon,undefined);assert.ok(!JSON.stringify(v).includes(secret.uid));assert.equal(projectGame(g,1).cardCatalog.meteor_black_dragon.id,secret.id);
});
test('deck validators separate Main and Extra, enforce owned copies and retain legacy cards',()=>{
 const p={collection:{meteor_black_dragon:1,alexandrite_dragon:1}},list=base();list[0]='alexandrite_dragon';assert.deepEqual(validateCustom(p,list),list);list[0]='b_skull_dragon';assert.throws(()=>validateCustom(p,list),/额外/);assert.deepEqual(validateExtra(p,['meteor_black_dragon']),['meteor_black_dragon']);assert.throws(()=>validateExtra(p,['meteor_black_dragon','meteor_black_dragon']));assert.throws(()=>validateExtra(p,['black_luster_soldier']));assert.throws(()=>validateExtra(p,Array(16).fill('b_skull_dragon')));
});
test('both new tutorials have executable fusion and ritual win paths',()=>{
 for(const scenario of ['T04','T05']){const g=createGame({scenario});play(g,{position:'attack'});resolve(g);assert.equal(g.result?.winner,0,scenario);assert.equal(g.players[0].normalUsed,false);}
});
test('drag and voice use legal special-spell actions and still require deliberate material confirmation',()=>{
 for(const fixture of [fusion,ritual]){const {g,spell,boss}=fixture(),v=projectGame(g,0),site={type:'zone',player:0,area:'field',zone:2};const acts=actionsAtDrop(v,spell.uid,site);assert.ok(acts.length);assert.equal(dropNeedsChoice(acts,site),true);const plan=planVoiceSummon(v,CARDS,{uid:boss.uid});assert.ok(!plan.error,plan.error);assert.equal(plan.uid,spell.uid);assert.equal(plan.needsChoice,true);assert.ok(v.legal.some(a=>JSON.stringify(a)===JSON.stringify(plan.actions[0])));assert.equal(g.players[0].grave.length,0);}
});
test('AI can use both mechanics and its decision cannot inspect opponent hand or Extra Deck',()=>{
 for(const fixture of [fusion,ritual]){const {g}=fixture();const first=chooseAi(g,0,'hard');assert.equal(first.kind,'activate');assert.ok(first.fusionId||first.ritualUid);put(g,1,'hand','blue_eyes');put(g,1,'extraDeck','meteor_black_dragon');assert.deepEqual(chooseAi(g,0,'hard'),first);}
});
