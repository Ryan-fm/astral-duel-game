import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineEndpoint,onlinePath,checkOnlineAvailability} from '../src/onlineConfig.ts';
import {onlinePassport} from '../src/onlinePassport.ts';
import {createHybridConnection} from '../src/hybridConnection.ts';
import {inToyPreviewContext} from '../src/toyPlatform.ts';
function connection(state){const handlers=new Map();return {connected:true,auth:{},initialState:state,commands:[],on(event,fn){handlers.set(event,[...(handlers.get(event)||[]),fn]);return this;},emit(event,value){for(const fn of handlers.get(event)||[])fn(value);},timeout(){return {emitWithAck:async(event,m)=>{this.commands.push(m);return {ok:true};}};},disconnect(){this.connected=false;this.emit('disconnect');}};}
test('Toy switches whole archives, protects active rooms and sends draws to the authoritative connection',async()=>{
 const localState={profile:{tickets:9,collection:{local:1}},storage:{mode:'cloud'},game:null,room:null,queue:null},remoteState={profile:{tickets:30,collection:{}},storage:{mode:'server'},game:null,room:null,queue:null};
 const offline=connection(localState),remote=connection(remoteState);remote.cloudPassport=true;
 const hybrid=createHybridConnection({offline,available:true,open:async()=>remote});let state;hybrid.on('state',v=>state=v);offline.emit('state',localState);
 const cmd=(type,args={})=>hybrid.timeout(1000).emitWithAck('command',{type,...args});
 assert.equal(state.online.active,false);assert.equal((await cmd('online-open')).ok,true);assert.equal(state.online.active,true);assert.equal(state.profile.tickets,30);assert.equal(state.storage.cloudPassport,true);
 await cmd('draw',{count:10});assert.equal(remote.commands[0].type,'draw');assert.equal(offline.commands.length,0);
 remote.emit('state',{...remoteState,room:{code:'012345'}});assert.equal((await cmd('online-close')).ok,false);assert.equal(remote.connected,true);
 remote.emit('state',remoteState);assert.equal((await cmd('online-close')).ok,true);assert.equal(state.profile.tickets,9);assert.deepEqual(state.profile.collection,{local:1});assert.equal(state.online.active,false);hybrid.disconnect();
});
test('failed online opening leaves the Toy archive usable without importing inventory',async()=>{
 const offline=connection({profile:{tickets:12},storage:{mode:'cloud'}}),hybrid=createHybridConnection({offline,available:true,open:async()=>{throw Error('offline');}});let state;hybrid.on('state',v=>state=v);offline.emit('state',offline.initialState);
 assert.equal((await hybrid.timeout(1).emitWithAck('command',{type:'online-open'})).ok,false);assert.equal(state.profile.tickets,12);assert.equal(hybrid.connected,true);hybrid.disconnect();
});
test('cloud passport restores an issued credential, never accepts Toy IDs or overwrites a changed passport',async()=>{
 const values={},token='a'.repeat(64),api={getCloudStorage:async keys=>Object.fromEntries(keys.filter(k=>k in values).map(k=>[k,values[k]])),setCloudStorage:async items=>Object.assign(values,items)};
 const p=await onlinePassport('https://duel.example.com',api);assert.equal(p.token,undefined);await p.save(token);const restored=await onlinePassport('https://duel.example.com',api);assert.equal(restored.token,token);await assert.rejects(restored.save('b'.repeat(64)),/不一致/);
 const key=Object.keys(values)[0];values[key]='toy-open-id';await assert.rejects(onlinePassport('https://duel.example.com',api),/凭证异常/);
 delete values[key];const race=await onlinePassport('https://duel.example.com',api);values[key]='b'.repeat(64);await assert.rejects(race.save(token),/另一页面/);assert.equal(values[key],'b'.repeat(64));
 const unavailable={...api,getCloudStorage:async()=>{throw Error('cloud read failed');}};await assert.rejects(onlinePassport('https://duel.example.com',unavailable),/cloud read failed/);
});
test('online configuration requires a secure origin and an explicit safe Socket.IO path',()=>{
 assert.equal(onlineEndpoint('https://duel.example.com'),'https://duel.example.com');assert.equal(onlineEndpoint('http://127.0.0.1:5179'),'http://127.0.0.1:5179');assert.equal(onlineEndpoint(''),null);
 for(const url of ['http://example.com','https://secret@example.com','https://example.com?token=secret','https://example.com/api'])assert.throws(()=>onlineEndpoint(url));assert.equal(onlinePath(undefined),'/api/duel/socket.io');assert.throws(()=>onlinePath('/../private'));
});
test('refresh restores an existing online game without queuing or forfeiting it',async()=>{
 const offline=connection({profile:{tickets:12},game:null}),remote=connection({profile:{tickets:20},game:{id:'original-game'},room:null,queue:null});let changed;
 const hybrid=createHybridConnection({offline,available:true,open:async()=>remote,restore:true,modeChanged:v=>changed=v});let state;hybrid.on('state',v=>state=v);offline.emit('state',offline.initialState);
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(state.game.id,'original-game');assert.equal(changed,true);assert.equal(remote.commands.length,0);assert.equal((await hybrid.timeout(1).emitWithAck('command',{type:'online-close'})).ok,false);hybrid.disconnect();
});
test('no-Redis mode never opens a remote connection and leaves cloud commands on the original archive',async()=>{
 const offline=connection({profile:{tickets:17,customDeck:['saved']},storage:{mode:'cloud'}});let opened=0,state;
 const hybrid=createHybridConnection({offline,available:false,unavailableReason:'当前为单人版',restore:true,open:async()=>{opened++;throw Error('must not connect');}});
 hybrid.on('state',v=>state=v);offline.emit('state',offline.initialState);await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(opened,0);assert.equal(state.online.available,false);assert.equal(state.online.message,'当前为单人版');
 const reply=await hybrid.timeout(1).emitWithAck('command',{type:'online-open'});assert.equal(reply.ok,false);assert.equal(opened,0);
 await hybrid.timeout(1).emitWithAck('command',{type:'draw',count:1});assert.equal(offline.commands[0].type,'draw');assert.deepEqual(state.profile.customDeck,['saved']);assert.equal(state.storage.mode,'cloud');hybrid.disconnect();
});
test('disabled or unavailable online endpoint is checked before identity creation',async()=>{
 await checkOnlineAvailability('https://duel.example.com',async()=>new Response(JSON.stringify({enabled:true})));
 for(const response of [new Response(JSON.stringify({enabled:false})),new Response('broken',{status:503}),new Response('<html>')])await assert.rejects(checkOnlineAvailability('https://duel.example.com',async()=>response),/人机决斗/);
 await assert.rejects(checkOnlineAvailability('https://duel.example.com',async()=>{throw Error('Failed to fetch');}),/人机决斗/);
});
test('only the actual Toy preview host uses temporary credentials, never the formal Toy page',()=>{
 assert.equal(inToyPreviewContext({hostname:'www.bilibilitoy.com',pathname:'/toy/preview/preview_abc/index.html'}),true);
 assert.equal(inToyPreviewContext({hostname:'www.bilibili.com',pathname:'/toy/preview/preview_abc/index.html'}),true);
 assert.equal(inToyPreviewContext({hostname:'www.bilibilitoy.com',pathname:'/toy/astral-duel-game/index.html'}),false);
 assert.equal(inToyPreviewContext({hostname:'malicious.example.com',pathname:'/toy/preview/preview_abc/index.html'}),false);
});
