import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,projectGame,legalActions,applyAction,autoPass,CARDS,instance,DECKS,chooseAi} from './engine.mjs';
import {attackPreview,unavailableReason,battleGuidance,findVisibleCard,monsterPresentation,duelResultReason} from '../src/battleModel.ts';
import {ACTIVATION_HOLD_MS,emptyActivationFeed,collectActivations,advanceActivation,currentChainCard,restoreActivationFeed} from '../src/activationFeed.ts';
import {fieldMarker,packFieldMarkers,packPileMarkers} from '../src/fieldMarkers.ts';
import {handFanLayout} from '../src/handFan.ts';
const attackingGame=()=>{const g=createGame({scenario:'T02'});g.players[0].field[0].id='blue_eyes';g.players[1].field[0].id='battle_ox';return g;};
test('hand fan keeps complete card proportions, symmetric spread and accessible exposed portions',()=>{
 for(const [width,height] of [[340,144],[506,160],[768,266]])for(const count of [1,5,6,7]){
  const layout=handFanLayout(width,height,count),first=layout.cards[0],last=layout.cards.at(-1);
  assert.ok(Math.abs(layout.cardWidth/layout.cardHeight-813/1185)<.0001);
  assert.ok(Math.abs(first.x+last.x)<.0001);assert.ok(Math.abs(first.angle+last.angle)<.0001);
  assert.ok(first.x-layout.cardWidth/2>=-width/2+18);assert.ok(last.x+layout.cardWidth/2<=width/2-18);
  layout.cards.forEach((card,i)=>{assert.ok(Number.isFinite(card.x));if(i)assert.ok(card.x-layout.cards[i-1].x>=44);});
 }
});
test('oversized hands paginate without shrinking their exposed card targets below 44 pixels',()=>{
 const layout=handFanLayout(340,144,40);
 assert.ok(layout.capacity<40);assert.equal(layout.cards.length,layout.capacity);
 assert.ok(layout.cardWidth>=68);assert.ok(layout.cardHeight>=96);
 assert.equal(handFanLayout(506,160,0).cards.length,0);
});
test('face-down field markers disclose neither kind nor stats even if a private id is supplied',()=>{
 const a=fieldMarker({uid:'a',id:'mirror_force',faceUp:false},false,'spells',2,CARDS);
 const b=fieldMarker({uid:'b',id:'fissure',faceUp:false},false,'spells',2,CARDS);
 assert.deepEqual(a,b);assert.equal(a.kind,'sealed');assert.equal(a.name,'对方盖牌');assert.equal(a.stat,'');assert.equal(a.number,'03');assert.doesNotMatch(a.ariaLabel,/神圣|地割/);
 assert.equal(fieldMarker({uid:'a',id:'mirror_force',faceUp:false},true,'spells',2,CARDS).name,'神圣防护罩');
});
test('public field markers show only the revealed kind and correct combat values',()=>{
 const spell=fieldMarker({uid:'a',id:'fissure',faceUp:true},false,'spells',0,CARDS,true);
 assert.equal(spell.kind,'spell');assert.equal(spell.icon,'bolt');assert.equal(spell.status,'发动中');
 const card={uid:'b',id:'battle_ox',faceUp:true,bonus:700,position:'attack'};
 assert.equal(fieldMarker(card,true,'field',0,CARDS).stat,'ATK 2400');
 assert.equal(fieldMarker({...card,position:'defense'},true,'field',0,CARDS).stat,'DEF 1000');
});
test('perspective-compressed rows retain separate touch targets and stable card ordering',()=>{
 for(const viewport of [568,667,844,1280])for(const width of [44,76]){
  const input=Array.from({length:5},(_,i)=>({id:String(i),x:viewport-170+i*25,width})),packed=packFieldMarkers(input,viewport);
  for(let i=0;i<5;i++){const x=packed.get(String(i));assert.ok(x-width/2>=8);assert.ok(x+width/2<=viewport-8);if(i)assert.ok(x-packed.get(String(i-1))>=width+5);}
 }
 const spaced=[{id:'a',x:50,width:44},{id:'b',x:120,width:44}];assert.deepEqual([...packFieldMarkers(spaced,400)],[['a',50],['b',120]]);
});
test('attack preview matches authoritative LP damage after an unopposed attack',()=>{
 const game=attackingGame(),view=projectGame(game,0),action=view.legal.find(a=>a.kind==='attack');
 const preview=attackPreview(view,action,CARDS);assert.match(preview.text,/1300/);
 applyAction(game,0,action);autoPass(game);assert.equal(game.players[1].lp,6700);
});
test('face-down targets never reveal statistics in a preview, even with a full catalog',()=>{
 const game=attackingGame();game.players[1].field[0].faceUp=false;game.players[1].field[0].position='defense';
 const view=projectGame(game,0),action=view.legal.find(a=>a.kind==='attack'),target=findVisibleCard(view,action.targetUid);
 assert.equal(target.card.id,undefined);const preview=attackPreview(view,action,CARDS);assert.equal(preview.tone,'unknown');assert.match(preview.text,/数值未知/);assert.doesNotMatch(preview.text,/1900|1600/);
});
test('defense victory does not promise piercing damage',()=>{
 const game=attackingGame();game.players[1].field[0].position='defense';const view=projectGame(game,0),a=view.legal.find(a=>a.kind==='attack');
 assert.match(attackPreview(view,a,CARDS).text,/无贯穿伤害/);applyAction(game,0,a);autoPass(game);assert.equal(game.players[1].lp,8000);
});
test('direct attack preview includes current attack bonus',()=>{
 const game=attackingGame();game.players[1].field.fill(null);game.players[0].field[0].bonus=700;const view=projectGame(game,0);
 assert.match(attackPreview(view,view.legal.find(a=>a.kind==='attack'),CARDS).text,/3700/);
});
test('losing attack preview warns about damage to your LP',()=>{
 const game=attackingGame();game.players[1].field[0].id='blue_eyes';game.players[1].field[0].bonus=700;const view=projectGame(game,0);
 const preview=attackPreview(view,view.legal.find(a=>a.kind==='attack'),CARDS);assert.equal(preview.tone,'danger');assert.match(preview.text,/我方 LP −700/);
});
test('unavailable card explains exhausted normal summon and insufficient tributes',()=>{
 const game=createGame();const card=instance('blue_eyes');game.players[0].hand=[card];const view=projectGame(game,0);
 assert.match(unavailableReason(view,card,CARDS),/需要 2 只祭品/);view.players[0].normalUsed=true;assert.match(unavailableReason(view,card,CARDS),/机会已使用/);
});
test('chain guidance distinguishes your response from opponent priority',()=>{
 const game=createGame({scenario:'T03'}),view=projectGame(game,0);assert.match(battleGuidance(view),/响应卡/);
 view.window.responder=1;assert.match(battleGuidance(view),/等待对方/);
});
test('battle guidance counts monsters rather than each possible target',()=>{
 const game=attackingGame();game.players[1].field[1]={...instance('gemini_elf'),owner:1};const view=projectGame(game,0);
 assert.equal(view.legal.filter(a=>a.kind==='attack').length,2);assert.match(battleGuidance(view),/^1 只怪兽/);
});
test('summoning the same card definition twice produces two distinct visual event identities',()=>{
 const game=createGame();const card1=instance('celtic_guardian'),card2=instance('celtic_guardian');game.players[0].hand=[card1,card2];
 applyAction(game,0,legalActions(game,0).find(a=>a.kind==='summon'&&a.cardUid===card1.uid&&a.position==='attack'));autoPass(game);
 game.players[0].normalUsed=false;
 applyAction(game,0,legalActions(game,0).find(a=>a.kind==='summon'&&a.cardUid===card2.uid&&a.position==='attack'));autoPass(game);
 const events=game.events.filter(e=>e.type==='summon');assert.equal(events.length,2);assert.equal(events[0].id,events[1].id);assert.notEqual(events[0].eventId,events[1].eventId);
});
test('seven alternative starter strategies contain no Blue-Eyes and use distinct card distributions',()=>{
 assert.equal(DECKS.length,8);const alternatives=DECKS.filter(d=>d.id!=='blue_eyes_starter');assert.equal(alternatives.length,7);
 for(const d of alternatives)assert.ok(!d.cards.some(c=>c.card_id==='blue_eyes'));
 assert.equal(new Set(DECKS.map(d=>JSON.stringify(d.cards))).size,8);
 const defense=DECKS.find(d=>d.id==='defense_starter');assert.equal(defense.ace_card,'giant_soldier');
});
test('tribute challenge adapts to all four selected strategies rather than requiring Blue-Eyes',()=>{
 const bosses=new Set();for(const d of DECKS){const g=createGame({decks:[d.id,'tempo_starter'],scenario:'C01'});
 const boss=g.players[0].hand[0];bosses.add(boss.id);const a=legalActions(g,0).find(a=>a.cardUid===boss.uid&&a.position==='attack');
 assert.equal(a.tributes.length,CARDS[boss.id].level>=7?2:1);applyAction(g,0,a);autoPass(g);assert.equal(g.result.winner,0);}
 assert.ok(bosses.has('summoned_skull'));assert.ok(bosses.has('dark_magician'));assert.ok(bosses.has('blue_eyes'));
});
test('tactical breakthrough cannot bypass the low-star battle puzzle with raw attack power',()=>{
 const g=createGame({scenario:'C02'});assert.equal(g.players[0].field[0].id,'celtic_guardian');
 applyAction(g,0,legalActions(g,0).find(a=>a.kind==='attack'));for(let i=0;i<8&&g.window;i++)applyAction(g,g.window.responder,{kind:'pass'});
 assert.equal(g.players[0].lp,7400);assert.equal(g.players[1].field[0].id,'giant_soldier');assert.equal(g.result,null);
});
test('resource regeneration wins through graveyard revival with normal summon already spent',()=>{
 const g=createGame({scenario:'C04'}),uid=g.players[0].grave[0].uid;assert.equal(g.players[0].normalUsed,true);
 assert.ok(!legalActions(g,0).some(a=>a.kind==='summon'));applyAction(g,0,legalActions(g,0).find(a=>a.kind==='activate'&&a.position==='attack'));autoPass(g);
 assert.equal(g.result.winner,0);assert.ok(g.players[0].field.some(c=>c?.uid===uid));assert.equal(g.players[0].normalUsed,true);
});
test('normal AI uses a defensive monster to protect against stronger public attack',()=>{
 const g=createGame({decks:['tempo_starter','defense_starter']});g.active=1;g.turn=3;
 g.players[0].field=[{...instance('luster_dragon'),owner:0},null,null,null,null];g.players[1].hand=[{...instance('giant_soldier'),owner:1}];
 const a=chooseAi(g,1,'normal');assert.equal(a.kind,'summon');assert.equal(a.position,'defense');
});
test('featured summon presentation applies to other high-level and collected monsters',()=>{
 for(const id of ['summoned_skull','red_eyes','hyozanryu','seiyaryu'])assert.equal(monsterPresentation(CARDS[id]).featured,true,id);
 assert.equal(monsterPresentation(CARDS.battle_ox).featured,false);assert.notEqual(monsterPresentation(CARDS.battle_ox).color,monsterPresentation(CARDS.luster_dragon).color);
});

test('surrender results describe the viewer correctly without changing the authoritative winner',()=>{
 const game=createGame({scenario:'T02'});applyAction(game,0,{kind:'surrender'});
 assert.equal(duelResultReason(projectGame(game,0)),'你已投降');
 assert.equal(duelResultReason(projectGame(game,1)),'对手投降');
 assert.equal(game.result.winner,1);
 assert.equal(duelResultReason({you:0,result:{winner:null,reason:'双方断线'}}),'双方断线');
});

test('opponent trap and countering spell stay identifiable after source cards leave the field',()=>{
 const game=createGame({scenario:'T02'}),trap={...instance('mirror_force'),owner:1,faceUp:false,placedTurn:1};
 game.players[1].spells[0]=trap;game.players[0].hand=[{...instance('mst'),owner:0}];
 let feed=collectActivations(emptyActivationFeed(game.id),projectGame(game,0),CARDS);
 assert.equal(feed.history.length,0,'knowing the card catalog does not expose a set card');
 applyAction(game,0,legalActions(game,0).find(a=>a.kind==='attack'));
 applyAction(game,1,legalActions(game,1).find(a=>a.kind==='activate'&&a.cardUid===trap.uid));
 let view=projectGame(game,0);assert.equal(currentChainCard(view,CARDS).card.id,'mirror_force');assert.equal(currentChainCard(view,CARDS).player,1);
 feed=collectActivations(feed,view,CARDS);assert.equal(feed.active.id,'mirror_force');
 applyAction(game,0,legalActions(game,0).find(a=>a.kind==='activate'&&a.targetUid===trap.uid));
 view=projectGame(game,0);assert.equal(currentChainCard(view,CARDS).card.id,'mst');
 feed=collectActivations(feed,view,CARDS);assert.equal(feed.active.id,'mirror_force');assert.equal(feed.queue[0].id,'mst');
 autoPass(game);feed=collectActivations(feed,projectGame(game,0),CARDS);
 assert.ok(!game.players[1].spells.some(c=>c?.uid===trap.uid));assert.equal(feed.history[1].id,'mirror_force');
 assert.equal(advanceActivation(feed).active.id,'mst');assert.equal(ACTIVATION_HOLD_MS,4000);
});
test('batched and repeated activations are queued once by event identity, not card name',()=>{
 const events=[{type:'activate',id:'mst',player:1,eventId:'first'},{type:'activate',id:'mst',player:1,eventId:'second'}],view={id:'a',events};
 const feed=collectActivations(emptyActivationFeed('a'),view,CARDS);
 assert.equal(feed.active.key,'first');assert.equal(feed.queue[0].key,'second');assert.equal(feed.history.length,2);
 assert.equal(collectActivations(feed,{...view,version:10},CARDS),feed);
 const drained=advanceActivation(advanceActivation(feed));assert.equal(drained.active,null);assert.equal(drained.history.length,2);
 assert.equal(collectActivations(feed,{id:'b',events:[]},CARDS).history.length,0);
});
test('activation records ignore non-public placements and invalid card or player identities',()=>{
 const view={id:'a',events:[{type:'set',id:'mirror_force',player:1,eventId:'set'},{type:'summon',player:1,eventId:'summon'},{type:'activate',id:'not_in_catalog',player:1,eventId:'missing'},{type:'activate',id:'mst',player:4,eventId:'invalid'}]};
 assert.equal(collectActivations(emptyActivationFeed('a'),view,CARDS).history.length,0);
 assert.equal(currentChainCard({pending:{chain:[{player:1}]}},CARDS),null);
});

test('restoring an activation feed keeps history and shows only the live chain source',()=>{
 const game={id:'restore',events:[{type:'activate',id:'fissure',player:1,eventId:'old'},{type:'activate',id:'mirror_force',player:1,eventId:'live'}],pending:{chain:[{id:'mirror_force',player:1}]}};
 const restored=restoreActivationFeed(game,CARDS);
 assert.equal(restored.active.id,'mirror_force');assert.deepEqual(restored.queue,[]);assert.deepEqual(restored.history.map(e=>e.id),['mirror_force','fissure']);
 const settled=restoreActivationFeed({...game,pending:null},CARDS);assert.equal(settled.active,null);assert.equal(settled.history.length,2);
 assert.equal(collectActivations(restored,game,CARDS),restored);
});

test('public pile controls remain separate and outside compressed battle columns',()=>{
 for(const [w,h] of [[844,390],[1280,720],[667,375]]){
  const items=[{id:'ownG',own:true,x:w*.28,y:h*.66},{id:'ownB',own:true,x:w*.25,y:h*.76},{id:'opG',own:false,x:w*.69,y:h*.57},{id:'opB',own:false,x:w*.67,y:h*.52}],packed=packPileMarkers(items,w,h);
  for(const own of [true,false]){const positions=items.filter(m=>m.own===own).map(m=>packed.get(m.id));assert.ok(Math.abs(positions[0].y-positions[1].y)>=50);for(const pos of positions){assert.ok(pos.x>=44&&pos.x<=w-44);assert.ok(pos.y>=100&&pos.y<=h-70);}}
  assert.ok(packed.get('opG').x>w*.69);assert.ok(packed.get('ownG').x<w*.25);
 }
});
