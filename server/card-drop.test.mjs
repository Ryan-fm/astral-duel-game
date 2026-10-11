import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,projectGame,instance,applyAction,autoPass} from './engine.mjs';
import {handPlayActions,cardDropSites,actionsAtDrop,dropNeedsChoice,dragStillCurrent,automaticPlayActions,automaticPreviewSite,isPulledIntoPlay} from '../src/cardDrop.ts';

function fixture(id){const g=createGame();g.turn=3;g.active=0;g.phase='main1';g.players.forEach(p=>{p.field.fill(null);p.spells.fill(null);p.hand=[];p.grave=[];p.normalUsed=false;});const c=instance(id);g.players[0].hand=[c];return {g,c};}
const zone=(area,index=0,player=0,uid)=>({type:'zone',player,area,zone:index,uid});

test('dropping a low-level hand monster submits an existing legal summon at the chosen slot',()=>{
 const {g,c}=fixture('celtic_guardian'),view=projectGame(g,0),site=zone('field',3),options=actionsAtDrop(view,c.uid,site);
 assert.equal(options.length,1);assert.equal(options[0].zone,3);assert.equal(dropNeedsChoice(options,site),false);
 assert.ok(view.legal.some(a=>JSON.stringify(a)===JSON.stringify(options[0])));
 applyAction(g,0,options[0]);autoPass(g);assert.equal(g.players[0].field[3].uid,c.uid);assert.equal(g.players[0].hand.length,0);
});
test('defense drag keeps the same rules and produces a face-down defense summon',()=>{
 const {g,c}=fixture('giant_soldier'),site=zone('field',2),options=actionsAtDrop(projectGame(g,0),c.uid,site,'defense');
 assert.equal(options[0].position,'defense');applyAction(g,0,options[0]);autoPass(g);assert.equal(g.players[0].field[2].faceUp,false);assert.equal(g.players[0].field[2].position,'defense');
});
test('wrong rows, enemy zones, occupied low-star zones and outside releases cannot summon',()=>{
 const {g,c}=fixture('celtic_guardian');g.players[0].field[0]=instance('mystical_elf');const view=projectGame(g,0);
 for(const site of [null,zone('spells'),zone('field',1,1),zone('field'),zone('field',7)])assert.deepEqual(actionsAtDrop(view,c.uid,site),[]);
 assert.equal(g.players[0].hand.length,1);assert.equal(g.players[0].normalUsed,false);
});
test('traps set only in an empty friendly back row and never activate from a drag',()=>{
 const {g,c}=fixture('mirror_force'),view=projectGame(g,0);
 assert.deepEqual(actionsAtDrop(view,c.uid,zone('field')),[]);assert.deepEqual(actionsAtDrop(view,c.uid,zone('spells',0,1)),[]);assert.deepEqual(actionsAtDrop(view,c.uid,{type:'activate'}),[]);
 const options=actionsAtDrop(view,c.uid,zone('spells',4));assert.equal(dropNeedsChoice(options,zone('spells',4)),false);applyAction(g,0,options[0]);assert.equal(g.players[0].spells[4].uid,c.uid);assert.equal(g.players[0].spells[4].faceUp,false);
});
test('spell drop distinguishes setting in the back row from activation',()=>{
 const {g,c}=fixture('fissure');g.players[1].field[0]={...instance('battle_ox'),faceUp:true};const view=projectGame(g,0);
 assert.equal(actionsAtDrop(view,c.uid,zone('spells'))[0].kind,'set');const options=actionsAtDrop(view,c.uid,{type:'activate'});assert.equal(options[0].kind,'activate');assert.equal(dropNeedsChoice(options,{type:'activate'}),false);
});
test('direct targeted spell drop chooses the touched public target, not the first legal target',()=>{
 const {g,c}=fixture('rush_recklessly');g.players[0].field[0]={...instance('celtic_guardian'),faceUp:true};g.players[1].field[1]={...instance('battle_ox'),faceUp:true};const view=projectGame(g,0),uid=g.players[1].field[1].uid,site=zone('field',1,1,uid);
 const options=actionsAtDrop(view,c.uid,site);assert.equal(options.length,1);assert.equal(options[0].targetUid,uid);assert.equal(dropNeedsChoice(options,site),false);
 const unresolved=actionsAtDrop(view,c.uid,{type:'activate'});assert.equal(unresolved.length,2);assert.equal(dropNeedsChoice(unresolved,{type:'activate'}),true);
});
test('dropping a tribute monster requires deliberate sacrifice confirmation, including a full board',()=>{
 const {g,c}=fixture('summoned_skull');g.players[0].field=g.players[0].field.map(()=>instance('mystical_elf'));const view=projectGame(g,0),site=zone('field',2),options=actionsAtDrop(view,c.uid,site);
 assert.equal(options.length,1);assert.deepEqual(options[0].tributes,[g.players[0].field[2].uid]);assert.equal(dropNeedsChoice(options,site),true);assert.equal(g.players[0].grave.length,0);
});
test('two-tribute choices retain the dragged zone and stay legal until explicit confirmation',()=>{
 const {g,c}=fixture('dark_magician');g.players[0].field[0]=instance('mystical_elf');g.players[0].field[1]=instance('giant_soldier');g.players[0].field[2]=instance('celtic_guardian');const view=projectGame(g,0),site=zone('field',4),options=actionsAtDrop(view,c.uid,site);
 assert.equal(options.length,3);assert.ok(options.every(a=>a.zone===4&&a.tributes.length===2));assert.equal(dropNeedsChoice(options,site),true);assert.equal(g.players[0].hand.length,1);
});
test('revival drop locks the summoned monster slot but leaves graveyard target as a choice',()=>{
 const {g,c}=fixture('monster_reborn');g.players[0].grave=[instance('summoned_skull'),instance('giant_soldier')];const view=projectGame(g,0),site=zone('field',3),options=actionsAtDrop(view,c.uid,site);
 assert.equal(options.length,2);assert.ok(options.every(a=>a.zone===3&&a.position==='attack'));assert.equal(dropNeedsChoice(options,site),true);
 applyAction(g,0,options[1]);autoPass(g);assert.equal(g.players[0].field[3].id,'giant_soldier');
});
test('drag sites contain only legal zones/visible targets and do not reveal face-down definitions',()=>{
 const {g,c}=fixture('mst');g.players[1].spells[2]={...instance('mirror_force'),faceUp:false};const view=projectGame(g,0),sites=cardDropSites(view,c.uid);
 const enemy=sites.find(s=>s.type==='zone'&&s.player===1);assert.equal(enemy.uid,g.players[1].spells[2].uid);assert.equal(view.players[1].spells[2].id,undefined);assert.deepEqual(Object.keys(enemy).sort(),['area','player','type','uid','zone']);
});
test('paused, completed, stale, changed-game and non-hand drags are invalidated',()=>{
 const {g,c}=fixture('celtic_guardian'),view=projectGame(g,0),snapshot={id:view.id,version:view.version};assert.equal(dragStillCurrent(view,snapshot),true);
 for(const changed of [{...view,version:view.version+1},{...view,id:'other'},{...view,paused:true},{...view,result:{winner:1}}])assert.equal(dragStillCurrent(changed,snapshot),false);
 assert.deepEqual(handPlayActions({...view,paused:true},c.uid),[]);assert.deepEqual(handPlayActions({...view,result:{}},c.uid),[]);assert.deepEqual(handPlayActions(view,'not-in-hand'),[]);
});

test('pull-to-play auto-selects an empty server-legal slot without a precise zone hit',()=>{
 const {g,c}=fixture('celtic_guardian');g.players[0].field[0]=instance('mystical_elf');const v=projectGame(g,0),site={type:'play'},actions=actionsAtDrop(v,c.uid,site);
 assert.equal(actions.length,1);assert.equal(actions[0].zone,1);assert.equal(dropNeedsChoice(actions,site),false);
 assert.deepEqual(automaticPreviewSite(v,actions),{type:'zone',player:0,area:'field',zone:1});
 applyAction(g,0,actions[0]);autoPass(g);assert.equal(g.players[0].field[1].uid,c.uid);
});
test('automatic placement preserves defense and occupied-board legality',()=>{
 const {g,c}=fixture('giant_soldier');g.players[0].field.fill(instance('mystical_elf'));
 assert.deepEqual(automaticPlayActions(projectGame(g,0),c.uid),[]);g.players[0].field[4]=null;
 const a=automaticPlayActions(projectGame(g,0),c.uid,'defense')[0];assert.equal(a.zone,4);assert.equal(a.position,'defense');
 applyAction(g,0,a);autoPass(g);assert.equal(g.players[0].field[4].faceUp,false);
});
test('ordinary spell pull activates without a side-panel drop, and explicit set intent is preserved',()=>{
 const {g,c}=fixture('fissure');g.players[1].field[0]={...instance('battle_ox'),faceUp:true};const v=projectGame(g,0);
 const play=actionsAtDrop(v,c.uid,{type:'play'}),set=actionsAtDrop(v,c.uid,{type:'play',intent:'set'});
 assert.equal(play.length,1);assert.equal(play[0].kind,'activate');assert.equal(set.length,1);assert.equal(set[0].kind,'set');assert.equal(set[0].zone,0);
 assert.equal(dropNeedsChoice(play,{type:'play'}),false);applyAction(g,0,play[0]);autoPass(g);assert.equal(g.players[1].field[0],null);
});
test('trap pull automatically sets, unavailable spells can set, and a full back row rejects both',()=>{
 for(const id of ['mirror_force','fissure']){const {g,c}=fixture(id);g.players[0].spells[0]=instance('trap_hole');
  const a=automaticPlayActions(projectGame(g,0),c.uid)[0];assert.equal(a.kind,'set');assert.equal(a.zone,1);
  g.players[0].spells.fill(instance('trap_hole'));assert.deepEqual(automaticPlayActions(projectGame(g,0),c.uid),[]);
 }
});
test('automatic tribute placement preserves EVERY sacrifice choice on a full board',()=>{
 const {g,c}=fixture('dark_magician');g.players[0].field=g.players[0].field.map(()=>instance('mystical_elf'));const v=projectGame(g,0),site={type:'play'},options=actionsAtDrop(v,c.uid,site);
 assert.equal(options.length,10);assert.equal(dropNeedsChoice(options,site),true);
 assert.equal(automaticPreviewSite(v,options),null);
 const allChoices=new Set(v.legal.filter(a=>a.cardUid===c.uid&&a.position==='attack').map(a=>JSON.stringify(a.tributes)));
 assert.deepEqual(new Set(options.map(a=>JSON.stringify(a.tributes))),allChoices);assert.equal(g.players[0].grave.length,0);
 for(const a of options){assert.ok(a.tributes.includes(g.players[0].field[a.zone].uid));assert.ok(v.legal.includes(a));}
 applyAction(g,0,options.at(-1));autoPass(g);assert.equal(g.players[0].grave.length,2);assert.ok(g.players[0].field.some(x=>x?.uid===c.uid));
});
test('tribute auto-placement prefers empty ground instead of hiding other sacrifice combinations',()=>{
 const {g,c}=fixture('summoned_skull');g.players[0].field[0]=instance('mystical_elf');g.players[0].field[3]=instance('giant_soldier');const options=automaticPlayActions(projectGame(g,0),c.uid);
 assert.equal(options.length,2);assert.ok(options.every(a=>a.zone===1));assert.deepEqual(new Set(options.flatMap(a=>a.tributes)),new Set(g.players[0].field.filter(Boolean).map(c=>c.uid)));
});
test('generic targeted spell pull never silently chooses a target; direct target drops still work',()=>{
 const {g,c}=fixture('rush_recklessly');g.players[0].field[0]={...instance('celtic_guardian'),faceUp:true};g.players[1].field[2]={...instance('battle_ox'),faceUp:true};const v=projectGame(g,0),site={type:'play'},options=actionsAtDrop(v,c.uid,site);
 assert.equal(options.length,2);assert.equal(dropNeedsChoice(options,site),true);assert.equal(g.players[0].hand.length,1);
 const exact=zone('field',2,1,g.players[1].field[2].uid),direct=actionsAtDrop(v,c.uid,exact);assert.equal(direct.length,1);assert.equal(dropNeedsChoice(direct,exact),false);
});
test('revival auto-placement keeps all public graveyard choices and collapses only slots',()=>{
 const {g,c}=fixture('monster_reborn');g.players[0].grave=[instance('giant_soldier')];g.players[1].grave=[instance('summoned_skull')];g.players[0].field[0]=instance('kuriboh');const v=projectGame(g,0),options=automaticPlayActions(v,c.uid);
 assert.equal(options.length,2);assert.ok(options.every(a=>a.zone===1&&a.position==='attack'));assert.equal(dropNeedsChoice(options,{type:'play'}),true);assert.deepEqual(new Set(options.map(a=>a.targetUid)),new Set(g.players.flatMap(p=>p.grave.map(c=>c.uid))));
});
test('fusion and ritual auto-placement retain materials and require confirmation',()=>{
 for(const id of ['polymerization','black_luster_ritual']){const {g,c}=fixture(id);
  if(id==='polymerization'){g.players[0].hand.push(instance('gaia'),instance('curse_of_dragon'));g.players[0].extraDeck=[instance('gaia_dragon_champion')];}
  else g.players[0].hand.push(instance('black_luster_soldier'),instance('blue_eyes'),instance('celtic_guardian'),instance('mystical_elf'));
  const v=projectGame(g,0),options=automaticPlayActions(v,c.uid);assert.ok(options.length);assert.ok(options.every(a=>a.kind==='activate'&&a.zone===0));assert.equal(dropNeedsChoice(options,{type:'play'}),true);
  const signatures=actions=>new Set(actions.map(({zone,...choice})=>JSON.stringify(choice)));
  assert.deepEqual(signatures(options),signatures(v.legal.filter(a=>a.cardUid===c.uid&&a.kind==='activate'&&a.position==='attack')));assert.equal(g.players[0].grave.length,0);
 }
});
test('pull gesture accepts empty ground, requires an upward threshold and cancels over hand/HUD/outside',()=>{
 const area={left:120,top:144,right:1024,bottom:512},start={x:460,y:610};
 assert.equal(isPulledIntoPlay({x:630,y:410},start,area,54),true);
 for(const point of [{x:630,y:580},{x:630,y:70},{x:30,y:410},{x:1140,y:410},{x:630,y:610}])assert.equal(isPulledIntoPlay(point,start,area,54),false);
 assert.equal(isPulledIntoPlay({x:460,y:500},{x:460,y:520},area,54),false);
 const phoneArea={left:101,top:86,right:675,bottom:264};assert.equal(isPulledIntoPlay({x:320,y:235},{x:320,y:330},phoneArea,28),true);
});
test('auto-play never creates actions for paused, completed or non-hand cards',()=>{
 const {g,c}=fixture('celtic_guardian'),v=projectGame(g,0);
 for(const changed of [{...v,paused:true},{...v,result:{winner:1}}])assert.deepEqual(automaticPlayActions(changed,c.uid),[]);
 assert.deepEqual(automaticPlayActions(v,'missing'),[]);
});
