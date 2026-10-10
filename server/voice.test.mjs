import test from 'node:test';import assert from 'node:assert/strict';
import {planVoiceSummon,VoiceEnergyGate} from '../src/voiceModel.ts';
import {VoiceSession} from '../src/voiceSession.ts';
import {createGame,projectGame,CARDS} from './engine.mjs';
function view(){return projectGame(createGame({names:['我','AI'],decks:['tempo_starter','dark_magician_starter'],scenario:'T01'}),0);}
test('voice recognition matches owned hand cards and selects only projected legal actions',()=>{
 const g=view(),p=planVoiceSummon(g,CARDS,{text:'出来吧，召唤精灵剑士！'});assert.equal(p.name,'精灵剑士');assert.equal(p.zone,2);assert.equal(p.needsChoice,false);assert.ok(g.legal.includes(p.actions[0]));
 assert.equal(planVoiceSummon(g,CARDS,{text:'召唤精灵剑士，守备表示'}).position,'defense');
 assert.ok(planVoiceSummon(g,CARDS,{text:'召唤对方秘密手牌'}).error);assert.ok(planVoiceSummon({...g,legal:[]},CARDS,{text:'精灵剑士'}).error);assert.ok(planVoiceSummon({...g,paused:true},CARDS,{text:'精灵剑士'}).error);
 assert.ok(planVoiceSummon({...g,window:{responder:0}},CARDS,{text:'精灵剑士'}).error);
 const second=g.players[0].hand.find(c=>CARDS[c.id]?.kind==='monster'&&c.id!=='celtic_guardian');if(second)assert.match(planVoiceSummon(g,CARDS,{text:`精灵剑士和${CARDS[second.id].name}`}).error,/多个卡名/);
});
test('voice tribute plans keep all legal tribute choices and do not auto sacrifice',()=>{
 const g=projectGame(createGame({names:['我','AI'],decks:['blue_eyes_starter','tempo_starter'],scenario:'C01'}),0),c=g.players[0].hand.find(c=>CARDS[c.id]?.level>=5);
 const p=planVoiceSummon(g,CARDS,{uid:c.uid});assert.equal(p.needsChoice,true);assert.ok(p.actions.every(a=>a.tributes.length>0&&g.legal.includes(a)));
});
test('amplitude gate calibrates ambient noise, requires sustained voice, triggers once',()=>{
 const gate=new VoiceEnergyGate();for(let i=0;i<650;i+=50)assert.equal(gate.sample(.02,i),false);
 assert.equal(gate.sample(.15,700),false);assert.equal(gate.sample(.01,750),false);for(let i=800;i<1050;i+=50)assert.equal(gate.sample(.15,i),false);assert.equal(gate.sample(.15,1050),true);assert.equal(gate.sample(.2,1100),false);
 const noisy=new VoiceEnergyGate();for(let i=0;i<650;i+=50)noisy.sample(.15,i);for(let i=650;i<1400;i+=50)assert.equal(noisy.sample(.17,i),false);
});
function environment(){
 const tracks=[{kind:'audio',readyState:'live',stop(){this.stopped=true;}}],stream={getTracks:()=>tracks,getAudioTracks:()=>tracks};let released=0,closed=0,aborted=0,callback=null;
 const rec={start(track){assert.equal(track,tracks[0]);},abort(){aborted++;}},node={connect(){},disconnect(){},fftSize:1024,getFloatTimeDomainData(a){a.fill(.01);}};
 const env={microphone:async()=>stream,release:async s=>{assert.equal(s,stream);released++;tracks[0].stop();},context:()=>({resume:async()=>{},close:async()=>{closed++;},createMediaStreamSource:()=>node,createAnalyser:()=>node}),recognizer:()=>rec,raf:fn=>{callback=fn;return 1;},cancelRaf:()=>{},now:()=>0};
 return {env,rec,stream,get released(){return released;},get closed(){return closed;},get aborted(){return aborted;}};
}
test('recognition final result stops the device and ignores late or repeated callbacks',async()=>{
 const f=environment(),results=[],errors=[],s=new VoiceSession(f.env,{level:()=>{},result:t=>results.push(t),error:e=>errors.push(e)});await s.start('speech');const callback=f.rec.onresult;
 const r=[{transcript:'召唤精灵剑士'}];r.isFinal=true;callback({results:[r]});callback({results:[r]});s.stop();
 assert.deepEqual(results,['召唤精灵剑士']);assert.equal(f.released,1);assert.equal(f.closed,1);assert.equal(f.aborted,1);assert.equal(errors.length,0);
});
test('cancel during permission wait releases the late stream; permission error closes the audio context',async()=>{
 const f=environment();let resolve;f.env.microphone=()=>new Promise(r=>resolve=r);const s=new VoiceSession(f.env,{level:()=>{},result:()=>assert.fail(),error:()=>assert.fail()});const pending=s.start('energy');s.stop();resolve(f.stream);await pending;assert.equal(f.released,1);assert.equal(f.closed,1);
 const e=environment(),errors=[];e.env.microphone=async()=>{throw {name:'NotAllowedError'};};await new VoiceSession(e.env,{level:()=>{},result:()=>assert.fail(),error:m=>errors.push(m)}).start('energy');assert.match(errors[0],/权限被拒绝/);assert.equal(e.closed,1);
});
