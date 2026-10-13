import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,X,Sword,Lightning,Eye,Clock,Check,Shield,Warning} from '@phosphor-icons/react';
import {attackPreview,battleGuidance,unavailableReason,findVisibleCard} from './battleModel';
import {currentChainCard} from './activationFeed';
import './BattleControls.css';
import ActionChoiceGroup from './ActionChoiceGroup';

export function BattleInspector({game,card,catalog,effectText,kinds,kind,names,selections,action,onKind,onChoice,onExecute,onClose,onZoom,busy,dragToPlay=false,dropConfirmed=false}:{game:any,card:any,catalog:Record<string,any>,effectText?:string,kinds:string[],kind:string,names:Record<string,string>,selections:any[],action:any,onKind:(kind:string)=>void,onChoice:(index:number,value:string)=>void,onExecute:(a:any)=>void,onClose:()=>void,onZoom:()=>void,busy:boolean,dragToPlay?:boolean,dropConfirmed?:boolean}){
 const d=catalog[card?.id],preview=attackPreview(game,action,catalog);
 const label=(key:string,raw:string)=>{
  if(!raw)return '请选择';const value=JSON.parse(raw);
  if(key==='position')return value==='attack'?'攻击表示':kind==='summon'?'盖放守备':'守备表示';
  if(key==='fusionId')return catalog[value]?.name||value;
  if(key==='zone')return `${value+1}`;
  const name=(uid:string)=>{const c=findVisibleCard(game,uid);const d=catalog[c?.card.id];return `${c?.area==='hand'?'手牌':c?.area==='field'?'场上':c?.player===game.you?'我方':'对方'} · ${d?.name||'未知盖牌'}${['tributes','materialUids'].includes(key)?` ★${d?.level||0}`:''}`;};
  if(['tributes','materialUids'].includes(key))return value.length?value.map(name).join(' + ')+(key==='tributes'&&action?.ritualUid?`（总等级 ${value.reduce((s:number,uid:string)=>s+(catalog[findVisibleCard(game,uid)?.card.id]?.level||0),0)}）`:''):'无需祭品';
  return value===null?'直接攻击对手':name(value);
 };
 const materialSelection=selections.find(s=>['tributes','materialUids'].includes(s.key)&&s.required),selectedMaterials=JSON.parse(materialSelection?.value||'[]') as string[],materialLevels=selectedMaterials.reduce((sum,uid)=>sum+(catalog[findVisibleCard(game,uid)?.card.id]?.level||0),0);
 const nextChoice=selections.find(s=>s.enabled&&s.required&&!s.complete),choicePrompt:Record<string,string>={targetUid:'请选择目标',tributes:'请选择足够的祭品',materialUids:'请选择融合素材',fusionId:'请选择融合怪兽',ritualUid:'请选择仪式怪兽'};
 const visibleSelections=selections.filter(s=>!(dragToPlay&&s.key==='zone')&&(!dragToPlay||dropConfirmed||!['tributes','targetUid','fusionId','ritualUid','materialUids'].includes(s.key))&&(s.key!=='tributes'||s.options.some((v:string)=>JSON.parse(v).length)));
 return <aside className="battle-inspector" aria-label="卡牌操作面板">
  <div className="inspector-heading"><span>已选卡牌</span><button className="icon-btn" aria-label="收起卡牌操作" onClick={onClose}><X/></button></div>
  <div className="inspector-card"><button onClick={onZoom} aria-label="放大卡面与中文说明"><img src={d?.face||'/game-assets/card-back.png'} alt={d?.name||'未知盖牌'}/><span>放大说明</span></button><div><small>{d?.kind==='monster'?'怪兽':d?.kind==='spell'?'魔法':d?.kind==='trap'?'陷阱':'隐藏卡牌'}</small><h2>{d?.name||'未知盖牌'}</h2>{d?.kind==='monster'&&<strong>ATK {d.atk+(card?.bonus||0)}<br/>DEF {d.def}<span className="inspector-level"> · 等级 {d.level}</span></strong>}</div></div>
  <div className="inspector-scroll">{dropConfirmed&&<div className="drop-locked-note"><Check size={15}/>已拖出卡牌 · 确认目标或素材</div>}{effectText&&<details className="card-effect" key={card?.uid} open><summary>卡牌效果</summary><p className="effect-copy">{effectText}</p></details>}{d?.kind==='spell'&&kind==='set'&&<p className="rule-reminder">{d.quick?'速攻魔法可盖放，但盖放当回合不能发动；下回合起可在合法响应时机使用。':'魔法可以盖放。在主要阶段点选自己的盖牌可发动。'}</p>}{!d&&<p className="effect-copy">盖牌身份尚未公开</p>}
   {kinds.length>0?<>{kinds.length>1&&<div className="inspector-actions">{kinds.map(k=><button key={k} className={kind===k?'selected':''} onClick={()=>onKind(k)}>{names[k]}</button>)}</div>}
   {visibleSelections.map((s:any)=><ActionChoiceGroup key={s.key} selection={s} index={selections.indexOf(s)} game={game} catalog={catalog} label={label} onChoice={onChoice}/>)}
   {preview&&<div className={'damage-preview '+preview.tone} title={preview.note}><Sword size={16}/><div><b>{preview.text}</b><small>{preview.note}</small></div></div>}
   </>:<div className="unavailable-reason"><Warning size={17}/>{unavailableReason(game,card,catalog)}</div>}
  </div>
  {kinds.length>0&&dragToPlay&&!dropConfirmed&&<div className="drag-placement-note">{kind==='set'?'向上拖出，松手盖放':'向上拖出，松手出牌'} · 自动落位</div>}
  {materialSelection&&(!dragToPlay||dropConfirmed)&&<p className="selection-progress" aria-live="polite">{materialSelection.key==='tributes'?'祭品':'素材'} {selectedMaterials.length} 张{selections.some(s=>s.key==='ritualUid')?` · 等级合计 ${materialLevels}`:''} · {materialSelection.complete?'已满足条件':'待选择'}</p>}
  {kinds.length>0&&(!dragToPlay||dropConfirmed)&&<button className="primary-btn execute-card" aria-label={kind==='summon'?'确认召唤':undefined} disabled={!action||busy||game.paused||!!game.result} onClick={()=>onExecute(action)}>{nextChoice?choicePrompt[nextChoice.key]:action?.fusionId?'确认融合召唤':action?.ritualUid?'确认仪式召唤':kind==='attack'?'确认攻击':kind==='summon'?JSON.parse(selections.find(s=>s.key==='position')?.value||'"attack"')==='defense'?'确认盖放':action?.tributes?.length?`解放 ${action.tributes.length} 只 · 召唤`:'确认召唤':names[kind]} <Lightning/></button>}
 </aside>;
}
export function BattleResponse({game,catalog,response,busy,onSelect,onExecute,onRead}:{game:any,catalog:Record<string,any>,response:number|null,busy:boolean,onSelect:(uid:string)=>void,onExecute:(a:any)=>void,onRead:(id:string)=>void}){
 if(!game.window||game.result)return null;
 const mine=game.window.responder===game.you,acts=(game.legal||[]).filter((a:any)=>a.kind!=='pass'),ids=[...new Set<string>(acts.map((a:any)=>a.cardUid))];
 const source=findVisibleCard(game,game.pending?.uid),sourceName=catalog[source?.card.id]?.name,chainSource=currentChainCard(game,catalog);
 const trigger=game.pending?.kind==='attack'?`${sourceName||'怪兽'}宣告攻击`:game.pending?.kind==='summon'?`${sourceName||'怪兽'}已召唤`:game.pending?.kind==='damage'?`即将受到 ${game.pending.amount||0} 点伤害`:'效果正在发动';
 return <section className={'response-tray '+(mine?'your-response':'')} aria-label="连锁响应" aria-live="polite">
  <div className="response-context"><Lightning size={21}/><div><b>{mine?'你的响应机会':'等待对方响应'}</b><small>{trigger} · 连锁 {game.pending?.chain.length||0}{response!==null&&<span className={response<=5?'urgent':''}><Clock size={12}/> {response}s</span>}</small></div></div>
  {chainSource&&<button className={'response-source '+chainSource.card.kind} onClick={()=>onRead(chainSource.card.id)} aria-label={`查看${chainSource.card.name}的卡面和中文说明`}><img src={chainSource.card.face} alt=""/><span><small>{chainSource.player===game.you?'我方':'对方'}发动 · {chainSource.card.kind==='spell'?'魔法':'陷阱'}</small><b>{chainSource.card.name}</b></span><Eye size={18}/></button>}
  {game.pending?.chain.length>1&&<div className="chain-pills">{game.pending.chain.map((c:any,i:number)=><button key={i} onClick={()=>catalog[c.id]&&onRead(c.id)}>{i+1} · {catalog[c.id]?.name||'卡牌效果'}</button>)}</div>}
  {mine&&<div className="response-options"><div className="response-action-list">{ids.map(uid=>{const card=findVisibleCard(game,uid)?.card,d=catalog[card?.id],options=acts.filter((a:any)=>a.cardUid===uid);return <button key={uid} disabled={busy||game.paused} onClick={()=>options.length===1&&!(d?.kind==='spell'&&'targetUid' in options[0])?onExecute(options[0]):onSelect(uid)}><img src={d?.face} alt=""/><span>发动 {d?.name||'效果'}</span><ArrowRight size={15}/></button>;})}</div><button className="pass-response" disabled={busy||game.paused} onClick={()=>onExecute({kind:'pass'})}>不响应 <ArrowRight size={15}/></button></div>}
 </section>;
}
export function BattlePhaseDock({game,phase,busy,onExecute}:{game:any,phase:any,busy:boolean,onExecute:(a:any)=>void}){
 const [confirm,setConfirm]=useState(false);
 useEffect(()=>setConfirm(false),[game.id,game.version,game.paused]);
 const attackers=new Set(game.legal.filter((a:any)=>a.kind==='attack').map((a:any)=>a.cardUid)).size;
 const unusedNormal=game.legal.some((a:any)=>a.kind==='summon'),warning=game.phase==='battle'&&attackers?`还有 ${attackers} 只怪兽可以攻击`:phase?.phase==='end'&&unusedNormal?'本回合还有通常召唤机会':'';
 const label=phase?.phase==='end'?'结束回合':phase?.phase==='battle'?'进入战斗':'主要阶段 2';
 if(game.window||game.result)return null;
 return <div className="action-dock battle-phase-dock" title={battleGuidance(game)}>{game.active!==game.you?<span className="phase-wait"><Clock size={15}/>对手行动中</span>:game.phase==='discard'?<small>{battleGuidance(game)}</small>:null}{game.active===game.you&&!game.window&&(confirm?<div className="phase-confirm"><b>{warning}</b><button className="soft-btn" onClick={()=>setConfirm(false)}><ArrowLeft/>继续操作</button><button className="primary-btn" disabled={busy||game.paused||!phase} onClick={()=>{setConfirm(false);onExecute(phase);}}>{label}<Check/></button></div>:<button className="primary-btn" disabled={!phase||busy||game.paused||!!game.result} onClick={()=>warning?setConfirm(true):onExecute(phase)}>{label}<ArrowRight/></button>)}</div>;
}
export function BattleFeedback({game,reduced=false}:{game:any,reduced?:boolean}){
 const previous=useRef<{id:string,lp:number[]}|null>(null),[changes,setChanges]=useState<number[]>([0,0]);
 useEffect(()=>{const lp=game.players.map((p:any)=>p.lp);if(previous.current?.id===game.id){setChanges(lp.map((v:number,i:number)=>v-previous.current!.lp[i]));const t=setTimeout(()=>setChanges([0,0]),1500);previous.current={id:game.id,lp};return()=>clearTimeout(t);}previous.current={id:game.id,lp};setChanges([0,0]);},[game.id,game.players[0].lp,game.players[1].lp]);
 return <div className={'battle-feedback '+(reduced?'reduced':'')} aria-live="polite">{changes.map((v,i)=>v!==0&&<span key={i} className={i===game.you?'own-damage':'opponent-damage'}>{v>0?'+':''}{v} LP</span>)}</div>;
}
export function BattleSummonCue({game,catalog,enabled,skip=0}:{game:any,catalog:Record<string,any>,enabled:boolean,skip?:number}){
 const seen=useRef(new Set<string>()),[card,setCard]=useState<any>(null),event=game.events?.filter((e:any)=>e.type==='summon').at(-1),eventKey=event?(event.eventId||event.id+':'+event.uid):null;
 useEffect(()=>{setCard(null);if(!event||!enabled||seen.current.has(eventKey))return;seen.current.add(eventKey);setCard({...catalog[event.id],summonType:event.summonType});const timer=setTimeout(()=>setCard(null),2100);return()=>clearTimeout(timer);},[game.id,eventKey,enabled,skip]);
 // Event identity is separate from the public card definition id.
 return card?<div className={"summon-cue "+(card.summonType||'normal')} role="status"><small>{card.summonType==='fusion'?'FUSION SUMMON · 融合召唤':card.summonType==='ritual'?'RITUAL SUMMON · 仪式召唤':'MONSTER SUMMON'}</small><b>{card.name}</b><span>ATK {card.atk} · DEF {card.def}</span></div>:null;
}
