import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowMonster} from '../src/battleModel.ts';
import {createGame,projectGame} from './engine.mjs';

test('face-down, unidentified and non-field cards never reveal a monster',()=>{
 const game=createGame({scenario:'T02'});game.players[1].field[0].faceUp=false;
 assert.equal(shouldShowMonster(projectGame(game,0).players[1].field[0],'field'),false);
 assert.equal(shouldShowMonster(game.players[1].field[0],'field'),false,'even an owner-known face-down card is not materialized');
 assert.equal(shouldShowMonster({id:'kuriboh',faceUp:true},'field'),true);assert.equal(shouldShowMonster({id:'kuriboh',faceUp:true},'hand'),false);assert.equal(shouldShowMonster({faceUp:true},'field'),false);
});
