import {createGame,applyAction,autoPass,projectGame,chooseAi,DECKS,SCENARIOS} from '../server/engine.mjs';
import {initCollection,collectionView,validateCustom,pull,claimDaily} from '../server/gacha.mjs';
import type {GameConnection} from './gameConnection';
const KEY='astral-duel-toy-save-v1';
export function createOfflineConnection(storage:Pick<Storage,'getItem'|'setItem'>=localStorage):GameConnection{
 const listeners=new Map<string,Array<(...args:any[])=>void>>();let connected=true,game:any=null,paused=false,settled=false,difficulty='normal',nextAI=0;
 let profile:any;try{profile=JSON.parse(storage.getItem(KEY)||'null');}catch{}
 profile={name:'秘藏决斗者',wins:0,losses:0,recent:[],cosmetics:['night'],completed:[],appearance:{back:'default',summon:'default',arena:'night'},...(profile||{})};initCollection(profile);
 const memo=new Map<string,any>();const emit=(event:string,...args:any[])=>{for(const l of listeners.get(event)||[])l(...args);};
 function save(){try{storage.setItem(KEY,JSON.stringify(profile));}catch{throw new Error('无法保存本地进度，请允许此网站使用浏览器存储后重试');}}
 function deck(id:string){if(id==='custom')return validateCustom(profile,profile.customDeck);const d=DECKS.find((d:any)=>d.id===id);if(!d)throw new Error('未知卡组');return d.cards.flatMap((c:any)=>Array(c.count).fill(c.card_id));}
 function settle(){if(!game?.result||settled)return;settled=true;if(game.result.winner===0&&game.scenario){const id=game.scenario;if(!profile.completed.includes(id)){profile.completed.push(id);profile.tickets+=id.startsWith('C')?5:3;}const reward:any={C01:'blue_back',C02:'ice',C03:'violet'};if(reward[id]&&!profile.cosmetics.includes(reward[id]))profile.cosmetics.push(reward[id]);if(['T01','T02','T03'].every(id=>profile.completed.includes(id))&&!profile.cosmetics.includes('intro_back'))profile.cosmetics.push('intro_back');save();}}
 function update(){settle();emit('state',{serverNow:Date.now(),profile:{...profile,...collectionView(profile)},queue:null,room:null,game:game?{...projectGame(game,0),paused,difficulty,arena:profile.appearance.arena,disconnected:false}:null});}
 function command(m:any){if(!m||typeof m.requestId!=='string')return {ok:false,error:'无效请求'};if(memo.has(m.requestId))return memo.get(m.requestId);let answer:any;
  const before=JSON.stringify(profile);
  try{
   let draw:any;
   if(m.type==='practice'){const lists=[deck(m.deck),deck(m.opponentDeck||'dark_magician_starter')];const scenario=SCENARIOS.some((s:string[])=>s[0]===m.scenario)?m.scenario:null;difficulty=['easy','normal','hard'].includes(m.difficulty)?m.difficulty:'normal';game=createGame({mode:scenario?'scenario':'practice',names:[profile.name,'AI · '+({easy:'简单',normal:'普通',hard:'困难'} as any)[difficulty]],decks:[m.deck,m.opponentDeck||'dark_magician_starter'],deckLists:lists,scenario});game.players[0].appearance={...profile.appearance};paused=false;settled=false;nextAI=Date.now()+700;}
   else if(m.type==='action'){if(!game)throw new Error('对局不存在');if(paused)throw new Error('请先继续练习');if(m.version!==game.version)throw new Error('局面已更新，请重新选择操作');applyAction(game,0,m.action);autoPass(game);}
   else if(m.type==='pause'){if(!game||game.result)throw new Error('仅进行中的人机局支持暂停');paused=!paused;}
   else if(m.type==='leave'){game=null;paused=false;}
   else if(m.type==='draw'){if(game)throw new Error('请先返回大厅再召唤');draw=pull(profile,m.count,m.requestId);save();}
   else if(m.type==='daily'){claimDaily(profile);save();}
   else if(m.type==='deck-save'){if(game)throw new Error('请先返回大厅再编辑卡组');profile.customDeck=validateCustom(profile,m.cards);save();}
   else if(m.type==='profile'){profile.name=String(m.name||'决斗者').trim().slice(0,16)||'决斗者';save();}
   else if(m.type==='cosmetic'){const allowed:any={back:['default','blue_back','intro_back'],summon:['default','violet'],arena:['night','ice']};if(!allowed[m.slot]?.includes(m.value)||(m.value!=='default'&&!profile.cosmetics.includes(m.value)))throw new Error('外观尚未解锁');profile.appearance={...profile.appearance,[m.slot]:m.value};save();}
   else throw new Error('Toy 静态试玩版支持人机与召唤；实时 PK 需要另行部署联网服务器');
   answer={ok:true,...(draw?{draw}:{})};
  }catch(e:any){profile=JSON.parse(before);answer={ok:false,error:e.message};}
  memo.set(m.requestId,answer);if(memo.size>500)memo.delete(memo.keys().next().value!);update();return answer;
 }
 const timer=setInterval(()=>{if(!connected||!game||game.result||paused||Date.now()<nextAI)return;const aiTurn=game.window?game.window.responder===1:game.active===1;if(aiTurn){const a=chooseAi(game,1,difficulty);if(a){applyAction(game,1,a);autoPass(game);update();}nextAI=Date.now()+650;}},150);
 setTimeout(()=>{if(connected){emit('connect');update();}},0);
 return {get connected(){return connected;},auth:{},on(event,listener){listeners.set(event,[...(listeners.get(event)||[]),listener]);return this;},timeout(){return {emitWithAck:async(_event,m)=>command(m)};},disconnect(){connected=false;clearInterval(timer);listeners.clear();}};
}
