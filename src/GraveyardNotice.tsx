import {useEffect,useRef,useState} from 'react';
import {Stack,X,ArrowRight} from '@phosphor-icons/react';
import {publicPileMoves,type PublicPileMove} from './graveyardModel';
/** Public movement identity survives its optional visual effect and can be revisited. */
export default function GraveyardNotice({game,catalog,onRead,compact=false}:{game:any,catalog:Record<string,any>,onRead:(id:string)=>void,compact?:boolean}){
 const previous=useRef(game),[batch,setBatch]=useState<PublicPileMove[]>([]),[history,setHistory]=useState<PublicPileMove[]>([]),[expanded,setExpanded]=useState(false);
 useEffect(()=>{
  const before=previous.current;previous.current=game;
  if(before.id!==game.id){setBatch([]);setHistory([]);setExpanded(false);return;}
  const added=publicPileMoves(before,game);if(!added.length)return;
  setBatch(added);setHistory(old=>[...added].reverse().concat(old).slice(0,10));setExpanded(false);
 },[game]);
 useEffect(()=>{if(!batch.length)return;const timer=setTimeout(()=>setBatch([]),5500);return()=>clearTimeout(timer);},[batch]);
 if(!history.length)return null;
 const shown=batch.length?batch:expanded?history:[],side=(p:number)=>p===game.you?'我方':'对方';
 return <aside className={'pile-feedback'+(compact?' is-compact':'')} aria-label="墓地与除外记录">
  {shown.length>0&&!compact&&<section className="pile-feedback-card"><header><span><Stack size={15}/>{batch.length?'卡牌去向':'最近记录'}</span><button aria-label="收起墓地去向提示" onClick={()=>{setBatch([]);setExpanded(false);}}><X size={16}/></button></header><div className="pile-feedback-list">{shown.slice(0,batch.length?3:8).map((move,i)=>{const def=catalog[move.id];return def?<button key={move.uid+':'+i} onClick={()=>onRead(move.id)}><img src={def.face} alt="" draggable={false}/><span><small className={move.area}>{side(move.player)}{move.area==='grave'?'墓地':'除外区'}</small><b>{def.name}</b></span><ArrowRight size={14}/></button>:null;})}</div>{batch.length>3&&<small className="pile-feedback-more">本次共 {batch.length} 张 · 展开记录查看</small>}</section>}
  <button className="pile-history-button" aria-expanded={expanded||batch.length>0} onClick={()=>{setBatch([]);setExpanded(v=>!v);}}><Stack size={15}/><span>墓地记录</span><b>{history.length}</b></button>
 </aside>;
}
