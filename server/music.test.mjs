import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,musicForState} from '../src/gameAudio.ts';
const tick=()=>new Promise(r=>setImmediate(r));
function harness(){
 const starts=[],stops=[],gains=[],decodes=[],requests=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},cancelScheduledValues(){},linearRampToValueAtTime(v){this.value=v;}});
 const context={state:'suspended',currentTime:10,destination:{},async resume(){this.state='running';},async suspend(){this.state='suspended';},createGain(){const g={gain:param(),connect(){},disconnect(){}};gains.push(g);return g;},createBufferSource(){const s={connect(){},disconnect(){},start(){starts.push(s)},stop(t){stops.push({s,t})}};return s;},async decodeAudioData(bytes){decodes.push(bytes);return {duration:58};}};
 const pending=new Map();const fetcher=url=>{requests.push(url);return new Promise((resolve,reject)=>pending.set(url,{resolve,reject}));};
 const audio=new GameAudio(()=>context,fetcher);
 const complete=async name=>{pending.get('/game-assets/music/'+name+'.mp3').resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await tick();};
 return {audio,context,starts,stops,gains,requests,pending,complete};
}
test('music scenes follow public LP only, return to lobby at results and use summoning music',()=>{
 const game={players:[{lp:8000},{lp:2500}]};assert.equal(musicForState(game,'card'),'danger');game.players[1].lp=2501;assert.equal(musicForState(game,'card'),'battle');game.result={winner:0};assert.equal(musicForState(game,'card'),'lobby');assert.equal(musicForState(null,'summon'),'summon');
});
test('autoplay waits for unlock and repeated gestures share one decode and one looping voice',async()=>{
 const h=harness();h.audio.setTrack('lobby');assert.equal(h.requests.length,0);await h.audio.unlock();await h.audio.unlock();await h.complete('lobby');assert.equal(h.starts.length,1);assert.equal(h.starts[0].loop,true);assert.equal(h.requests.length,1);
});
test('an old fetch cannot start after changing screens; cached track returns without downloading twice',async()=>{
 const h=harness();await h.audio.unlock();h.audio.setTrack('lobby');h.audio.setTrack('battle');await h.complete('battle');await h.complete('lobby');assert.equal(h.starts.length,1);h.audio.setTrack('lobby');await tick();assert.equal(h.starts.length,2);assert.equal(h.requests.length,2);assert.ok(h.stops.some(s=>s.s===h.starts[0]));
});
test('mute while decoding cancels playback and re-enable uses the cached result',async()=>{
 const h=harness();await h.audio.unlock();h.audio.setTrack('battle');h.audio.configure(false,.3);await h.complete('battle');assert.equal(h.starts.length,0);h.audio.configure(true,.45);await tick();assert.equal(h.starts.length,1);assert.equal(h.gains.at(-1).gain.value,.45);
});
test('background suspends audio and cannot start pending music; visible return resumes one loop',async()=>{
 const h=harness();await h.audio.unlock();h.audio.setTrack('summon');h.audio.setVisible(false);await h.complete('summon');assert.equal(h.starts.length,0);assert.equal(h.context.state,'suspended');h.audio.setVisible(true);await tick();assert.equal(h.starts.length,1);
});
test('practice pause and unmount stop music and prevent stale audio restarting',async()=>{
 const h=harness();await h.audio.unlock();h.audio.setTrack('battle');await h.complete('battle');h.audio.setTrack('battle',true);assert.ok(h.stops.length);h.audio.setTrack('danger');h.audio.stop();await h.complete('danger');assert.equal(h.starts.length,1);
});
test('zero volume is valid and rapid switches cannot extend an already fading old voice',async()=>{
 const h=harness();await h.audio.unlock();h.audio.configure(true,0);h.audio.setTrack('lobby');await h.complete('lobby');assert.equal(h.gains.at(-1).gain.value,0);h.audio.setTrack('battle');await h.complete('battle');const firstStop=h.stops.find(s=>s.s===h.starts[0]);h.audio.setTrack('danger');await h.complete('danger');assert.equal(h.stops.filter(s=>s.s===h.starts[0]).length,1);assert.equal(firstStop.t,11.365);
});
