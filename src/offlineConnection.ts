import {createGame,applyAction,autoPass,projectGame,chooseAi,DECKS,SCENARIOS} from '../server/engine.mjs';
import {initCollection,collectionView,validateCustom,validateExtra,pull,claimDaily} from '../server/gacha.mjs';
import type {GameConnection} from './gameConnection';
import {recordChallenge,challengeScore,rankProfiles} from '../server/ranking.mjs';
export type OfflineOptions={initialProfile?:any,persist?:(profile:any)=>Promise<void>,storageState?:()=>any,subscribe?:(notify:()=>void)=>()=>void,onSettled?:(profile:any,game:any)=>Promise<void>,extra?:(m:any,context:{profile:any,game:any,replace:(p:any)=>void,save:()=>Promise<void>})=>Promise<any>};
const KEY='astral-duel-toy-save-v1';
export function createOfflineConnection(storage:Pick<Storage,'getItem'|'setItem'>=localStorage,options:OfflineOptions={}):GameConnection{
 const listeners=new Map<string,Array<(...args:any[])=>void>>();let connected=true,game:any=null,paused=false,settled=false,difficulty='normal',nextAI=0,gameArena='night';
 let profile:any=options.initialProfile;if(!profile){try{profile=JSON.parse(storage.getItem(KEY)||'null');}catch{}}
 let running=false,settling:Promise<void>|null=null;
 profile={name:'秘藏决斗者',wins:0,losses:0,recent:[],cosmetics:['night'],completed:[],appearance:{back:'default',summon:'default',arena:'night'},...(profile||{})};initCollection(profile);
 const memo=new Map<string,any>(),inflight=new Map<string,Promise<any>>();const emit=(event:string,...args:any[])=>{for(const l of listeners.get(event)||[])l(...args);};
 async function save(){if(options.persist){await options.persist(profile);return;}try{storage.setItem(KEY,JSON.stringify(profile));}catch{throw new Error('无法保存本地进度，请允许此网站使用浏览器存储后重试');}}
 function deck(id:string){if(id==='custom')return validateCustom(profile,profile.customDeck);const d=DECKS.find((d:any)=>d.id===id);if(!d)throw new Error('未知卡组');return d.cards.flatMap((c:any)=>Array(c.count).fill(c.card_id));}
 function extraDeck(id:string){return id==='custom'?validateExtra(profile,profile.customExtra||[]):[...(DECKS.find((d:any)=>d.id===id)?.extra||[])];}
 function settle(){
  if(!game?.result||settled)return;settled=true;let changed=recordChallenge(profile,game,0);
  if(game.result.winner===0&&game.scenario){const id=game.scenario;if(!profile.completed.includes(id)){profile.completed.push(id);profile.tickets+=id.startsWith('C')?5:3;changed=true;}const reward:any={C01:'blue_back',C02:'ice',C03:'violet'};if(reward[id]&&!profile.cosmetics.includes(reward[id]))profile.cosmetics.push(reward[id]);if(['T01','T02','T03'].every(id=>profile.completed.includes(id))&&!profile.cosmetics.includes('intro_back'))profile.cosmetics.push('intro_back');}
  if(changed){const ended=game;settling=save().then(()=>options.onSettled?.(profile,ended)).catch(e=>emit('notice',e.message||'结算进度尚未保存，请在大厅重试同步')).finally(()=>{settling=null;if(connected)update();});}
 }
 function update(){settle();emit('state',{serverNow:Date.now(),profile:{...profile,...collectionView(profile),challengeScore:challengeScore(profile)},storage:options.storageState?.()||{mode:'local',status:'ready',message:'本机存档'},queue:null,room:null,game:game?{...projectGame(game,0),paused,difficulty,arena:gameArena,disconnected:false}:null});}
 async function command(m:any){if(!m||typeof m.requestId!=='string')return {ok:false,error:'无效请求'};if(memo.has(m.requestId))return memo.get(m.requestId);if(running)return {ok:false,error:'上一操作处理中，请稍后再试'};running=true;if(settling)await settling;let answer:any;
  const before=JSON.stringify(profile);
  try{
   let draw:any,extra:any;
   if(options.storageState?.().blocked&&!['cloud-connect','cloud-guest','cloud-import','cloud-sync','leaderboard','rank-join'].includes(m.type))throw Error(options.storageState?.().message||'请先恢复云存档');
   if(m.type==='practice'){const lists=[deck(m.deck),deck(m.opponentDeck||'dark_magician_starter')];const scenario=SCENARIOS.some((s:string[])=>s[0]===m.scenario)?m.scenario:null;difficulty=['easy','normal','hard'].includes(m.difficulty)?m.difficulty:'normal';game=createGame({mode:scenario?'scenario':'practice',names:[profile.name,'AI · '+({easy:'简单',normal:'普通',hard:'困难'} as any)[difficulty]],decks:[m.deck,m.opponentDeck||'dark_magician_starter'],deckLists:lists,extraLists:[extraDeck(m.deck),extraDeck(m.opponentDeck||'dark_magician_starter')],scenario});game.players[0].appearance={...profile.appearance};gameArena=profile.appearance.arena;paused=false;settled=false;nextAI=Date.now()+700;}
   else if(m.type==='action'){if(!game)throw new Error('对局不存在');if(paused)throw new Error('请先继续练习');if(m.version!==game.version)throw new Error('局面已更新，请重新选择操作');applyAction(game,0,m.action);autoPass(game);}
   else if(m.type==='pause'){if(!game||game.result)throw new Error('仅进行中的人机局支持暂停');paused=!paused;}
   else if(m.type==='leave'){game=null;paused=false;}
   else if(m.type==='draw'){if(game)throw new Error('请先返回大厅再召唤');draw=pull(profile,m.count,m.requestId);await save();}
   else if(m.type==='daily'){claimDaily(profile);await save();}
   else if(m.type==='deck-save'){if(game)throw new Error('请先返回大厅再编辑卡组');const main=validateCustom(profile,m.cards),extra=validateExtra(profile,m.extra??profile.customExtra??[]);profile.customDeck=main;profile.customExtra=extra;await save();}
   else if(m.type==='profile'){profile.name=String(m.name||'决斗者').trim().slice(0,16)||'决斗者';await save();}
   else if(m.type==='cosmetic'){const allowed:any={back:['default','blue_back','intro_back'],summon:['default','violet'],arena:['night','city','ice']};if(!allowed[m.slot]?.includes(m.value)||(m.value!=='default'&&!(m.slot==='arena'&&['night','city'].includes(m.value))&&!profile.cosmetics.includes(m.value)))throw new Error('外观尚未解锁');profile.appearance={...profile.appearance,[m.slot]:m.value};await save();}
   else if(m.type==='leaderboard'&&!options.extra){extra={ranking:rankProfiles([profile],profile,m.board===2?2:1)};}
   else if(options.extra&&['cloud-connect','cloud-guest','cloud-import','cloud-sync','leaderboard','rank-join'].includes(m.type)){extra=await options.extra(m,{profile,game,replace:p=>{profile={...profile,...p};initCollection(profile);},save});}
   else throw new Error('Toy 静态试玩版支持人机与召唤；实时 PK 需要另行部署联网服务器');
   answer={ok:true,...(draw?{draw}:{}),...extra};
  }catch(e:any){profile=JSON.parse(before);answer={ok:false,error:e.message};}
  running=false;memo.set(m.requestId,answer);if(memo.size>500)memo.delete(memo.keys().next().value!);update();return answer;
 }
 const unsubscribe=options.subscribe?.(update);
 const timer=setInterval(()=>{if(!connected||running||settling||!game||game.result||paused||Date.now()<nextAI)return;const aiTurn=game.window?game.window.responder===1:game.active===1;if(aiTurn){const a=chooseAi(game,1,difficulty);if(a){applyAction(game,1,a);autoPass(game);update();}nextAI=Date.now()+650;}},150);
 setTimeout(()=>{if(connected){emit('connect');update();}},0);
 return {get connected(){return connected;},auth:{},on(event,listener){listeners.set(event,[...(listeners.get(event)||[]),listener]);return this;},timeout(){return {emitWithAck:async(_event,m)=>{if(inflight.has(m?.requestId))return inflight.get(m.requestId);const promise=command(m);if(m?.requestId)inflight.set(m.requestId,promise);try{return await promise;}finally{inflight.delete(m?.requestId);}}};},disconnect(){connected=false;clearInterval(timer);unsubscribe?.();listeners.clear();}};
}
