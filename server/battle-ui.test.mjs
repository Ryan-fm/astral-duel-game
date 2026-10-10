import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,projectGame,legalActions,applyAction,autoPass,CARDS,instance,DECKS,chooseAi} from './engine.mjs';
import {attackPreview,unavailableReason,battleGuidance,findVisibleCard,monsterPresentation} from '../src/battleModel.ts';
const attackingGame=()=>{const g=createGame({scenario:'T02'});g.players[0].field[0].id='blue_eyes';g.players[1].field[0].id='battle_ox';return g;};
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
test('three alternative starter strategies contain no Blue-Eyes and use distinct card distributions',()=>{
 assert.equal(DECKS.length,6);const alternatives=DECKS.filter(d=>d.id!=='blue_eyes_starter');assert.equal(alternatives.length,5);
 for(const d of alternatives)assert.ok(!d.cards.some(c=>c.card_id==='blue_eyes'));
 assert.equal(new Set(DECKS.map(d=>JSON.stringify(d.cards))).size,6);
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
