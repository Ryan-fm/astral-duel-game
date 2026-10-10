import {useLayoutEffect,useRef,useState,type ButtonHTMLAttributes,type CSSProperties} from 'react';
import {CaretDown,CaretLeft,CaretRight} from '@phosphor-icons/react';
import {handFanLayout} from './handFan';

export default function BattleHand({cards,catalog,legal,selectedUid,dragUid,bindings,onSelect,reduced}:{cards:any[],catalog:Record<string,any>,legal:any[],selectedUid:string|null,dragUid?:string,bindings:(uid:string)=>ButtonHTMLAttributes<HTMLButtonElement>,onSelect:(uid:string)=>void,reduced:boolean}){
 const ref=useRef<HTMLDivElement>(null),[frame,setFrame]=useState({width:600,height:254}),[start,setStart]=useState(0);
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  const measure=()=>setFrame(previous=>element.clientWidth===previous.width&&element.clientHeight===previous.height?previous:{width:element.clientWidth,height:element.clientHeight});
  measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();
 },[]);
 const layout=handFanLayout(frame.width,frame.height,cards.length),selectedIndex=cards.findIndex(card=>card.uid===selectedUid);
 useLayoutEffect(()=>{if(selectedIndex>=0)setStart(previous=>selectedIndex<previous?selectedIndex:selectedIndex>=previous+layout.capacity?selectedIndex-layout.capacity+1:previous);},[selectedIndex,layout.capacity]);
 const offset=Math.min(start,Math.max(0,cards.length-layout.capacity));
 const page=cards.slice(offset,offset+layout.capacity),paged=cards.length>layout.capacity;
 return <div ref={ref} className={'hand-strip hand-fan '+(reduced?'reduced-motion':'')} aria-label="手牌：向上拖动出牌，轻点查看详情，空格键提起" style={{'--fan-card-height':`${layout.cardHeight}px`,'--fan-card-width':`${layout.cardWidth}px`} as CSSProperties}>
  {page.map((card,index)=>{
   const definition=catalog[card.id],pose=layout.cards[index],active=legal.some(a=>a.cardUid===card.uid),selected=card.uid===selectedUid;
   return <button key={card.uid} className={`mini-card hand-fan-card ${definition?.kind||''} ${active?'legal':''} ${selected?'is-selected':''} ${card.uid===dragUid?'is-dragging':''}`} {...bindings(card.uid)} onClick={()=>onSelect(card.uid)} aria-label={`${definition?.name||'未知卡牌'}，手牌 ${offset+index+1} / ${cards.length}`} aria-pressed={selected} style={{'--fan-x':`${pose.x}px`,'--fan-angle':`${pose.angle}deg`,'--fan-rise':`${pose.rise}px`,'--fan-layer':pose.z} as CSSProperties}>
    <img src={definition?.face||'/game-assets/card-back.png'} alt="" draggable={false}/>
    <CaretDown className="hand-selection-caret" aria-hidden="true" weight="fill"/>
   </button>;
  })}
  {paged&&<div className="hand-page-controls"><button aria-label="前一组手牌" disabled={offset===0} onClick={()=>setStart(Math.max(0,offset-layout.capacity))}><CaretLeft size={18}/></button><span>{offset+1}–{offset+page.length} / {cards.length}</span><button aria-label="后一组手牌" disabled={offset+page.length===cards.length} onClick={()=>setStart(Math.min(cards.length-layout.capacity,offset+layout.capacity))}><CaretRight size={18}/></button></div>}
  {!cards.length&&<span className="empty-hand">手牌已用尽</span>}
 </div>;
}
