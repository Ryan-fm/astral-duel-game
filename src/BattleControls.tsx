import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,X,Sword,Lightning,Eye,Clock,Check,Shield,Warning} from '@phosphor-icons/react';
import {attackPreview,battleGuidance,unavailableReason,findVisibleCard} from './battleModel';
import './BattleControls.css';

const keyNames:Record<string,string>={position:'表示形式',zone:'放置区域',tributes:'选择祭品',targetUid:'选择目标'};
export function BattleInspector({game,card,catalog,effectText,kinds,kind,names,selections,action,onKind,onChoice,onExecute,onClose,onZoom,busy,dragToPlay=false,dropConfirmed=false}:{game:any,card:any,catalog:Record<string,any>,effectText?:string,kinds:string[],kind:string,names:Record<string,string>,selections:any[],action:any,onKind:(kind:string)=>void,onChoice:(index:number,value:string)=>void,onExecute:(a:any)=>void,onClose:()=>void,onZoom:()=>void,busy:boolean,dragToPlay?:boolean,dropConfirmed?:boolean}){
 const d=catalog[card?.id],preview=attackPreview(game,action,catalog);
 const label=(key:string,raw:string)=>{
  const value=JSON.parse(raw);
  if(key==='position')return value==='attack'?'攻击表示':kind==='summon'?'盖放守备':'守备表示';
  if(key==='zone')return `${value+1}`;
  const name=(uid:string)=>{const c=findVisibleCard(game,uid);return `${c?.player===game.you?'我方':'对方'} · ${catalog[c?.card.id]?.name||'未知盖牌'}`;};
  if(key==='tributes')return value.length?value.map(name).join(' + '):'无需祭品';
  return value===null?'直接攻击对手':name(value);
 };
 const visibleSelections=selections.filter(s=>!(dragToPlay&&s.key==='zone')&&(!dragToPlay||dropConfirmed||!['tributes','targetUid'].includes(s.key))&&(s.key!=='tributes'||JSON.parse(s.value).length));
 return <aside className="battle-inspector" aria-label="卡牌操作面板">
  <div className="inspector-heading"><span>已选卡牌</span><button className="icon-btn" aria-label="收起卡牌操作" onClick={onClose}><X/></button></div>
  <div className="inspector-card"><button onClick={onZoom} aria-label="放大完整卡面"><img src={d?.face||'/game-assets/card-back.png'} alt={d?.name||'未知盖牌'}/><Eye size={16}/></button><div><small>{d?.kind==='monster'?'怪兽':d?.kind==='spell'?'魔法':d?.kind==='trap'?'陷阱':'隐藏卡牌'}</small><h2>{d?.name||'未知盖牌'}</h2>{d?.kind==='monster'&&<strong>ATK {d.atk+(card?.bonus||0)}<br/>DEF {d.def} · 等级 {d.level}</strong>}</div></div>
  <div className="inspector-scroll">{dropConfirmed&&<div className="drop-locked-note"><Check size={15}/>{action?.zone!==undefined?`已拖入 ${action.zone+1} 号区域 · 完成下方选择`:'已拖出卡牌 · 选择效果目标'}</div>}<p className={'effect-copy '+(!effectText&&d?.kind==='monster'?'standard-monster':'')}>{effectText|| (d?.kind==='monster'?'通常怪兽。按等级进行通常召唤或上级召唤。':'对手盖牌的身份会在翻开后公开。')}</p>
   {kinds.length>0?<>{kinds.length>1&&<div className="inspector-actions">{kinds.map(k=><button key={k} className={kind===k?'selected':''} onClick={()=>onKind(k)}>{names[k]}</button>)}</div>}
   {visibleSelections.map((s:any)=>{const index=selections.indexOf(s);return <div className={'choice-group choice-'+s.key} key={s.key}><div><span>{keyNames[s.key]}</span>{s.key==='targetUid'&&s.options.length>1&&<small>也可直接点场上目标</small>}{s.key==='zone'&&<small>已选 {JSON.parse(s.value)+1} 号</small>}</div><div className="choice-buttons">{s.options.length===1&&s.key!=='zone'?<p className="fixed-choice">{label(s.key,s.value)}</p>:s.options.map((v:string)=><button key={v} className={s.value===v?'selected':''} aria-pressed={s.value===v} onClick={()=>onChoice(index,v)}>{label(s.key,v)}</button>)}</div></div>;})}
   {preview&&<div className={'damage-preview '+preview.tone}><Sword size={16}/><div><b>{preview.text}</b><small>{preview.note}</small></div></div>}
   </>:<div className="unavailable-reason"><Warning size={17}/>{unavailableReason(game,card,catalog)}</div>}
  </div>
  {kinds.length>0&&dragToPlay&&!dropConfirmed&&<div className="drag-placement-note">从下方手牌拖入战场出牌。前排召唤或复活，后排盖放；魔法也可拖向目标直接发动。</div>}
  {kinds.length>0&&(!dragToPlay||dropConfirmed)&&<button className="primary-btn execute-card" aria-label={kind==='summon'?'确认召唤':undefined} disabled={!action||busy||game.paused||!!game.result} onClick={()=>onExecute(action)}>{kind==='attack'?'确认攻击':kind==='summon'?JSON.parse(selections.find(s=>s.key==='position')?.value||'"attack"')==='defense'?'确认盖放':action?.tributes?.length?`解放 ${action.tributes.length} 只 · 召唤`:'确认召唤':names[kind]} <Lightning/></button>}
 </aside>;
}
export function BattleResponse({game,catalog,response,busy,onSelect,onExecute}:{game:any,catalog:Record<string,any>,response:number|null,busy:boolean,onSelect:(uid:string)=>void,onExecute:(a:any)=>void}){
 if(!game.window||game.result)return null;
 const mine=game.window.responder===game.you,acts=(game.legal||[]).filter((a:any)=>a.kind!=='pass'),ids=[...new Set<string>(acts.map((a:any)=>a.cardUid))];
 const source=findVisibleCard(game,game.pending?.uid),sourceName=catalog[source?.card.id]?.name;
 const trigger=game.pending?.kind==='attack'?`${sourceName||'怪兽'}宣告攻击`:game.pending?.kind==='summon'?`${sourceName||'怪兽'}已召唤`:game.pending?.kind==='damage'?`即将受到 ${game.pending.amount||0} 点伤害`:'效果正在发动';
 return <section className={'response-tray '+(mine?'your-response':'')} aria-label="连锁响应" aria-live="polite">
  <div className="response-context"><Lightning size={21}/><div><b>{mine?'你的响应机会':'等待对方响应'}</b><small>{trigger} · 连锁 {game.pending?.chain.length||0}{response!==null&&<span className={response<=5?'urgent':''}><Clock size={12}/> {response}s</span>}</small></div></div>
  {game.pending?.chain.length>0&&<div className="chain-pills">{game.pending.chain.map((c:any,i:number)=><span key={i}>{i+1} · {catalog[c.id]?.name||'卡牌效果'}</span>)}</div>}
  {mine&&<div className="response-options">{ids.map(uid=>{const card=findVisibleCard(game,uid)?.card,d=catalog[card?.id],options=acts.filter((a:any)=>a.cardUid===uid);return <button key={uid} disabled={busy||game.paused} onClick={()=>options.length===1?onExecute(options[0]):onSelect(uid)}><img src={d?.face} alt=""/><span>发动 {d?.name||'效果'}</span><ArrowRight size={15}/></button>;})}<button className="pass-response" disabled={busy||game.paused} onClick={()=>onExecute({kind:'pass'})}>不响应 <ArrowRight size={15}/></button></div>}
 </section>;
}
export function BattlePhaseDock({game,phase,busy,onExecute}:{game:any,phase:any,busy:boolean,onExecute:(a:any)=>void}){
 const [confirm,setConfirm]=useState(false);
 useEffect(()=>setConfirm(false),[game.id,game.version,game.paused]);
 const attackers=new Set(game.legal.filter((a:any)=>a.kind==='attack').map((a:any)=>a.cardUid)).size;
 const unusedNormal=game.legal.some((a:any)=>a.kind==='summon'),warning=game.phase==='battle'&&attackers?`还有 ${attackers} 只怪兽可以攻击`:phase?.phase==='end'&&unusedNormal?'本回合还有通常召唤机会':'';
 const label=phase?.phase==='end'?'结束回合':phase?.phase==='battle'?'进入战斗阶段':'进入主要阶段 2';
 return <div className="action-dock battle-phase-dock"><small>{battleGuidance(game)}</small>{!game.window&&(confirm?<div className="phase-confirm"><b>{warning}</b><button className="soft-btn" onClick={()=>setConfirm(false)}><ArrowLeft/>继续操作</button><button className="primary-btn" disabled={busy||game.paused||!phase} onClick={()=>{setConfirm(false);onExecute(phase);}}>{label}<Check/></button></div>:<button className="primary-btn" disabled={!phase||busy||game.paused||!!game.result} onClick={()=>warning?setConfirm(true):onExecute(phase)}>{label}<ArrowRight/></button>)}</div>;
}
export function BattleFeedback({game,reduced=false}:{game:any,reduced?:boolean}){
 const previous=useRef<{id:string,lp:number[]}|null>(null),[changes,setChanges]=useState<number[]>([0,0]);
 useEffect(()=>{const lp=game.players.map((p:any)=>p.lp);if(previous.current?.id===game.id){setChanges(lp.map((v:number,i:number)=>v-previous.current!.lp[i]));const t=setTimeout(()=>setChanges([0,0]),1500);previous.current={id:game.id,lp};return()=>clearTimeout(t);}previous.current={id:game.id,lp};setChanges([0,0]);},[game.id,game.version]);
 return <div className={'battle-feedback '+(reduced?'reduced':'')} aria-live="polite">{changes.map((v,i)=>v!==0&&<span key={i} className={i===game.you?'own-damage':'opponent-damage'}>{v>0?'+':''}{v} LP</span>)}</div>;
}
export function BattleSummonCue({game,catalog,enabled,skip=0}:{game:any,catalog:Record<string,any>,enabled:boolean,skip?:number}){
 const seen=useRef(new Set<string>()),[card,setCard]=useState<any>(null),event=game.events?.filter((e:any)=>e.type==='summon').at(-1),eventKey=event?(event.eventId||event.id+':'+event.uid):null;
 useEffect(()=>{setCard(null);if(!event||!enabled||seen.current.has(eventKey))return;seen.current.add(eventKey);setCard(catalog[event.id]);const timer=setTimeout(()=>setCard(null),2100);return()=>clearTimeout(timer);},[game.id,eventKey,enabled,skip]);
 // Event identity is separate from the public card definition id.
 return card?<div className="summon-cue" role="status"><small>MONSTER SUMMON</small><b>{card.name}</b><span>ATK {card.atk} · DEF {card.def}</span></div>:null;
}
