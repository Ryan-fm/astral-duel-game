import {randomBytes,randomInt,createHash} from 'node:crypto';
import {SCENARIOS, RULES_VERSION, createGame, applyAction, autoPass, projectGame, chooseAi, tickGame, finish, DECKS } from './engine.mjs';
import {connectionOutcome} from './connection.mjs';
import {recordChallenge,challengeScore,rankProfiles} from './ranking.mjs';
import {initCollection,collectionView,validateCustom,validateExtra,pull,claimDaily} from './gacha.mjs';


export const PRESENCE_MS=20000;
export function createWorld(world,now=Date.now()){
 const profiles=new Map(Object.entries(world.profiles)),games=new Map(Object.entries(world.games)),rooms=new Map(Object.entries(world.rooms)),queues=new Map(Object.entries(world.queues));
 function wire(p){
  p.token ||= [...profiles].find(([,v])=>v===p)?.[0]; p.memo||={};initCollection(p);
  Object.defineProperty(p,'socket',{configurable:true,enumerable:false,value:{get connected(){return !!p.presence&&p.presence.until>now;},emit(event,text){if(event==='notice'){p.notices||=[];p.notices.push({id:randomBytes(8).toString('hex'),text});p.notices=p.notices.slice(-10);}},disconnect(){}}});
 }
 for(const p of profiles.values())wire(p);
 function profileView(p){return {challengeBest:p.challengeBest||{},challengeScore:challengeScore(p),name:p.name,wins:p.wins,losses:p.losses,cosmetics:p.cosmetics,completed:p.completed,appearance:p.appearance||{back:'default',summon:'default',arena:'night'},...collectionView(p)};}
 function flush(){world.profiles=Object.fromEntries(profiles);world.games=Object.fromEntries(games);world.rooms=Object.fromEntries(rooms);world.queues=Object.fromEntries(queues);}
 function restore(saved){for(const [map,key]of [[profiles,'profiles'],[games,'games'],[rooms,'rooms'],[queues,'queues']]){map.clear();for(const entry of Object.entries(saved[key]))map.set(...entry);}for(const p of profiles.values())wire(p);}
function viewRoom(p){const room=rooms.get(p.roomCode);return room?{code:room.code,mode:room.mode,arena:room.arena,host:p.token===room.members[0],players:room.members.map(t=>{const m=profiles.get(t);return {name:m.name,deckId:room.decks[t],ready:room.ready[t]||false,isYou:t===p.token};}),created:room.created}:null;}
function settle(item){if(!item.g.result||item.settled)return;item.settled=true;const {winner}=item.g.result;
 for(let i=0;i<item.members.length;i++){const p=profiles.get(item.members[i]);if(!p)continue;recordChallenge(p,item.g,i);
  if(item.g.mode==='match'&&winner!==null){if(i===winner)p.wins++;else p.losses++;p.recent.push(i===winner?1:0);p.recent=p.recent.slice(-20);if(p.wins+p.losses>=3&&!p.cosmetics.includes('blue_back'))p.cosmetics.push('blue_back');}
  if(i===winner&&item.g.scenario){initCollection(p);if(!p.completed.includes(item.g.scenario)){p.completed.push(item.g.scenario);p.tickets+=item.g.scenario.startsWith('C')?5:3;}const reward={C01:'blue_back',C02:'ice',C03:'violet'}[item.g.scenario];if(reward&&!p.cosmetics.includes(reward))p.cosmetics.push(reward);if(['T01','T02','T03'].every(s=>p.completed.includes(s))&&!p.cosmetics.includes('intro_back'))p.cosmetics.push('intro_back');}
 }
}
function broadcast(item){settle(item);}
function clearQueue(p){queues.delete(p.token);p.queue=null;}
function leaveRoom(p){const room=rooms.get(p.roomCode);if(!room){p.roomCode=null;return;}
 if(room.gameId&&games.get(room.gameId)?.g.result===null)throw new Error('对局进行中，请先确认投降');
 if(room.members[0]===p.token||room.mode==='match'){rooms.delete(room.code);for(const t of room.members){const member=profiles.get(t);member.roomCode=null;if(t!==p.token)member.socket?.emit('notice',room.mode==='match'?'对手取消准备，匹配房间已关闭':'房主已离开，房间已解散');}}
 else{room.members=room.members.filter(t=>t!==p.token);delete room.ready[p.token];delete room.decks[p.token];p.roomCode=null;}
}
function detach(p){clearQueue(p);const old=games.get(p.gameId);if(old&&!old.g.result){if(old.members.includes('AI')){games.delete(p.gameId);}else{finish(old.g,1-old.members.indexOf(p.token),'对手投降');old.g.version++;broadcast(old);}}p.gameId=null;if(p.roomCode)leaveRoom(p);}
function newRoom(tokens,mode,decks){let code;do{code=String(randomInt(1000000)).padStart(6,'0');}while(rooms.has(code));const room={code,members:tokens,mode,decks:Object.fromEntries(tokens.map((t,i)=>[t,decks[i]])),ready:{},arena:profileView(profiles.get(tokens[0])).appearance.arena,created:now,gameId:null};rooms.set(code,room);for(const t of tokens){const p=profiles.get(t);p.roomCode=code;clearQueue(p);}return room;}
function startRoom(room){if(room.members.length!==2||!room.members.every(t=>room.ready[t]))throw new Error('双方准备完成后才能开始');
 const g=createGame({mode:room.mode,names:room.members.map(t=>profiles.get(t).name),decks:room.members.map(t=>room.decks[t]),deckLists:room.members.map(t=>deckCards(profiles.get(t),room.decks[t])),extraLists:room.members.map(t=>deckExtra(profiles.get(t),room.decks[t])),timed:true,now});
 g.active=randomInt(2);
 for(let i=0;i<2;i++)g.players[i].appearance=profileView(profiles.get(room.members[i])).appearance;
 const item={g,members:[...room.members],arena:room.arena,disconnects:{},settled:false,paused:false,nextAI:0};games.set(g.id,item);room.gameId=g.id;for(const t of room.members)profiles.get(t).gameId=g.id;broadcast(item);
}
function findMatch(){const all=[...queues.values()];for(let i=0;i<all.length;i++){const a=all[i],pa=profiles.get(a.token);if(!pa?.socket?.connected)continue;
 for(let j=i+1;j<all.length;j++){const b=all[j],pb=profiles.get(b.token);if(!pb?.socket?.connected)continue;
  const noviceA=pa.wins+pa.losses<10,noviceB=pb.wins+pb.losses<10;
  const ratio=p=>p.recent.length?p.recent.reduce((x,y)=>x+y,0)/p.recent.length:.5;
  if(!(a.expanded||b.expanded)&&(noviceA!==noviceB||Math.abs(ratio(pa)-ratio(pb))>.35))continue;
  const room=newRoom([a.token,b.token],'match',[a.deck,b.deck]);return findMatch();
 }}
}
function validateDeck(id,p){if(id==='custom'){if(!p?.customDeck)throw new Error('请先保存一套 40 张自定义卡组');validateCustom(p,p.customDeck);return id;}if(!DECKS.some(d=>d.id===id))throw new Error('未知卡组');return id;}
function deckCards(p,id){validateDeck(id,p);return id==='custom'?[...p.customDeck]:DECKS.find(d=>d.id===id).cards.flatMap(c=>Array(c.count).fill(c.card_id));}
function deckExtra(p,id){return id==='custom'?validateExtra(p,p.customExtra||[]):[...(DECKS.find(d=>d.id===id)?.extra||[])];}

 function connect(token,id){
  let p=token?profiles.get(token):null;
  if(token&&!p)throw Error('联机身份已失效，请恢复原凭证；不会自动覆盖你的联机存档');
  if(!p){token=randomBytes(32).toString('hex');p={token,name:'决斗者 '+String(profiles.size+1).padStart(2,'0'),wins:0,losses:0,recent:[],cosmetics:['night'],completed:[],gameId:null,roomCode:null,queue:null,memo:{}};profiles.set(token,p);wire(p);}
  p.presence={id,until:now+PRESENCE_MS};delete p.disconnectedAt;
  const item=games.get(p.gameId);if(item)delete item.disconnects[token];
  return token;
 }
 function heartbeat(token,id){const p=profiles.get(token);if(p?.presence?.id===id)p.presence.until=now+PRESENCE_MS;}
 function disconnect(token,id){const p=profiles.get(token);if(!p||p.presence?.id!==id)return;p.presence=null;p.disconnectedAt=now;const item=games.get(p.gameId);if(item&&!item.g.result)item.disconnects[token]=now;}
 function tick(){
  for(const p of profiles.values())if(p.presence&&p.presence.until<=now){const expired=p.presence.until;p.presence=null;p.disconnectedAt=expired;const item=games.get(p.gameId);if(item&&!item.g.result)item.disconnects[p.token]=expired;}
  for(const p of profiles.values())if(p.queue&&!p.socket.connected&&p.disconnectedAt&&now-p.disconnectedAt>=60000)clearQueue(p);
  for(const item of games.values()){
   if(item.g.result||item.paused)continue;
   // Resolve expired events in chronological order, including while every
   // function was asleep. Waking up never resets a response or turn clock.
   for(let n=0;n<64&&!item.g.result;n++){
    const gone=item.members.filter(t=>t!=='AI'&&item.disconnects[t]!==undefined);
    const disconnectAt=gone.length===2?Math.max(...gone.map(t=>item.disconnects[t]+60000)):gone.length===1?item.disconnects[gone[0]]+60000:Infinity;
    const at=Math.min(item.g.deadline||Infinity,item.g.window?.deadline||Infinity,disconnectAt);
    if(at>now)break;
    if(at===disconnectAt){const outcome=connectionOutcome(item.members,item.disconnects,at);if(outcome){finish(item.g,outcome.winner,outcome.reason);item.g.version++;break;}}
    if(!tickGame(item.g,at))break;
   }
   if(!item.g.result&&item.members[1]==='AI'&&now>=item.nextAI){const aiTurn=item.g.window?item.g.window.responder===1:item.g.active===1;if(aiTurn){const a=chooseAi(item.g,1,item.difficulty);if(a){applyAction(item.g,1,a,now);autoPass(item.g,now);}item.nextAI=now+650;}}
   settle(item);
  }
  for(const room of [...rooms.values()]){
   if(room.gameId)continue;
   if(room.mode==='match'&&now-room.created>60000){rooms.delete(room.code);for(const t of room.members){const p=profiles.get(t);p.roomCode=null;p.socket.emit('notice','准备超时，匹配房间已取消');}}
   else for(const t of [...room.members]){const p=profiles.get(t);if(!p.socket.connected&&p.disconnectedAt&&now-p.disconnectedAt>60000)leaveRoom(p);}
  }
  for(const [id,item] of games)if(item.g.result&&!item.members.some(t=>profiles.get(t)?.gameId===id))games.delete(id);
  findMatch();
 }
 function command(token,id,message){
  let p=profiles.get(token);
  if(!p||p.presence?.id!==id)return {ok:false,error:'此会话已在另一连接打开'};
  if(!message||typeof message.type!=='string'||typeof message.requestId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(message.requestId)||['__proto__','constructor','prototype'].includes(message.requestId))return {ok:false,error:'无效请求'};
  const fingerprint=createHash('sha256').update(JSON.stringify(message)).digest('hex'),cached=p.memo[message.requestId];
  if(cached)return cached.fingerprint===fingerprint?cached.answer:{ok:false,error:'请求编号重复，请重新操作'};
  const saved=structuredClone({profiles:Object.fromEntries(profiles),games:Object.fromEntries(games),rooms:Object.fromEntries(rooms),queues:Object.fromEntries(queues)});
  let answer,drawResponse,ranking;
  try{const m=message;
   if(m.type==='leaderboard'){ranking=rankProfiles(profiles.values(),p,m.board===2?2:1);}
   else if(m.type==='profile'){p.name=String(m.name||'决斗者').trim().slice(0,16)||'决斗者';}
   else if(m.type==='draw'){if(p.gameId||p.queue||p.roomCode)throw new Error('请先返回大厅再召唤');drawResponse=pull(p,m.count,m.requestId);}
   else if(m.type==='daily'){claimDaily(p);}
   else if(m.type==='deck-save'){if(p.gameId||p.queue||p.roomCode)throw new Error('请先返回大厅再编辑卡组');const main=validateCustom(p,m.cards),extra=validateExtra(p,m.extra??p.customExtra??[]);p.customDeck=main;p.customExtra=extra;}
   else if(m.type==='cosmetic'){const allowed={back:['default','blue_back','intro_back'],summon:['default','violet'],arena:['night','city','ice']};if(!allowed[m.slot]?.includes(m.value)||(m.value!=='default'&&!(m.slot==='arena'&&['night','city'].includes(m.value))&&!p.cosmetics.includes(m.value)))throw new Error('外观尚未解锁');p.appearance={...profileView(p).appearance,[m.slot]:m.value};}
   else if(m.type==='practice'){detach(p);const scenario=SCENARIOS.some(s=>s[0]===m.scenario)?m.scenario:null;const difficulty=['easy','normal','hard'].includes(m.difficulty)?m.difficulty:'normal';const g=createGame({mode:scenario?'scenario':'practice',names:[p.name,'AI · '+{easy:'简单',normal:'普通',hard:'困难'}[difficulty]],decks:[validateDeck(m.deck,p),validateDeck(m.opponentDeck||'dark_magician_starter',p)],deckLists:[deckCards(p,m.deck),deckCards(p,m.opponentDeck||'dark_magician_starter')],extraLists:[deckExtra(p,m.deck),deckExtra(p,m.opponentDeck||'dark_magician_starter')],scenario});g.players[0].appearance=profileView(p).appearance;const item={g,arena:profileView(p).appearance.arena,members:[p.token,'AI'],difficulty,settled:false,paused:false,disconnects:{},nextAI:now+700};games.set(g.id,item);p.gameId=g.id;}
   else if(m.type==='queue'){validateDeck(m.deck,p);detach(p);p.queue={since:now,expanded:false,deck:validateDeck(m.deck,p)};queues.set(p.token,{...p.queue,token:p.token});findMatch();}
   else if(m.type==='expand'){if(!p.queue)throw new Error('当前不在匹配队列');if(now-p.queue.since<60000)throw new Error('等待满 60 秒后可扩大范围');p.queue.expanded=true;queues.get(p.token).expanded=true;findMatch();}
   else if(m.type==='cancel'){if(p.queue)clearQueue(p);else if(p.roomCode&&!p.gameId)leaveRoom(p);else if(p.gameId)throw new Error('已进入对局，请使用投降退出');}
   else if(m.type==='create-room'){validateDeck(m.deck,p);detach(p);newRoom([p.token],'friend',[validateDeck(m.deck,p)]);}
   else if(m.type==='join-room'){if(typeof m.code!=='string'||!/^\d{6}$/.test(m.code))throw new Error('请输入六位房间码');const room=rooms.get(m.code);if(!room||room.mode!=='friend')throw new Error('房间不存在或已经解散');if(room.members.includes(p.token))throw new Error('你已在这个房间');if(room.members.length>=2)throw new Error('房间已满');detach(p);room.members.push(p.token);room.decks[p.token]=validateDeck(m.deck,p);room.ready[p.token]=false;p.roomCode=room.code;}
   else if(m.type==='room-deck'){const room=rooms.get(p.roomCode);if(!room||p.gameId)throw new Error('当前不能切换卡组');room.decks[p.token]=validateDeck(m.deck,p);room.ready[p.token]=false;}
   else if(m.type==='arena'){const room=rooms.get(p.roomCode);if(!room||room.members[0]!==p.token||p.gameId)throw new Error('只有等待中的房主可以选择场景');if(!['night','city','ice'].includes(m.arena)||(m.arena==='ice'&&!p.cosmetics.includes('ice')))throw new Error('场景尚未解锁');room.arena=m.arena;room.ready={};}
   else if(m.type==='ready'){const room=rooms.get(p.roomCode);if(!room||p.gameId)throw new Error('房间不可准备');room.ready[p.token]=!room.ready[p.token];if(room.mode==='match'&&room.members.length===2&&room.members.every(t=>room.ready[t]))startRoom(room);}
   else if(m.type==='start-room'){const room=rooms.get(p.roomCode);if(!room||room.members[0]!==p.token||p.gameId)throw new Error('只有房主可以开始');startRoom(room);}
   else if(m.type==='action'){const item=games.get(p.gameId);if(!item)throw new Error('对局不存在');if(item.paused)throw new Error('请先继续练习');if(m.version!==item.g.version)throw new Error('局面已更新，请重新选择操作');const index=item.members.indexOf(p.token);applyAction(item.g,index,m.action);autoPass(item.g);broadcast(item);}
   else if(m.type==='pause'){const item=games.get(p.gameId);if(!item||!item.members.includes('AI')||item.g.result)throw new Error('仅进行中的人机局支持暂停');item.paused=!item.paused;broadcast(item);}
   else if(m.type==='leave'){detach(p);}
   else if(m.type==='rematch'){const item=games.get(p.gameId);if(item&&!item.g.result)throw new Error('本局尚未结束');p.gameId=null;const room=rooms.get(p.roomCode);if(room){room.gameId=null;room.ready={};for(const t of room.members)profiles.get(t).gameId=null;}}
   else throw new Error('未知操作');

   answer={ok:true,...(drawResponse?{draw:drawResponse}:{}),...(ranking?{ranking}:{})};
  }catch(error){restore(saved);p=profiles.get(token);answer={ok:false,error:error.message};}
  p.memo[message.requestId]={fingerprint,answer};const keys=Object.keys(p.memo);if(keys.length>500)delete p.memo[keys[0]];
  return answer;
 }
 function view(token){const p=profiles.get(token);if(!p)return null;const item=games.get(p.gameId);return {serverNow:now,profile:profileView(p),storage:{mode:'server',status:'ready',message:'联机存档已保存至服务器'},online:{available:true,active:true},queue:p.queue,room:viewRoom(p),game:item?{...projectGame(item.g,item.members.indexOf(token)),paused:item.paused,difficulty:item.difficulty,arena:item.arena||'night',disconnected:item.members.some(t=>t!=='AI'&&!profiles.get(t)?.socket.connected)}:null};}
 return {connect,heartbeat,disconnect,tick,command,view,flush,profiles};
}
