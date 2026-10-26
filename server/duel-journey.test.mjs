import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JOURNEY_CHAPTERS,JOURNEY_STAGES,journeyProgress,nextJourneyStage} from '../src/duelJourneyModel.ts';
import {awardDuelRewards} from './duelRewards.mjs';
const scenarios=JSON.parse(readFileSync(new URL('./scenarios.json',import.meta.url)));
test('the journey groups every real scenario once, with no invented campaign stage',()=>{
 const ids=JOURNEY_CHAPTERS.flatMap(chapter=>chapter.stageIds);
 assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,12);
 assert.deepEqual([...ids].sort(),scenarios.map(row=>row[0]).sort());
 for(const stage of JOURNEY_STAGES)assert.equal(stage.objective,scenarios.find(row=>row[0]===stage.id)[2]);
});
test('journey progress ignores duplicate or retired completions and never mutates server archive',()=>{
 const completed=['T01','T01','retired'];
 assert.deepEqual(journeyProgress(completed),{done:1,total:12,nextId:'T02',nextName:'攻击与伤害'});
 assert.deepEqual(completed,['T01','T01','retired']);assert.equal(nextJourneyStage(), 'T01');
 assert.equal(nextJourneyStage(null),'T01');
});
test('recommendation follows the chapter path while keeping later completed stages valid',()=>{
 const completed=['T01','T02','T06','T07'];assert.equal(nextJourneyStage(completed),'C01');
 const all=JOURNEY_STAGES.map(stage=>stage.id);assert.equal(nextJourneyStage(all),null);
 assert.deepEqual(journeyProgress(all),{done:12,total:12,nextId:null,nextName:'全部试炼已完成'});
});
test('displayed first-clear rewards match authoritative settlement and repeats do not earn them again',()=>{
 for(const stage of JOURNEY_STAGES){
  const profile={tickets:0,completed:[],cosmetics:[]},game={mode:stage.kind==='lesson'?'tutorial':'challenge',scenario:stage.id,result:{winner:0}};
  const reward=awardDuelRewards(profile,game,0);assert.equal(reward.tickets,stage.tickets);assert.equal(reward.packs,stage.packs);
  const repeat={...game,result:{winner:0}},again=awardDuelRewards(profile,repeat,0);assert.equal(again.tickets,0);assert.equal(again.packs,0);
 }
});
