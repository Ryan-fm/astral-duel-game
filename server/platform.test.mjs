import test from 'node:test';import assert from 'node:assert/strict';
import {ToyCloudSave,splitSave,CLOUD_KEYS} from '../src/toyCloudSave.ts';
import {createToyConnection} from '../src/toyConnection.ts';
import {recordChallenge,challengeScore,rankProfiles} from './ranking.mjs';
import {DECKS} from './engine.mjs';
import {inToyContext} from '../src/toyPlatform.ts';
test('Toy content iframe and parent paths use the platform adapter without accepting unrelated hosts',()=>{
 for(const hostname of ['www.bilibilitoy.com','bilibilitoy.com','www.bilibili.com'])for(const pathname of ['/toy/astral-duel-game/index.html','/toy/preview/preview_example/index.html'])assert.equal(inToyContext({hostname,pathname}),true);
 for(const hostname of ['localhost','bilibili.com.example.com','bilibilitoy.com.example.com','example.com'])assert.equal(inToyContext({hostname,pathname:'/toy/astral-duel-game/index.html'}),false);
 assert.equal(inToyContext({hostname:'bilibilitoy.com',pathname:'/other/index.html'}),false);
});
const profile=()=>({name:'测试决斗者',wins:0,losses:0,recent:[],completed:[],cosmetics:['night'],appearance:{arena:'night'},tickets:30,collection:{},dust:0,pity:0,customDeck:DECKS[0].cards.flatMap(c=>Array(c.count).fill(c.card_id)),drawHistory:[],challengeBest:{}});
function sdk(){const values={},calls=[];return {values,calls,isSupport:async()=>true,getUserProfile:async()=>({nickname:'B站决斗者',avatar:'',toyOpenId:'private-not-a-token'}),getCloudStorage:async keys=>{calls.push(['read',keys]);return Object.fromEntries(keys.filter(k=>k in values).map(k=>[k,values[k]]));},setCloudStorage:async items=>{calls.push(['write',items]);Object.assign(values,items);},submitScore:async req=>{calls.push(['score',req]);return {score:req.score};},getRankList:async()=>{calls.push(['rank']);return [];},getMyRank:async()=>({ranked:false,rank:0,score:0})};}
async function client(api){const s=await createToyConnection(api);let state;await new Promise(resolve=>s.on('state',v=>{state=v;resolve();}));return {s,get state(){return state;},cmd:(type,args={})=>s.timeout(1000).emitWithAck('command',{type,requestId:crypto.randomUUID(),...args})};}
test('cloud saves use bounded UTF-8 values, two generations and restore full deck without local storage',async()=>{
 const api=sdk(),store=new ToyCloudSave(api),p=profile();p.name='白龍'.repeat(16);p.drawHistory=Array.from({length:5},()=>({id:crypto.randomUUID(),results:Array.from({length:10},()=>({cardId:'alexandrite_dragon',rarity:'SR',isNew:false,copy:3}))}));
 assert.equal(await store.load(),null);await store.save(p);
 assert.equal(api.calls.filter(c=>c[0]==='write').length,2);
 for(const value of Object.values(api.values))assert.ok(new TextEncoder().encode(value).length<=1024);
 assert.deepEqual((await new ToyCloudSave(api).load()).customDeck,p.customDeck);
 assert.equal(Object.keys(api.values).length<128,true);assert.equal(CLOUD_KEYS.length,49);
 const writes=api.calls.length;await store.save(p);assert.equal(api.calls.length,writes,'unchanged snapshots avoid writes');
 const parts=splitSave('🐉青眼白龍'.repeat(400));assert.equal(parts.join(''),'🐉青眼白龍'.repeat(400));assert.ok(parts.every(p=>new TextEncoder().encode(p).length<=900));
});
test('a failed chunk write cannot replace the committed save, corrupt data never becomes an empty archive',async()=>{
 const api=sdk(),store=new ToyCloudSave(api),p=profile();await store.save(p);const original=api.setCloudStorage;api.setCloudStorage=async items=>{Object.assign(api.values,Object.fromEntries(Object.entries(items).slice(0,1)));throw Error('lost connection');};
 p.tickets=12;await assert.rejects(store.save(p));api.setCloudStorage=original;
 assert.equal((await new ToyCloudSave(api).load()).tickets,30);
 const manifest=JSON.parse(api.values.ruins_duel_v2);api.values[`ruins_duel_v2_${manifest.slot}_0`]='broken';
 await assert.rejects(new ToyCloudSave(api).load(),/校验失败/);
});
test('Toy restores a cloud-owned custom deck on a new connection and never stores account identifiers',async()=>{
 const api=sdk(),a=await client(api);try{
  const list=profile().customDeck;assert.equal((await a.cmd('deck-save',{cards:list,extra:['gaia_dragon_champion','b_skull_dragon']})).ok,true);
  await a.cmd('cloud-connect');assert.equal(a.state.storage.user.nickname,'B站决斗者');assert.equal(JSON.stringify(api.values).includes('private-not-a-token'),false);
  const b=await client(api);try{assert.deepEqual(b.state.profile.customDeck,list);assert.deepEqual(b.state.profile.customExtra,['gaia_dragon_champion','b_skull_dragon']);assert.equal(b.state.storage.mode,'cloud');await b.cmd('practice',{deck:'custom'});assert.equal(b.state.game.players[0].deckId,'custom');assert.equal(b.state.game.players[0].extraCount,2);}finally{b.s.disconnect();}
 }finally{a.s.disconnect();}
});
test('unavailable cloud blocks mutations; explicit guest play remains memory-only',async()=>{
 const api=sdk();api.getCloudStorage=async()=>{throw {type:'unauthorized',code:-101};};const c=await client(api);try{
  assert.equal(c.state.storage.blocked,true);assert.equal((await c.cmd('draw',{count:1})).ok,false);
  assert.equal((await c.cmd('cloud-guest')).ok,true);assert.equal((await c.cmd('draw',{count:1})).ok,true);assert.equal(api.calls.some(c=>c[0]==='write'),false);
  const next=await client(api);try{assert.equal(next.state.profile.tickets,30);}finally{next.s.disconnect();}
 }finally{c.s.disconnect();}
});
test('cloud write failure rolls back a draw and in-flight duplicate draws share one response',async()=>{
 const api=sdk(),c=await client(api);try{
  api.setCloudStorage=async()=>{throw Error('write unavailable');};assert.equal((await c.cmd('draw',{count:1})).ok,false);assert.equal(c.state.profile.tickets,30);
  api.setCloudStorage=async items=>{await new Promise(r=>setTimeout(r,5));Object.assign(api.values,items);};
  const [a,b]=await Promise.all([c.cmd('draw',{count:1,requestId:'same'}),c.cmd('draw',{count:1,requestId:'same'})]);assert.equal(a.ok,true);assert.equal(a.draw.id,b.draw.id);assert.equal(c.state.profile.tickets,29);
 }finally{c.s.disconnect();}
});
test('rank reads cache, zero score uses ranked flag, and rate limiting prevents immediate repeated API calls',async()=>{
 const api=sdk(),c=await client(api);try{
  const a=await c.cmd('leaderboard');assert.equal(a.ranking.my.ranked,false);await c.cmd('leaderboard');assert.equal(api.calls.filter(c=>c[0]==='rank').length,1);
  await c.cmd('leaderboard',{refresh:true});assert.equal(api.calls.filter(c=>c[0]==='rank').length,2);
  assert.equal((await c.cmd('rank-join')).ok,true);assert.equal(c.state.profile.rankEnabled,true);
  let attempts=0;api.setCloudStorage=async()=>{attempts++;throw {type:'http_error',code:307044};};
  await c.cmd('draw',{count:1});assert.ok(c.state.storage.retryAt>Date.now());await c.cmd('draw',{count:1});assert.equal(attempts,1);
 }finally{c.s.disconnect();}
});
test('only won classic challenges improve best scores; repeat play, tutorial, friend and forged UI scores do not inflate rank',()=>{
 const p=profile(),g={scenario:'C01',turn:4,result:{winner:0},players:[{lp:5000}]};
 assert.equal(recordChallenge(p,g,0),true);assert.equal(challengeScore(p),950);assert.equal(recordChallenge(p,{...g,turn:8},0),false);assert.equal(challengeScore(p),950);
 assert.equal(recordChallenge(p,{...g,scenario:'T01'},0),false);assert.equal(recordChallenge(p,{...g,scenario:null},0),false);assert.equal(recordChallenge(p,{...g,result:{winner:1}},0),false);
 recordChallenge(p,{...g,turn:1},0);assert.equal(challengeScore(p),1025);
 const other={...profile(),name:'对手',wins:3};p.wins=1;const rank=rankProfiles([p,other],p,2);assert.equal(rank.rows[0].nickname,'对手');assert.equal(rank.my.rank,2);assert.equal(JSON.stringify(rank).includes('customDeck'),false);
});

test('an unknown manifest outcome blocks further mutations until reconnect restores the authoritative cloud generation',async()=>{
 const api=sdk(),c=await client(api);try{const write=api.setCloudStorage;api.setCloudStorage=async items=>{await write(items);if(items.ruins_duel_v2)throw Error('response lost after commit');};
 assert.equal((await c.cmd('draw',{count:1})).ok,false);assert.equal(c.state.storage.blocked,true);assert.equal(c.state.profile.tickets,30);assert.equal((await c.cmd('draw',{count:1})).ok,false);
 api.setCloudStorage=write;assert.equal((await c.cmd('cloud-connect')).ok,true);assert.equal(c.state.profile.tickets,29);assert.equal(Object.keys(c.state.profile.collection).length,1);assert.equal(c.state.storage.blocked,false);
 }finally{c.s.disconnect();}
});
