import {useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,X} from '@phosphor-icons/react';
import {ACTIVATION_HOLD_MS,advanceActivation,collectActivations,restoreActivationFeed} from './activationFeed';

export default function BattleActivationNotice({game,catalog,effectText,onRead,skip=0,reduced=false,interacting=false}:{game:any,catalog:Record<string,any>,effectText:(id:string)=>string,onRead:(id:string)=>void,skip?:number,reduced?:boolean,interacting?:boolean}){
 const [feed,setFeed]=useState(()=>restoreActivationFeed(game,catalog)),[held,setHeld]=useState(false),[historyOpen,setHistoryOpen]=useState(false),previousSkip=useRef(skip);
 useEffect(()=>{setFeed(state=>collectActivations(state,game,catalog));},[game.id,game.events,catalog]);
 useEffect(()=>{setHeld(false);setHistoryOpen(false);},[game.id]);
 useEffect(()=>{
  if(!feed.active||held||game.paused||interacting)return;
  const timer=setTimeout(()=>setFeed(advanceActivation),ACTIVATION_HOLD_MS);return()=>clearTimeout(timer);
 },[feed.active?.key,held,game.paused,interacting]);
 useEffect(()=>{if(previousSkip.current!==skip){previousSkip.current=skip;setFeed(state=>({...state,active:null,queue:[]}));}},[skip]);
 if(feed.gameId!==game.id||!feed.history.length||game.result)return null;
 const read=(id:string)=>{setHeld(false);onRead(id);};
 const event=feed.active,card=event?catalog[event.id]:null,last=feed.history[0],side=(player:number)=>player===game.you?'我方':'对方';
 return <section className={'activation-feed'+(reduced?' reduced':'')+(interacting?' compact':'')} aria-label="公开卡牌发动记录">
  {card&&<div className={'activation-announcement '+card.kind} key={event!.key} onPointerEnter={()=>setHeld(true)} onPointerLeave={()=>setHeld(false)} onFocusCapture={()=>setHeld(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setHeld(false);}}>
   <button className="activation-face" aria-label={`查看${card.name}的卡面和中文说明`} onClick={()=>read(card.id)}><img src={card.face} alt={card.name} draggable={false}/></button>
   <div className="activation-copy"><span className="activation-owner">{side(event!.player)}发动 · {card.kind==='spell'?'魔法卡':card.kind==='monster'?'怪兽效果':'陷阱卡'}</span><strong role="status">{card.name}</strong><p>{effectText(card.id)}</p><button className="activation-read" onClick={()=>read(card.id)}>查看完整说明 <ArrowRight size={15}/></button></div>
   <button className="activation-dismiss" aria-label="收起发动提示" onClick={()=>{setHeld(false);setFeed(advanceActivation);}}><X size={18}/></button>
  </div>}
  <button className="activation-history-toggle" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(value=>!value)}><BookOpen size={17}/><span>发动记录 · {side(last.player)} {catalog[last.id]?.name}</span>{feed.queue.length>0&&<small>+{feed.queue.length}</small>}</button>
  {historyOpen&&<div className="activation-history" aria-label="最近发动的公开卡牌">{feed.history.map(entry=>{const d=catalog[entry.id];return <button key={entry.key} onClick={()=>{setHistoryOpen(false);read(entry.id);}}><img src={d.face} alt=""/><span><small>{side(entry.player)} · {d.kind==='spell'?'魔法':d.kind==='monster'?'怪兽效果':'陷阱'}</small><b>{d.name}</b></span><ArrowRight size={17}/></button>;})}</div>}
 </section>;
}
