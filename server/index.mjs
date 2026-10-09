import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {SCENARIOS, RULES_VERSION, createGame, applyAction, autoPass, projectGame, chooseAi, tickGame, finish, DECKS } from './engine.mjs';
import {connectionOutcome} from './connection.mjs';
import {initCollection,collectionView,validateCustom,pull,claimDaily} from './gacha.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const dataDir=process.env.DUEL_DATA_DIR||path.resolve(root,'../../work/duel-runtime');mkdirSync(dataDir,{recursive:true});
const dbFile=path.join(dataDir,'profiles.json');
const stored=existsSync(dbFile)?JSON.parse(readFileSync(dbFile,'utf8')):{};
const profiles=new Map(Object.entries(stored).map(([token,p])=>[token,{...p,socket:null,gameId:null,roomCode:null,queue:null}]));
const games=new Map(),rooms=new Map(),queues=new Map();
function persist(){const data={};for(const [key,p]of profiles)data[key]={name:p.name,wins:p.wins,losses:p.losses,recent:p.recent,cosmetics:p.cosmetics,completed:p.completed,appearance:p.appearance,collection:p.collection,tickets:p.tickets,dust:p.dust,pity:p.pity,drawHistory:p.drawHistory,claimedDate:p.claimedDate,customDeck:p.customDeck};writeFileSync(dbFile+'.tmp',JSON.stringify(data));renameSync(dbFile+'.tmp',dbFile);}
function profileView(p){return {name:p.name,wins:p.wins,losses:p.losses,cosmetics:p.cosmetics,completed:p.completed,appearance:p.appearance||{back:'default',summon:'default',arena:'night'},...collectionView(p)};}
const app=express();const server=createServer(app);const io=new Server(server,{maxHttpBufferSize:16000,pingInterval:5000,pingTimeout:5000});
app.get('/api/health',(_,res)=>res.json({ok:true,rules:RULES_VERSION,rooms:rooms.size,games:games.size}));
app.get('/api/cards',(_,res)=>res.json(Object.fromEntries(Object.entries(JSON.parse(readFileSync(path.join(root,'src/cards.json')))).filter(([,c])=>!c.hiddenPool))));
app.use('/game-assets',express.static(path.join(root,'public/game-assets')));
function viewRoom(p){const room=rooms.get(p.roomCode);return room?{code:room.code,mode:room.mode,arena:room.arena,host:p.token===room.members[0],players:room.members.map(t=>{const m=profiles.get(t);return {name:m.name,deckId:room.decks[t],ready:room.ready[t]||false,isYou:t===p.token};}),created:room.created}:null;}
function update(p){if(!p?.socket?.connected)return;const item=games.get(p.gameId);p.socket.emit('state',{serverNow:Date.now(),profile:profileView(p),queue:p.queue,room:viewRoom(p),game:item?{...projectGame(item.g,item.members.indexOf(p.token)),paused:item.paused,difficulty:item.difficulty,arena:item.arena||'night',disconnected:item.members.filter(t=>t!=='AI'&&!profiles.get(t)?.socket?.connected).length>0}:null});}
function updateRoom(room){for(const t of room.members)update(profiles.get(t));}
function settle(item){if(!item.g.result||item.settled)return;item.settled=true;const {winner}=item.g.result;
 for(let i=0;i<item.members.length;i++){const p=profiles.get(item.members[i]);if(!p)continue;
  if(item.g.mode==='match'&&winner!==null){if(i===winner)p.wins++;else p.losses++;p.recent.push(i===winner?1:0);p.recent=p.recent.slice(-20);if(p.wins+p.losses>=3&&!p.cosmetics.includes('blue_back'))p.cosmetics.push('blue_back');}
  if(i===winner&&item.g.scenario){initCollection(p);if(!p.completed.includes(item.g.scenario)){p.completed.push(item.g.scenario);p.tickets+=item.g.scenario.startsWith('C')?5:3;}const reward={C01:'blue_back',C02:'ice',C03:'violet'}[item.g.scenario];if(reward&&!p.cosmetics.includes(reward))p.cosmetics.push(reward);if(['T01','T02','T03'].every(s=>p.completed.includes(s))&&!p.cosmetics.includes('intro_back'))p.cosmetics.push('intro_back');}
 }persist();
}
function broadcast(item){settle(item);for(const t of item.members)update(profiles.get(t));}
function clearQueue(p){queues.delete(p.token);p.queue=null;}
function leaveRoom(p){const room=rooms.get(p.roomCode);if(!room){p.roomCode=null;return;}
 if(room.gameId&&games.get(room.gameId)?.g.result===null)throw new Error('对局进行中，请先确认投降');
 if(room.members[0]===p.token||room.mode==='match'){rooms.delete(room.code);for(const t of room.members){const member=profiles.get(t);member.roomCode=null;if(t!==p.token)member.socket?.emit('notice',room.mode==='match'?'对手取消准备，匹配房间已关闭':'房主已离开，房间已解散');update(member);}}
 else{room.members=room.members.filter(t=>t!==p.token);delete room.ready[p.token];delete room.decks[p.token];p.roomCode=null;updateRoom(room);}
}
function detach(p){clearQueue(p);const old=games.get(p.gameId);if(old&&!old.g.result){if(old.members.includes('AI')){games.delete(p.gameId);}else{finish(old.g,1-old.members.indexOf(p.token),'对手投降');old.g.version++;broadcast(old);}}p.gameId=null;if(p.roomCode)leaveRoom(p);}
function newRoom(tokens,mode,decks){let code;do{code=String(randomInt(1000000)).padStart(6,'0');}while(rooms.has(code));const room={code,members:tokens,mode,decks:Object.fromEntries(tokens.map((t,i)=>[t,decks[i]])),ready:{},arena:'night',created:Date.now(),gameId:null};rooms.set(code,room);for(const t of tokens){const p=profiles.get(t);p.roomCode=code;clearQueue(p);}return room;}
function startRoom(room){if(room.members.length!==2||!room.members.every(t=>room.ready[t]))throw new Error('双方准备完成后才能开始');
 const g=createGame({mode:room.mode,names:room.members.map(t=>profiles.get(t).name),decks:room.members.map(t=>room.decks[t]),deckLists:room.members.map(t=>deckCards(profiles.get(t),room.decks[t])),timed:true});
 g.active=randomInt(2);
 for(let i=0;i<2;i++)g.players[i].appearance=profileView(profiles.get(room.members[i])).appearance;
 const item={g,members:[...room.members],arena:room.arena,disconnects:{},settled:false,paused:false,nextAI:0};games.set(g.id,item);room.gameId=g.id;for(const t of room.members)profiles.get(t).gameId=g.id;broadcast(item);
}
function findMatch(){const all=[...queues.values()];for(let i=0;i<all.length;i++){const a=all[i],pa=profiles.get(a.token);if(!pa?.socket?.connected)continue;
 for(let j=i+1;j<all.length;j++){const b=all[j],pb=profiles.get(b.token);if(!pb?.socket?.connected)continue;
  const noviceA=pa.wins+pa.losses<10,noviceB=pb.wins+pb.losses<10;
  const ratio=p=>p.recent.length?p.recent.reduce((x,y)=>x+y,0)/p.recent.length:.5;
  if(!(a.expanded||b.expanded)&&(noviceA!==noviceB||Math.abs(ratio(pa)-ratio(pb))>.35))continue;
  const room=newRoom([a.token,b.token],'match',[a.deck,b.deck]);updateRoom(room);return findMatch();
 }}
}
function validateDeck(id,p){if(id==='custom'){if(!p?.customDeck)throw new Error('请先保存一套 40 张自定义卡组');validateCustom(p,p.customDeck);return id;}if(!DECKS.some(d=>d.id===id))throw new Error('未知卡组');return id;}
function deckCards(p,id){validateDeck(id,p);return id==='custom'?[...p.customDeck]:DECKS.find(d=>d.id===id).cards.flatMap(c=>Array(c.count).fill(c.card_id));}
io.on('connection',socket=>{
 const auth=socket.handshake.auth?.token;let p=typeof auth==='string'?profiles.get(auth):null;
 if(!p){const token=randomBytes(32).toString('hex');p={token,name:'决斗者 '+String(profiles.size+1).padStart(2,'0'),wins:0,losses:0,recent:[],cosmetics:['night'],completed:[],socket:null,gameId:null,roomCode:null,queue:null};profiles.set(token,p);persist();}
 p.token ||= auth;
 if(p.socket&&p.socket!==socket)p.socket.disconnect(true);p.socket=socket;const memo=new Map();const item=games.get(p.gameId);if(item){delete item.disconnects[p.token];broadcast(item);}
 socket.emit('session',{token:p.token});update(p);
 socket.on('command',(message,ack)=>{
  const reply=typeof ack==='function'?ack:()=>{};
  if(p.socket!==socket){reply({ok:false,error:'此会话已在另一连接打开'});return;}
  if(!message||typeof message.type!=='string'||typeof message.requestId!=='string'){reply({ok:false,error:'无效请求'});return;}
  if(memo.has(message.requestId)){reply(memo.get(message.requestId));return;}
  let answer,drawResponse;
  try{
   const m=message;
   if(m.type==='profile'){p.name=String(m.name||'决斗者').trim().slice(0,16)||'决斗者';persist();}
   else if(m.type==='draw'){if(p.gameId||p.queue||p.roomCode)throw new Error('请先返回大厅再召唤');drawResponse=pull(p,m.count,m.requestId);persist();}
   else if(m.type==='daily'){claimDaily(p);persist();}
   else if(m.type==='deck-save'){if(p.gameId||p.queue||p.roomCode)throw new Error('请先返回大厅再编辑卡组');p.customDeck=validateCustom(p,m.cards);persist();}
   else if(m.type==='cosmetic'){const allowed={back:['default','blue_back','intro_back'],summon:['default','violet'],arena:['night','ice']};if(!allowed[m.slot]?.includes(m.value)||(m.value!=='default'&&!p.cosmetics.includes(m.value)))throw new Error('外观尚未解锁');p.appearance={...profileView(p).appearance,[m.slot]:m.value};persist();}
   else if(m.type==='practice'){detach(p);const scenario=SCENARIOS.some(s=>s[0]===m.scenario)?m.scenario:null;const difficulty=['easy','normal','hard'].includes(m.difficulty)?m.difficulty:'normal';const g=createGame({mode:scenario?'scenario':'practice',names:[p.name,'AI · '+{easy:'简单',normal:'普通',hard:'困难'}[difficulty]],decks:[validateDeck(m.deck,p),validateDeck(m.opponentDeck||'dark_magician_starter',p)],deckLists:[deckCards(p,m.deck),deckCards(p,m.opponentDeck||'dark_magician_starter')],scenario});g.players[0].appearance=profileView(p).appearance;const item={g,arena:profileView(p).appearance.arena,members:[p.token,'AI'],difficulty,settled:false,paused:false,disconnects:{},nextAI:Date.now()+700};games.set(g.id,item);p.gameId=g.id;}
   else if(m.type==='queue'){detach(p);p.queue={since:Date.now(),expanded:false,deck:validateDeck(m.deck,p)};queues.set(p.token,{...p.queue,token:p.token});findMatch();}
   else if(m.type==='expand'){if(!p.queue)throw new Error('当前不在匹配队列');if(Date.now()-p.queue.since<60000)throw new Error('等待满 60 秒后可扩大范围');p.queue.expanded=true;queues.get(p.token).expanded=true;findMatch();}
   else if(m.type==='cancel'){if(p.queue)clearQueue(p);else if(p.roomCode&&!p.gameId)leaveRoom(p);else if(p.gameId)throw new Error('已进入对局，请使用投降退出');}
   else if(m.type==='create-room'){detach(p);newRoom([p.token],'friend',[validateDeck(m.deck,p)]);}
   else if(m.type==='join-room'){if(typeof m.code!=='string'||!/^\d{6}$/.test(m.code))throw new Error('请输入六位房间码');const room=rooms.get(m.code);if(!room||room.mode!=='friend')throw new Error('房间不存在或已经解散');if(room.members.includes(p.token))throw new Error('你已在这个房间');if(room.members.length>=2)throw new Error('房间已满');detach(p);room.members.push(p.token);room.decks[p.token]=validateDeck(m.deck,p);room.ready[p.token]=false;p.roomCode=room.code;updateRoom(room);}
   else if(m.type==='room-deck'){const room=rooms.get(p.roomCode);if(!room||p.gameId)throw new Error('当前不能切换卡组');room.decks[p.token]=validateDeck(m.deck,p);room.ready[p.token]=false;updateRoom(room);}
   else if(m.type==='arena'){const room=rooms.get(p.roomCode);if(!room||room.members[0]!==p.token||p.gameId)throw new Error('只有等待中的房主可以选择场景');if(!p.cosmetics.includes(m.arena)||!['night','ice'].includes(m.arena))throw new Error('场景尚未解锁');room.arena=m.arena;room.ready={};updateRoom(room);}
   else if(m.type==='ready'){const room=rooms.get(p.roomCode);if(!room||p.gameId)throw new Error('房间不可准备');room.ready[p.token]=!room.ready[p.token];if(room.mode==='match'&&room.members.length===2&&room.members.every(t=>room.ready[t]))startRoom(room);else updateRoom(room);}
   else if(m.type==='start-room'){const room=rooms.get(p.roomCode);if(!room||room.members[0]!==p.token||p.gameId)throw new Error('只有房主可以开始');startRoom(room);}
   else if(m.type==='action'){const item=games.get(p.gameId);if(!item)throw new Error('对局不存在');if(item.paused)throw new Error('请先继续练习');if(m.version!==item.g.version)throw new Error('局面已更新，请重新选择操作');const index=item.members.indexOf(p.token);applyAction(item.g,index,m.action);autoPass(item.g);broadcast(item);}
   else if(m.type==='pause'){const item=games.get(p.gameId);if(!item||!item.members.includes('AI')||item.g.result)throw new Error('仅进行中的人机局支持暂停');item.paused=!item.paused;broadcast(item);}
   else if(m.type==='leave'){detach(p);}
   else if(m.type==='rematch'){const item=games.get(p.gameId);if(item&&!item.g.result)throw new Error('本局尚未结束');p.gameId=null;const room=rooms.get(p.roomCode);if(room){room.gameId=null;room.ready={};for(const t of room.members)profiles.get(t).gameId=null;updateRoom(room);}}
   else throw new Error('未知操作');
   answer={ok:true,...(drawResponse?{draw:drawResponse}:{})};update(p);
  }catch(error){answer={ok:false,error:error.message};update(p);}
  memo.set(message.requestId,answer);if(memo.size>500)memo.delete(memo.keys().next().value);reply(answer);
 });
 socket.on('disconnect',()=>{if(p.socket!==socket)return;clearQueue(p);const item=games.get(p.gameId);if(item&&!item.g.result){item.disconnects[p.token]=Date.now();broadcast(item);}else if(p.roomCode){p.disconnectedAt=Date.now();}p.socket=null;});
});

setInterval(()=>{
 const now=Date.now();
 for(const item of games.values()){
  if(item.g.result||item.paused)continue;
  let changed=tickGame(item.g,now);
  const disconnected=connectionOutcome(item.members,item.disconnects,now);
  if(!item.g.result&&disconnected){finish(item.g,disconnected.winner,disconnected.reason);item.g.version++;changed=true;}
  if(!item.g.result&&item.members[1]==='AI'&&now>=item.nextAI){const aiTurn=item.g.window?item.g.window.responder===1:item.g.active===1;if(aiTurn){const a=chooseAi(item.g,1,item.difficulty);if(a){applyAction(item.g,1,a,now);autoPass(item.g,now);changed=true;}item.nextAI=now+650;}}
  if(changed)broadcast(item);
 }
 for(const room of [...rooms.values()]){
  if(room.gameId)continue;
  if(room.mode==='match'&&now-room.created>60000){rooms.delete(room.code);for(const t of room.members){const p=profiles.get(t);p.roomCode=null;p.socket?.emit('notice','准备超时，匹配房间已取消');update(p);}}
  else for(const t of [...room.members]){const p=profiles.get(t);if(!p.socket?.connected&&p.disconnectedAt&&now-p.disconnectedAt>60000)leaveRoom(p);}
 }
},150).unref();

if(process.env.NODE_ENV==='production'){
 app.use(express.static(path.join(root,'dist/game')));app.get('/',(_,res)=>res.redirect('/game.html'));
}else{
 const {createServer}=await import('vite');const vite=await createServer({root,configFile:path.join(root,'vite.config.ts'),server:{middlewareMode:true},appType:'mpa'});app.use(vite.middlewares);
}
const port=Number(process.env.PORT||5175);const host=process.env.HOST||'127.0.0.1';server.listen(port,host,()=>console.log(`DUEL_URL=http://${host}:${port}/game.html`));
