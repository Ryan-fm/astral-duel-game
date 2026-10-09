import { readFileSync } from 'node:fs';
import { randomUUID, randomInt } from 'node:crypto';

export const CARDS = {...JSON.parse(readFileSync(new URL('../src/cards.json', import.meta.url))),...JSON.parse(readFileSync(new URL('./hidden-cards.json', import.meta.url)))};
export const DECKS = JSON.parse(readFileSync(new URL('./decks.json', import.meta.url)));
export const RULES_VERSION = 'classic-18-v1';
const cnPhase = { main1:'主要阶段 1', battle:'战斗阶段', main2:'主要阶段 2' };
export const attackValue = c => CARDS[c.id].atk + (c.bonus || 0);
const monster = c => c && CARDS[c.id]?.kind === 'monster';
export function instance(id) { return { uid:randomUUID(), id, faceUp:true, position:'attack', bonus:0, summonedTurn:-1, switchedTurn:-1, attacked:false, placedTurn:-1 }; }
const shuffle = array => { for(let i=array.length-1;i>0;i--){const j=randomInt(i+1);[array[i],array[j]]=[array[j],array[i]];} return array; };
const deckFor = id => { const deck=DECKS.find(d=>d.id===id); if(!deck)throw new Error('无效卡组'); return shuffle(deck.cards.flatMap(e=>Array.from({length:e.count},()=>instance(e.card_id)))); };
const blankPlayer = (name,deckId,list) => ({name,deckId,lp:8000,hand:[],deck:list?shuffle(list.map(instance)):deckFor(deckId),grave:[],field:Array(5).fill(null),spells:Array(5).fill(null),normalUsed:false});
export function createGame({id=randomUUID(),mode='practice',names=['决斗者','AI · 黑魔导'],decks=['blue_eyes_starter','dark_magician_starter'],deckLists=[],scenario=null,now=Date.now(),timed=false}={}){
  const g={id,mode,scenario,rulesVersion:RULES_VERSION,version:0,turn:1,active:0,phase:'main1',players:names.map((n,i)=>blankPlayer(n,decks[i],deckLists[i])),window:null,pending:null,log:[],events:[],result:null,deadline:timed?now+120000:null,timed,ownTurns:1};
  for(let i=0;i<g.players.length;i++){const p=g.players[i];for(const c of p.deck)c.owner=i;p.hand=p.deck.splice(0,5);}
  if(scenario)setupScenario(g,scenario,now);
  log(g,'决斗开始 · '+cnPhase[g.phase]);
  return g;
}
function log(g,text){g.log.push({at:Date.now(),text});g.log=g.log.slice(-40);}
function event(g,type,detail={}){const eventId=randomUUID();g.events.push({id:eventId,type,...detail,eventId});g.events=g.events.slice(-12);}
export function finish(g,winner,reason){if(g.result)return;g.result={winner,reason,at:Date.now()};g.window=null;g.pending=null;log(g,reason);event(g,'result',{winner});}
function loseCheck(g){if(g.result)return;for(let i=0;i<2;i++)if(g.players[i].lp<=0){finish(g,1-i,'生命值归零');return;}}
function locate(g,uid){for(let p=0;p<2;p++)for(const area of ['field','spells','hand','grave']){const zone=g.players[p][area].findIndex(c=>c?.uid===uid);if(zone>=0)return {p,area,zone,card:g.players[p][area][zone]};}return null;}
function remove(g,loc){if(['field','spells'].includes(loc.area))g.players[loc.p][loc.area][loc.zone]=null;else g.players[loc.p][loc.area].splice(loc.zone,1);}
function bury(g,uid){const loc=locate(g,uid);if(!loc)return;remove(g,loc);loc.card.faceUp=true;loc.card.bonus=0;g.players[loc.card.owner??loc.p].grave.push(loc.card);event(g,'destroy',{uid,player:loc.p});}
function freeSlots(area){return area.flatMap((c,i)=>c?[]:[i]);}
function combos(list,n){if(!n)return [[]];if(n===1)return list.map(x=>[x]);return list.flatMap((x,i)=>list.slice(i+1).map(y=>[x,y]));}
function targetList(g,area,onlyFace=false){return g.players.flatMap((p,owner)=>p[area].flatMap(c=>c&&(!onlyFace||c.faceUp)?[{owner,uid:c.uid}]:[]));}
function effectActions(g,p,c,source,reactive){
 const me=g.players[p],other=g.players[1-p],def=CARDS[c.id],base={kind:'activate',cardUid:c.uid,source};
 if(source==='hand'&&!freeSlots(me.spells).length)return [];
 if(reactive){
   if(g.window?.speed===3&&!def.counter)return [];
   if(g.pending?.kind==='damage')return [];
   if(def.kind==='spell'&&!def.quick)return [];
   if(source==='hand'&&g.active!==p)return [];
   if(source==='spells'&&c.placedTurn>=g.turn)return [];
 }
 if(def.kind==='trap'){
   if(!reactive||source!=='spells'||c.placedTurn>=g.turn||g.pending?.player===p)return [];
   if(c.id==='trap_hole'&&g.pending?.kind==='summon'){
     const target=locate(g,g.pending.uid);return target?.area==='field'&&target.card.faceUp&&attackValue(target.card)>=1000?[{...base,targetUid:target.card.uid}]:[];
   }
   if(['mirror_force','negate_attack','magic_cylinder'].includes(c.id)&&g.pending?.kind==='attack')return [{...base,targetUid:g.pending.uid}];
   return [];
 }
 if(c.id==='monster_reborn')return targetList(g,'grave').filter(t=>monster(locate(g,t.uid)?.card)).flatMap(t=>freeSlots(me.field).flatMap(zone=>['attack','defense'].map(position=>({...base,targetUid:t.uid,zone,position}))));
 if(c.id==='fissure')return other.field.some(x=>x?.faceUp)?[base]:[];
 if(c.id==='mst')return targetList(g,'spells').filter(t=>t.uid!==c.uid).map(t=>({...base,targetUid:t.uid}));
 if(c.id==='rush_recklessly')return targetList(g,'field',true).map(t=>({...base,targetUid:t.uid}));
 return [];
}
export function legalActions(g,p){
 if(g.result)return [];const me=g.players[p],op=g.players[1-p],actions=[];
 if(g.window){
   if(g.window.responder!==p)return [];
   actions.push({kind:'pass'});
   if(g.pending.kind==='damage'){
     if(g.pending.damaged===p&&g.active!==p&&g.pending.amount>0)for(const c of me.hand)if(c.id==='kuriboh')actions.push({kind:'kuriboh',cardUid:c.uid});
   }else{
     for(const c of me.spells)if(c&&!c.faceUp)actions.push(...effectActions(g,p,c,'spells',true));
     for(const c of me.hand)if(CARDS[c.id].quick)actions.push(...effectActions(g,p,c,'hand',true));
   }return actions;
 }
 if(g.active!==p)return [];
 if(g.phase==='discard')return me.hand.map(c=>({kind:'discard',cardUid:c.uid}));
 if(g.phase==='main1'||g.phase==='main2'){
   if(!me.normalUsed){const occupied=me.field.filter(Boolean).map(c=>c.uid);for(const c of me.hand)if(monster(c)){
     const need=CARDS[c.id].level>=7?2:CARDS[c.id].level>=5?1:0;
     for(const tributes of combos(occupied,need)){
       const zones=me.field.flatMap((x,i)=>!x||tributes.includes(x.uid)?[i]:[]);
       for(const zone of zones)for(const position of ['attack','defense'])actions.push({kind:'summon',cardUid:c.uid,zone,position,tributes});
     }
   }}
   for(const c of me.hand)if(!monster(c)){
     for(const zone of freeSlots(me.spells))actions.push({kind:'set',cardUid:c.uid,zone});
     if(CARDS[c.id].kind==='spell')actions.push(...effectActions(g,p,c,'hand',false));
   }
   for(const c of me.spells)if(c&&!c.faceUp&&CARDS[c.id].kind==='spell'&&(!CARDS[c.id].quick||c.placedTurn<g.turn))actions.push(...effectActions(g,p,c,'spells',false));
   for(const c of me.field)if(c&&c.summonedTurn<g.turn&&c.switchedTurn<g.turn&&!c.attacked)actions.push({kind:'position',cardUid:c.uid});
 }
 if(g.phase==='battle'){
   for(const c of me.hand)if(CARDS[c.id].quick)actions.push(...effectActions(g,p,c,'hand',false));
   for(const c of me.spells)if(c&&!c.faceUp&&CARDS[c.id].quick&&c.placedTurn<g.turn)actions.push(...effectActions(g,p,c,'spells',false));
   for(const c of me.field)if(c?.faceUp&&c.position==='attack'&&!c.attacked){
     const targets=op.field.filter(Boolean);if(!targets.length)actions.push({kind:'attack',cardUid:c.uid,targetUid:null});
     else for(const target of targets)actions.push({kind:'attack',cardUid:c.uid,targetUid:target.uid});
   }
 }
 actions.push({kind:'phase',phase:g.phase==='main1'?(g.turn===1?'end':'battle'):g.phase==='battle'?'main2':'end'});
 if(g.phase==='main1'&&g.turn!==1)actions.push({kind:'phase',phase:'end'});
 return actions;
}
const actionKey=a=>JSON.stringify(Object.fromEntries(Object.entries(a).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,k==='tributes'?[...v].sort():v])));
function openWindow(g,p,now){g.window={responder:p,passes:0,deadline:g.timed?Math.min(now+15000,g.deadline??Infinity):null,speed:2};}
function newPriority(g,p,now,speed=2){g.window={responder:p,passes:0,deadline:g.timed?Math.min(now+15000,g.deadline??Infinity):null,speed};}
function objective(g){
 if(g.result||!g.scenario)return;
 if(g.scenario==='T01'&&g.players[0].field.some(Boolean))finish(g,0,'教学完成：召唤与站位');
 if(g.scenario==='C01'&&g.players[0].field.some(c=>c?.id==='blue_eyes'&&c.faceUp))finish(g,0,'挑战完成：白龙降临');
 if(g.scenario==='C02'&&g.ownTurns>2)finish(g,1,'挑战失败：超过两个我方回合');
}
export function applyAction(g,p,input,now=Date.now()){
 if(g.result)throw new Error('本局已结束');
 if(input.kind==='surrender'){finish(g,1-p,'对手投降');g.version++;return;}
 const action=legalActions(g,p).find(a=>actionKey(a)===actionKey(input));
 if(!action)throw new Error('操作不合法，请检查阶段、祭品、目标与发动时机');
 const me=g.players[p];
 if(action.kind==='pass'){
   g.window.passes++;
   if(g.window.passes>=2)resolvePending(g,now);else{g.window.responder=1-p;g.window.deadline=g.timed?Math.min(now+15000,g.deadline??Infinity):null;}
 }else if(action.kind==='kuriboh'){
   bury(g,action.cardUid);g.pending.prevented=true;log(g,me.name+'发动栗子球：本次战斗伤害归零');resolvePending(g,now);
 }else if(action.kind==='discard'){
   bury(g,action.cardUid);log(g,me.name+'在回合结束时弃牌');if(me.hand.length<=6)endTurn(g,now);
 }else if(action.kind==='summon'){
   const c=locate(g,action.cardUid).card;for(const uid of action.tributes)bury(g,uid);remove(g,locate(g,c.uid));c.faceUp=action.position==='attack';c.position=action.position;c.summonedTurn=g.turn;c.placedTurn=g.turn;me.field[action.zone]=c;me.normalUsed=true;
   log(g,me.name+(c.faceUp?'召唤 '+CARDS[c.id].name:'盖放一只怪兽'));event(g,'summon',{uid:c.uid,player:p,id:c.faceUp?c.id:undefined});
   if(c.faceUp){g.pending={kind:'summon',player:p,uid:c.uid,chain:[]};openWindow(g,1-p,now);}
 }else if(action.kind==='set'){
   const c=locate(g,action.cardUid).card;remove(g,locate(g,c.uid));c.faceUp=false;c.placedTurn=g.turn;me.spells[action.zone]=c;log(g,me.name+'盖放一张魔法／陷阱');
 }else if(action.kind==='position'){
   const c=locate(g,action.cardUid).card,flip=!c.faceUp;c.faceUp=true;c.position=c.position==='attack'?'defense':'attack';c.switchedTurn=g.turn;log(g,CARDS[c.id].name+'切换为'+(c.position==='attack'?'攻击':'守备')+'表示');
   if(flip){g.pending={kind:'summon',player:p,uid:c.uid,chain:[]};openWindow(g,1-p,now);}
 }else if(action.kind==='activate'){
   const loc=locate(g,action.cardUid),c=loc.card;
   if(action.source==='hand'){remove(g,loc);me.spells[freeSlots(me.spells)[0]]=c;}
   c.faceUp=true;const entry={...action,player:p,id:c.id};
   if(!g.pending)g.pending={kind:'effect',player:p,chain:[]};g.pending.chain.push(entry);
   log(g,me.name+'发动 '+CARDS[c.id].name);event(g,'activate',{id:c.id,uid:c.uid,player:p});newPriority(g,1-p,now,CARDS[c.id].counter?3:2);
 }else if(action.kind==='attack'){
   const c=locate(g,action.cardUid).card;c.attacked=true;
   g.pending={kind:'attack',player:p,uid:c.uid,targetUid:action.targetUid,chain:[],cancelled:false};openWindow(g,1-p,now);log(g,CARDS[c.id].name+'宣告攻击');
 }else if(action.kind==='phase'){
   if(action.phase==='end')endTurn(g,now);else{g.phase=action.phase;log(g,cnPhase[g.phase]);}
 }
 loseCheck(g);objective(g);g.version++;
}
function resolveEffect(g,e){
 const me=g.players[e.player],op=g.players[1-e.player];const target=locate(g,e.targetUid);
 if(e.id==='monster_reborn'&&target?.area==='grave'&&!me.field[e.zone]){
   const c=target.card;remove(g,target);c.faceUp=true;c.position=e.position;c.summonedTurn=g.turn;c.attacked=false;c.bonus=0;me.field[e.zone]=c;event(g,'summon',{id:c.id,uid:c.uid,player:e.player});
 }else if(e.id==='fissure'){
   const list=op.field.filter(c=>c?.faceUp).sort((a,b)=>attackValue(a)-attackValue(b));if(list.length)bury(g,list[0].uid);
 }else if(e.id==='mst'&&target?.area==='spells')bury(g,e.targetUid);
 else if(e.id==='rush_recklessly'&&target?.area==='field'&&target.card.faceUp){target.card.bonus+=700;log(g,CARDS[target.card.id].name+'攻击力 +700');}
 else if(e.id==='mirror_force'){for(const c of [...op.field])if(c?.position==='attack')bury(g,c.uid);if(['T03','C03'].includes(g.scenario)&&e.player===0&&me.lp>0)finish(g,0,'完成：陷阱逆转攻击');}
 else if(e.id==='trap_hole'&&target?.area==='field'&&target.card.faceUp&&attackValue(target.card)>=1000)bury(g,e.targetUid);
 else if(['negate_attack','magic_cylinder'].includes(e.id)&&target?.area==='field'){
   g.pending.cancelled=true;if(e.id==='negate_attack')g.phase='main2';else op.lp=Math.max(0,op.lp-attackValue(target.card));
 }
 // Destroying a spell/trap is not negating its already activated effect.
 if(locate(g,e.cardUid)?.area==='spells')bury(g,e.cardUid);
}
function resolvePending(g,now){
 const pending=g.pending;g.window=null;if(!pending)return;
 if(pending.kind==='damage'){
   if(!pending.prevented)g.players[pending.damaged].lp=Math.max(0,g.players[pending.damaged].lp-pending.amount);
   for(const uid of pending.destroy)bury(g,uid);event(g,'attack',{player:pending.player,uid:pending.uid,targetUid:pending.targetUid,damage:pending.prevented?0:pending.amount});
   log(g,'战斗结算：伤害 '+(pending.prevented?0:pending.amount));g.pending=null;loseCheck(g);
   if(!g.result&&g.scenario==='T02')finish(g,0,'教学完成：攻击与伤害');return;
 }
 for(const e of [...pending.chain].reverse()){if(g.result)break;resolveEffect(g,e);loseCheck(g);}
 if(g.result)return;
 if(pending.kind!=='attack'||pending.cancelled){g.pending=null;objective(g);return;}
 const attacker=locate(g,pending.uid),target=locate(g,pending.targetUid);
 if(attacker?.area!=='field'){g.pending=null;return;}
 if(pending.targetUid&&target?.area!=='field'){attacker.card.attacked=false;g.pending=null;log(g,'目标已变化，请重新选择攻击目标');return;}
 const a=attackValue(attacker.card),destroy=[];let amount=0,damaged=1-pending.player;
 if(!pending.targetUid){amount=a;}
 else{
   target.card.faceUp=true;const attack=target.card.position==='attack',b=attack?attackValue(target.card):CARDS[target.card.id].def;
   if(a>b){destroy.push(target.card.uid);amount=attack?a-b:0;}else if(a<b){if(attack)destroy.push(attacker.card.uid);amount=b-a;damaged=pending.player;}else if(attack){destroy.push(attacker.card.uid,target.card.uid);}
 }
 g.pending={kind:'damage',player:pending.player,uid:pending.uid,targetUid:pending.targetUid,amount,damaged,destroy,prevented:false,chain:[]};
 if(amount>0&&damaged!==g.active&&g.players[damaged].hand.some(c=>c.id==='kuriboh'))openWindow(g,damaged,now);else resolvePending(g,now);
}
function endTurn(g,now){
 if(g.players[g.active].hand.length>6){g.phase='discard';log(g,'回合结束：请将手牌弃至 6 张');return;}
 for(const p of g.players)for(const c of p.field)if(c)c.bonus=0;
 g.active=1-g.active;g.turn++;g.phase='main1';g.players[g.active].normalUsed=false;
 for(const c of g.players[g.active].field)if(c)c.attacked=false;
 if(g.active===0)g.ownTurns++;
 const p=g.players[g.active];if(!p.deck.length){finish(g,1-g.active,'牌组耗尽，无法抽牌');return;}
 p.hand.push(p.deck.shift());g.deadline=g.timed?now+120000:null;log(g,p.name+'的回合 · 抽牌／准备 → 主要阶段 1');objective(g);
}
export function autoPass(g,now=Date.now()){
 let count=0;while(g.window&&!g.result&&count++<8){const acts=legalActions(g,g.window.responder);if(acts.length!==1||acts[0].kind!=='pass')break;applyAction(g,g.window.responder,acts[0],now);}
}
export function tickGame(g,now=Date.now()){
 if(g.result)return false;
 if(g.deadline&&now>=g.deadline){finish(g,1-g.active,'回合操作超时');g.version++;return true;}
 if(g.window?.deadline&&now>=g.window.deadline){applyAction(g,g.window.responder,{kind:'pass'},now);autoPass(g,now);return true;}
 return false;
}
export function projectGame(g,p){
 const visible=(c,owner)=>!c?null:owner===p||c.faceUp?{...c}:({uid:c.uid,hidden:true,faceUp:false,position:c.position});
 const players=g.players.map((v,owner)=>({name:v.name,deckId:v.deckId,appearance:v.appearance||{back:'default',summon:'default'},lp:v.lp,handCount:v.hand.length,deckCount:v.deck.length,hand:owner===p?v.hand.map(c=>({...c})):[],grave:v.grave.map(c=>({...c})),field:v.field.map(c=>visible(c,owner)),spells:v.spells.map(c=>visible(c,owner)),normalUsed:v.normalUsed}));
 const exposedIds=new Set(players.flatMap(v=>[...v.hand,...v.field,...v.spells,...v.grave]).filter(Boolean).map(c=>c.id).filter(Boolean));const cardCatalog=Object.fromEntries([...exposedIds].filter(id=>CARDS[id]?.hiddenPool).map(id=>[id,CARDS[id]]));
 return {cardCatalog,id:g.id,mode:g.mode,scenario:g.scenario,rulesVersion:g.rulesVersion,version:g.version,you:p,active:g.active,turn:g.turn,phase:g.phase,deadline:g.deadline,players,window:g.window?{...g.window}:null,pending:g.pending?{kind:g.pending.kind,player:g.pending.player,uid:g.pending.uid,targetUid:g.pending.targetUid,chain:g.pending.chain.map(c=>({id:c.id,player:c.player})),amount:g.pending.amount}:null,log:g.log,events:g.events,result:g.result,legal:legalActions(g,p),serverNow:Date.now()};
}
function setupScenario(g,id,now){
 for(const p of g.players){p.hand=[];p.field=Array(5).fill(null);p.spells=Array(5).fill(null);p.grave=[];p.deck=p.deck.filter(c=>!['mirror_force'].includes(c.id));}
 g.turn=3;g.active=0;g.phase='main1';
 const put=(p,area,zone,id,props={})=>{const c=Object.assign(instance(id),{owner:p,summonedTurn:1,placedTurn:1},props);if(['field','spells'].includes(area))g.players[p][area][zone]=c;else g.players[p][area].push(c);return c;};
 if(id==='T01'){put(0,'hand',0,'celtic_guardian');}
 if(id==='C01'){put(0,'field',0,'celtic_guardian');put(0,'field',1,'mystical_elf');put(0,'hand',0,'blue_eyes');}
 if(id==='T02'){g.phase='battle';put(0,'field',0,'blue_eyes');put(1,'field',0,'battle_ox');}
 if(id==='C02'){g.phase='battle';put(0,'field',0,'blue_eyes');put(1,'field',0,'mystical_elf',{position:'defense'});g.players[1].lp=3000;}
 if(['T03','C03'].includes(id)){
   g.active=1;g.phase='battle';const enemy=put(1,'field',0,'blue_eyes'),ally=put(0,'field',0,'dark_magician');put(0,'spells',0,'mirror_force',{faceUp:false});
   if(id==='C03')g.players[0].lp=500;
   enemy.attacked=true;g.pending={kind:'attack',player:1,uid:enemy.uid,targetUid:ally.uid,chain:[],cancelled:false};openWindow(g,0,now);
 }
}
export function chooseAi(g,p,difficulty='normal'){
 const view=projectGame(g,p),acts=view.legal;if(!acts.length)return null;
 if(g.scenario==='C02'&&p===1)return acts.find(a=>a.kind==='pass')||acts.find(a=>a.kind==='phase');
 const me=view.players[p],op=view.players[1-p];
 const find=uid=>[...me.hand,...me.field,...me.spells,...me.grave,...op.field,...op.spells,...op.grave].find(c=>c?.uid===uid);
 const score=a=>{
   const c=find(a.cardUid),def=c?.id?CARDS[c.id]:null,t=find(a.targetUid),td=t?.id?CARDS[t.id]:null;
   if(a.kind==='pass')return -15;
   if(a.kind==='discard')return -(def?.atk||500)/50;
   if(a.kind==='kuriboh')return 120;
   if(a.kind==='activate'){
     if(['mirror_force','magic_cylinder','negate_attack','trap_hole'].includes(c.id))return 100;
     if(c.id==='monster_reborn')return (td?.atk||0)/25+(a.position==='attack'?5:0);
     if(c.id==='fissure')return op.field.some(x=>x?.faceUp)?80:-30;
     if(c.id==='mst')return op.spells.some(x=>x?.uid===a.targetUid)?(t?.faceUp?40:20):-60;
     if(c.id==='rush_recklessly')return me.field.some(x=>x?.uid===a.targetUid)?(g.pending?.kind==='attack'||g.phase==='battle'?55:0):-80;
   }
   if(a.kind==='summon'){
     if(difficulty!=='hard')return def.atk/45-(a.tributes?.length||0)*12+(a.position==='attack'?7:0);
     const resource=(a.tributes||[]).reduce((sum,uid)=>sum+(CARDS[find(uid)?.id]?.atk||0),0);
     const strongest=Math.max(0,...op.field.filter(c=>c?.faceUp).map(c=>CARDS[c.id].atk+(c.bonus||0)));
     const defense=a.position==='defense';
     return def.atk/45-resource/160+(defense?(strongest>def.atk&&def.def>=def.atk?18:-8):7);
   }
   if(a.kind==='set')return def.kind==='trap'?30:8;
   if(a.kind==='position')return c.position==='defense'&&def.atk>=1700?15:-40;
   if(a.kind==='attack'){
     if(!a.targetUid)return 90+def.atk/40;
     const defense=td?(t.position==='attack'?td.atk+(t.bonus||0):td.def):1800;
     const diff=def.atk+(c.bonus||0)-defense;return diff>=0?65+diff/50:-70;
   }
   return -20;
 };
 const ranked=acts.map(a=>({a,value:score(a)+(difficulty==='easy'?Math.random()*50:0)})).sort((a,b)=>b.value-a.value);
 return ranked[0].a;
}
