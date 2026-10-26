import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {io} from 'socket.io-client';
import {randomUUID} from 'node:crypto';
import {createDuelServer} from './app.mjs';
import {createWorldStore,emptyWorld,transact} from './worldStore.mjs';
import {createWorld} from './world.mjs';
const exec=promisify(execFile),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<250;i++){if(fn())return;await sleep(20);}throw Error('State timeout');}
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return server.address().port;}
function step(world,now,fn){const m=createWorld(world,now);m.tick();const answer=fn?.(m);m.flush();return answer;}
test('cold-start reconciliation uses the original disconnect deadline and settles once',()=>{
 const w=emptyWorld(),now=Date.now(),a=step(w,now,m=>m.connect(null,'a')),b=step(w,now,m=>m.connect(null,'b'));
 const command=(t,id,type,args={})=>step(w,now,m=>m.command(t,id,{type,requestId:randomUUID(),...args}));
 command(a,'a','queue',{deck:'blue_eyes_starter'});command(b,'b','queue',{deck:'dark_magician_starter'});command(a,'a','ready');command(b,'b','ready');
 step(w,now,m=>m.disconnect(a,'a'));
 // Keep the opponent connected; no process tick ran during the absent minute.
 w.profiles[b].presence.until=now+100000;
 step(w,now+61000);
 const g=Object.values(w.games)[0];assert.equal(g.g.result.winner,1);assert.equal(w.profiles[a].losses,1);assert.equal(w.profiles[b].wins,1);
 step(w,now+90000);assert.equal(w.profiles[a].losses,1);assert.equal(w.profiles[b].wins,1);
});
test('solo AI practice holds across disconnect/lease expiry and resumes without a forfeit',()=>{
 for(const explicit of [true,false]){
  const w=emptyWorld(),now=Date.now(),token=step(w,now,m=>m.connect(null,'solo'));
  const started=step(w,now,m=>m.command(token,'solo',{type:'practice',deck:'blue_eyes_starter',requestId:'solo-start'}));assert.equal(started.ok,true);
  const item=Object.values(w.games)[0];item.g.active=1;const before=JSON.stringify(item.g),tickets=w.profiles[token].tickets;
  if(explicit)step(w,now,m=>m.disconnect(token,'solo'));
  step(w,now+120000);assert.equal(JSON.stringify(Object.values(w.games)[0].g),before,'no AI action or disconnect verdict while away');assert.equal(w.profiles[token].tickets,tickets);
  step(w,now+120010,m=>m.connect(token,'resume'));assert.equal(Object.values(w.games)[0].g.result,null);
  step(w,now+120800);assert.ok(Object.values(w.games)[0].g.version>JSON.parse(before).version,'AI resumes after reconnect');assert.equal(w.profiles[token].wins,0);assert.equal(w.profiles[token].losses,0);
 }
});
test('failed operations roll back membership and cannot erase the original room',()=>{
 const w=emptyWorld(),now=Date.now(),a=step(w,now,m=>m.connect(null,'a'));
 step(w,now,m=>m.command(a,'a',{type:'create-room',deck:'blue_eyes_starter',requestId:'room'}));const room=w.profiles[a].roomCode;
 const reply=step(w,now,m=>m.command(a,'a',{type:'queue',deck:'forged',requestId:'bad'}));assert.equal(reply.ok,false);assert.equal(w.profiles[a].roomCode,room);assert.ok(w.rooms[room]);
 assert.throws(()=>step(w,now,m=>m.connect('a'.repeat(64),'unknown')),/身份已失效/);
});
test('shared Redis requires its own namespace and never mixes two credential pairs',()=>{
 const env={VERCEL:'1',DUEL_KV_REST_API_URL:'https://redis.example.com',DUEL_KV_REST_API_TOKEN:'alias',DUEL_REDIS_SHARED:'1'};
 assert.throws(()=>createWorldStore(env),/explicit game namespace/);
 assert.equal(createWorldStore({...env,DUEL_REDIS_NAMESPACE:'astral-duel:prod:v1'}).kind,'redis');
 assert.throws(()=>createWorldStore({...env,DUEL_REDIS_NAMESPACE:'astral-duel:prod:v1',UPSTASH_REDIS_REST_URL:'https://different.example.com'}),/both be configured/);
});
test('disabled Vercel endpoint uses no Redis, advertises solo mode and rejects PK',{timeout:10000},async t=>{
 let reads=0;const s=createDuelServer({env:{VERCEL:'1',DUEL_ONLINE_ENABLED:'0',DUEL_ALLOWED_ORIGINS:'https://www.bilibilitoy.com'},store:{kind:'unused',async read(){reads++;throw Error('must not read');}}}),port=await listen(s.server);
 const socket=io(`http://127.0.0.1:${port}`,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:'https://www.bilibilitoy.com'}});t.after(async()=>{socket.disconnect();await s.close();});
 const error=await new Promise(resolve=>socket.once('connect_error',resolve));assert.match(error.message,/PK 暂停开放/);
 const status=await fetch(`http://127.0.0.1:${port}/api/online-status`,{headers:{Origin:'https://www.bilibilitoy.com'}});assert.equal(status.headers.get('access-control-allow-origin'),'https://www.bilibilitoy.com');assert.equal((await status.json()).enabled,false);
 assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/health`)).json()).storage,'disabled');assert.equal(reads,0);
 // No supplied store or Redis credentials are needed when disabled.
 const noStore=createDuelServer({env:{VERCEL:'1',DUEL_ONLINE_ENABLED:'0'}});await noStore.close();
});
test('two Socket.IO instances share real Redis CAS, inventory, room and reconnect state',{timeout:40000},async t=>{
 try{await exec('redis-server',['--version']);}catch{t.skip('redis-server is required for distributed integration');return;}
 const dir=await mkdtemp(path.join(os.tmpdir(),'duel-redis-')),probe=createServer();const port=await listen(probe);await new Promise(resolve=>probe.close(resolve));
 const redis=spawn('redis-server',['--bind','127.0.0.1','--port',String(port),'--save','','--appendonly','no','--dir',dir],{stdio:['ignore','pipe','pipe']});let ready='';redis.stdout.on('data',v=>ready+=v);redis.stderr.on('data',v=>ready+=v);
 const services=[],clients=[];let gateway;
 t.after(async()=>{for(const c of clients)c.socket.disconnect();for(const s of services)await s.close();if(gateway)await new Promise(resolve=>gateway.close(resolve));const exited=new Promise(resolve=>redis.once('exit',resolve));redis.kill();await exited;await rm(dir,{recursive:true,force:true});});
 await until(()=>ready.includes('Ready to accept connections'));
 gateway=createServer(async(req,res)=>{if(req.headers.authorization!=='Bearer test-only'){res.writeHead(401);res.end();return;}try{let raw='';for await(const part of req)raw+=part;const args=JSON.parse(raw).map(String);const {stdout}=await exec('redis-cli',['-p',String(port),'--json',...args],{maxBuffer:8*1024*1024});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result:JSON.parse(stdout)}));}catch{res.writeHead(500);res.end();}});
 const restPort=await listen(gateway),env={NODE_ENV:'test',UPSTASH_REDIS_REST_URL:`http://127.0.0.1:${restPort}`,UPSTASH_REDIS_REST_TOKEN:'test-only',DUEL_REDIS_NAMESPACE:'integration',DUEL_POLL_MS:'80',DUEL_SOCKET_PATH:'/api/duel/socket.io'};
 const unrelated=createWorldStore({...env,DUEL_REDIS_NAMESPACE:'another-game'});await transact(unrelated,w=>{w.sentinel='preserve-other-game';});const unrelatedBefore=await unrelated.read();
 async function service(){const s=createDuelServer({env});services.push(s);return {s,port:await listen(s.server)};}
 const one=await service(),two=await service();
 async function connect(server,token){const c={socket:io(`http://127.0.0.1:${server.port}`,{path:'/api/duel/socket.io',transports:['websocket'],auth:{token},reconnection:false}),state:null,token};clients.push(c);c.socket.on('session',v=>c.token=v.token);c.socket.on('state',v=>c.state=v);await until(()=>c.state&&c.token);return c;}
 const command=(c,type,args={},requestId=randomUUID())=>c.socket.timeout(5000).emitWithAck('command',{type,...args,requestId});
 const a=await connect(one),b=await connect(two),requestId=randomUUID();
 const draw=await command(a,'draw',{count:10},requestId);assert.equal(draw.ok,true);assert.equal(a.state.profile.tickets,20);assert.deepEqual(b.state.profile.collection,{});
 await command(a,'queue',{deck:'blue_eyes_starter'});await command(b,'queue',{deck:'dark_magician_starter'});await until(()=>a.state.room&&b.state.room);assert.equal(a.state.room.code,b.state.room.code);
 await command(a,'ready');await command(b,'ready');await until(()=>a.state.game&&b.state.game);const gameId=a.state.game.id,deadline=a.state.game.deadline;
 assert.deepEqual(a.state.game.players[1].hand,[]);assert.deepEqual(b.state.game.players[0].hand,[]);
 a.socket.disconnect();await until(()=>b.state.game.disconnected);
 const re=await connect(two,a.token);assert.equal(re.state.game.id,gameId);assert.equal(re.state.game.deadline,deadline);assert.equal(re.state.profile.tickets,20);
 const repeated=await command(re,'draw',{count:10},requestId);assert.equal(repeated.draw.id,draw.draw.id);assert.equal(re.state.profile.tickets,20);
 await command(re,'action',{version:re.state.game.version,action:{kind:'surrender'}});await until(()=>b.state.game.result);assert.equal(b.state.profile.wins,1);
 await command(re,'leave');await command(b,'leave');await command(re,'create-room',{deck:'blue_eyes_starter'});const code=re.state.room.code;
 const c=await connect(one);assert.equal((await command(c,'join-room',{code,deck:'dark_magician_starter'})).ok,true);await until(()=>re.state.room.players.length===2);
 await command(re,'ready');await command(c,'ready');await command(re,'start-room');await until(()=>c.state.game?.mode==='friend');assert.equal(c.state.game.id,re.state.game.id);
 // A third instance knows no local clients, but still restores the same game.
 const three=await service();re.socket.disconnect();const restored=await connect(three,a.token);assert.equal(restored.state.game.id,c.state.game.id);assert.equal(restored.state.profile.tickets,20);
 const store=createWorldStore(env);await Promise.all(Array.from({length:5},()=>transact(store,w=>{w.testCounter=(w.testCounter||0)+1;})));assert.equal((await store.read()).testCounter,5);
 assert.deepEqual(await unrelated.read(),unrelatedBefore);
});
