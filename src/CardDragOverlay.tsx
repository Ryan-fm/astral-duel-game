import {Hand,Sword,Shield,ArrowUp,Check} from '@phosphor-icons/react';
import {actionsAtDrop,type CardDrag} from './cardDrop';
import type {CSSProperties} from 'react';
import './CardDrag.css';

export function CardDragGhost({drag,game,catalog,position,reduced=false}:{drag:CardDrag|null,game:any,catalog:Record<string,any>,position:string,reduced?:boolean}){
 if(!drag||!game)return null;
 const card=game.players[game.you].hand.find((c:any)=>c.uid===drag.uid),d=catalog[card?.id||drag.cardId];if(!d)return null;
 const action=actionsAtDrop(game,drag.uid,drag.site,position)[0],valid=drag.valid&&(!!action||drag.launching);
 const canPlay=actionsAtDrop(game,drag.uid,{type:'play',intent:drag.intent},position).length>0;
 const releaseWord=drag.keyboard?'回车':'松手';
 const hint=drag.returning?'已收回':drag.launching?'出牌':!valid?canPlay?'向上拖出 · 收回取消':'当前不能出牌':action.kind==='set'?`${releaseWord}盖放`:action.kind==='summon'?action.tributes.length?`${releaseWord}选择祭品`:position==='defense'?`${releaseWord}守备盖放`:`${releaseWord}召唤`:action.fusionId?`${releaseWord}选择融合素材`:action.ritualUid?`${releaseWord}选择仪式祭品`:action.targetUid&&drag.site?.type!=='zone'?`${releaseWord}选择目标`:`${releaseWord}发动`;
 const width=window.innerHeight<560?96:Math.min(156,Math.max(110,window.innerWidth*.12));
 const x=Math.max(width/2+12,Math.min(window.innerWidth-width/2-12,drag.x)),y=drag.launching||drag.returning?drag.y:Math.max(width*1185/813*.82+Math.max(86,window.innerHeight*.2)+20,drag.y);
 return <div className={`card-drag-ghost ${valid?'valid':''} ${drag.returning?'returning':''} ${drag.launching?'launching':''} ${reduced?'reduced-motion':''}`} style={{left:x,top:y,'--drag-tilt':`${drag.tilt||0}deg`} as CSSProperties} aria-hidden="true"><img src={d.face} alt="" draggable={false}/><span>{hint}</span><i/></div>;
}
export function CardDragGuide({drag,game,catalog,position,onPosition,hidden}:{drag:CardDrag|null,game:any,catalog:Record<string,any>,position:string,onPosition:(value:string)=>void,hidden:boolean}){
 if(!game||game.window&&!drag||game.result||game.paused||hidden&&!drag)return null;
 const legal=game.legal||[],playing=legal.some((a:any)=>['summon','set','activate'].includes(a.kind)&&game.players[game.you].hand.some((c:any)=>c.uid===a.cardUid));
 if(!playing&&!drag)return null;
 const live=drag&&!drag.returning&&!drag.launching,action=live?actionsAtDrop(game,drag.uid,drag.site,position)[0]:null;
 const canPlay=live&&actionsAtDrop(game,drag.uid,{type:'play',intent:drag.intent},position).length>0;
 const d=drag?.cardId?catalog[drag.cardId]:null;
 return <>
  {live&&canPlay&&drag.area&&<div className={'card-play-area '+(drag.valid?'is-ready':'')} aria-hidden="true" style={{left:drag.area.left,top:drag.area.top,width:drag.area.right-drag.area.left,height:drag.area.bottom-drag.area.top}}><span>{drag.valid?<Check size={16}/>:<ArrowUp size={16}/>}<b>{drag.valid?drag.keyboard?'回车出牌':'松手出牌':'拖出到这里'}</b><small>自动落位</small></span></div>}
  <aside className={'card-drag-guide '+(live?'dragging':'')} aria-label="拖拽出牌指引">
   <div className="drag-guide-heading"><Hand size={18}/><b>{live?d?.name||'拖拽出牌':'拖出手牌'}</b></div>
   {live?<p role="status">{drag.keyboard?'回车出牌 · Esc 收回':drag.valid?action?.kind==='set'?'松手盖放 · 收回取消':'松手出牌 · 收回取消':canPlay?'向上拖出 · 无需对准卡位':'当前不能出牌'}</p>:<div className="drag-position-toggle" aria-label="拖拽召唤表示"><button aria-pressed={position==='attack'} className={position==='attack'?'selected':''} onClick={()=>onPosition('attack')}><Sword size={16}/>攻击</button><button aria-pressed={position==='defense'} className={position==='defense'?'selected':''} onClick={()=>onPosition('defense')}><Shield size={16}/>守备</button></div>}
  </aside>
 </>;
}
