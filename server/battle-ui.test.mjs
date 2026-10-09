import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,projectGame,legalActions,applyAction,autoPass,CARDS,instance} from './engine.mjs';
import {attackPreview,unavailableReason,battleGuidance,findVisibleCard} from '../src/battleModel.ts';
const attackingGame=()=>createGame({scenario:'T02'});
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
