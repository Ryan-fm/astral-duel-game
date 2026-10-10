import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorldStore,transact} from './worldStore.mjs';
import {createWorld} from './world.mjs';
import {RULES_VERSION} from './engine.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export function createDuelServer({env=process.env,store}={}){
 const onlineEnabled=env.DUEL_ONLINE_ENABLED!=='0';
 // Disabling the endpoint must not initialize or query Redis.
 store ||= onlineEnabled?createWorldStore(env):{kind:'disabled',async read(){throw Error('实时 PK 暂停开放');},async commit(){throw Error('实时 PK 暂停开放');}};
 const app=express(),server=createServer(app),clients=new Map();
 const origins=new Set((env.DUEL_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
 for(const domain of [env.VERCEL_URL,env.VERCEL_PROJECT_PRODUCTION_URL])if(domain)origins.add('https://'+domain);
 function allowed(req){const origin=req.headers.origin;if(!origin)return !env.VERCEL;try{const u=new URL(origin);return origins.has(u.origin)||(!env.VERCEL&&['localhost','127.0.0.1','[::1]'].includes(u.hostname));}catch{return false;}}
 const io=new Server(server,{path:env.DUEL_SOCKET_PATH||'/socket.io',maxHttpBufferSize:16000,pingInterval:5000,pingTimeout:5000,cors:{origin:(origin,cb)=>cb(null,!origin||origins.has(origin)||(!env.VERCEL&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))},allowRequest:(req,cb)=>cb(null,allowed(req))});
 let chain=Promise.resolve(),closed=false,lastHeartbeat=0,polling=false,lastPoll=0,retryAfter=0,pollFailures=0;
 const pollMs=Number(env.DUEL_POLL_MS)||1000,idlePollMs=Number(env.DUEL_IDLE_POLL_MS)||Math.max(pollMs,10000);
 const run=fn=>{const task=chain.then(async()=>{const out=await transact(store,w=>{const model=createWorld(w);model.tick();const result=fn(model);model.flush();return result;});publish(out.world);return out.result;});chain=task.catch(()=>{});return task;};
 function publish(w){const model=createWorld(w);for(const [id,c]of clients){const p=model.profiles.get(c.token);if(p?.presence?.id!==id){c.socket.emit('notice','联机身份已在另一页面连接');c.socket.disconnect(true);continue;}const state=model.view(c.token);c.active=!!(state.queue||state.room||(state.game&&!state.game.result));c.socket.emit('state',state);for(const n of p.notices||[])if(!c.notices.has(n.id)){c.notices.add(n.id);c.socket.emit('notice',n.text);}if(c.notices.size>50)c.notices=new Set((p.notices||[]).map(n=>n.id));}}
 io.use(async(socket,next)=>{try{if(!onlineEnabled)throw Error('实时 PK 暂停开放，可继续人机决斗');const token=socket.handshake.auth?.token;if(token!==undefined&&token!==null&&(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)))throw Error('联机凭证格式不正确');socket.data.token=await run(m=>m.connect(token,socket.id));next();}catch(e){next(Error(e.message));}});
 io.on('connection',socket=>{
  const token=socket.data.token;clients.set(socket.id,{token,socket,notices:new Set()});socket.emit('session',{token});
  void run(()=>{}).catch(()=>socket.emit('notice','联机存储暂时不可用，正在重试'));
  let budget=20,lastRefill=Date.now();
  socket.on('command',(message,ack)=>{
   if(typeof ack!=='function')return;
   const now=Date.now();budget=Math.min(20,budget+(now-lastRefill)/250);lastRefill=now;if(budget<1){ack({ok:false,error:'操作过快，请稍后重试'});return;}budget--;
   void run(m=>m.command(token,socket.id,message)).then(ack).catch(()=>ack({ok:false,error:'操作尚未确认，请恢复连接后检查进度'}));
  });
  socket.on('disconnect',()=>{clients.delete(socket.id);void run(m=>m.disconnect(token,socket.id)).catch(()=>{});});
 });
 const interval=setInterval(()=>{
  const now=Date.now(),active=[...clients.values()].some(c=>c.active);
  if(closed||polling||!clients.size||now<retryAfter||now-lastPoll<(active?pollMs:idlePollMs))return;polling=true;lastPoll=now;
  const heartbeat=now-lastHeartbeat>=10000;if(heartbeat)lastHeartbeat=now;
  void run(m=>{if(heartbeat)for(const [id,c]of clients)m.heartbeat(c.token,id);}).then(()=>{pollFailures=0;retryAfter=0;}).catch(()=>{retryAfter=Date.now()+Math.min(60000,2000*2**Math.min(5,pollFailures++));for(const c of clients.values())c.socket.emit('notice','联机存储暂不可用，正在重试；已有存档保留');}).finally(()=>{polling=false;});
 },Math.min(pollMs,1000));interval.unref();
 app.get('/api/online-status',(req,res)=>{if(req.headers.origin&&allowed(req)){res.set('Access-Control-Allow-Origin',req.headers.origin);res.vary('Origin');}res.set('Cache-Control','no-store').json({enabled:onlineEnabled,message:onlineEnabled?'实时 PK 已开放':'实时 PK 暂停开放，可继续人机决斗'});});
 app.get('/api/health',async(_,res)=>{if(!onlineEnabled){res.json({ok:true,rules:RULES_VERSION,storage:'disabled',online:false});return;}try{const w=await store.read();res.json({ok:true,rules:RULES_VERSION,storage:store.kind,online:true,rooms:Object.keys(w.rooms).length,games:Object.keys(w.games).length});}catch{res.status(503).json({ok:false});}});
 app.get('/api/cards',(_,res)=>res.json(Object.fromEntries(Object.entries(JSON.parse(readFileSync(path.join(root,'src/cards.json')))).filter(([,c])=>!c.hiddenPool))));
 app.use('/game-assets',express.static(path.join(root,'public/game-assets')));
 // All transitions reconcile persisted deadlines, including after cold starts.
 app.post('/api/duel/tick',async(req,res)=>{if(!env.DUEL_TICK_SECRET||req.headers.authorization!=='Bearer '+env.DUEL_TICK_SECRET){res.sendStatus(401);return;}try{await run(()=>{});res.json({ok:true});}catch{res.sendStatus(503);}});
 return {app,server,io,run,store,async close(){closed=true;clearInterval(interval);await new Promise(resolve=>io.close(resolve));await chain;}};
}
