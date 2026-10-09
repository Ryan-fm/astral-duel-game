import {Hand,ArrowUp,Lightning,Sword,Shield} from '@phosphor-icons/react';
import {actionsAtDrop,type CardDrag} from './cardDrop';
import './CardDrag.css';

export function CardDragGhost({drag,game,catalog,position}:{drag:CardDrag|null,game:any,catalog:Record<string,any>,position:string}){
 if(!drag||!game)return null;
 const card=game.players[game.you].hand.find((c:any)=>c.uid===drag.uid),d=catalog[card?.id];if(!d)return null;
 const action=actionsAtDrop(game,drag.uid,drag.site,position)[0],valid=drag.valid&&!!action;
 const hint=drag.returning?'返回手牌':!valid?'拖入高亮区域':action.kind==='set'?'松手盖放':action.kind==='summon'?action.tributes.length?'松手选择祭品':position==='defense'?'松手守备盖放':'松手召唤':action.zone!==undefined?'松手选择复活目标':action.targetUid?'松手发动效果':'松手发动';
 return <div className={`card-drag-ghost ${valid?'valid':''} ${drag.returning?'returning':''}`} style={{left:drag.x,top:drag.y}} aria-hidden="true"><img src={d.face} alt="" draggable={false}/><span>{hint}</span><i/></div>;
}
export function CardDragGuide({drag,game,catalog,position,onPosition,hidden}:{drag:CardDrag|null,game:any,catalog:Record<string,any>,position:string,onPosition:(value:string)=>void,hidden:boolean}){
 if(!game||game.window&&!drag||game.result||game.paused||hidden&&!drag)return null;
 const legal=game.legal||[],playing=legal.some((a:any)=>['summon','set','activate'].includes(a.kind)&&game.players[game.you].hand.some((c:any)=>c.uid===a.cardUid));
 if(!playing&&!drag)return null;
 const card=game.players[game.you].hand.find((c:any)=>c.uid===drag?.uid),d=catalog[card?.id],acts=legal.filter((a:any)=>a.cardUid===drag?.uid);
 const activate=!!drag&&!drag.returning&&acts.some((a:any)=>a.kind==='activate'&&a.zone===undefined);
 return <aside className={'card-drag-guide '+(drag?'dragging':'')} aria-label="拖拽出牌指引">
  <div className="drag-guide-heading"><Hand size={20}/><b>{drag?d?.name||'拖拽出牌':'将手牌拖入战场'}</b></div>
  <p>{drag?drag.keyboard?'方向键切换落点 · 回车放下 · Esc 取消':drag.valid?'落点已锁定，松手即可出牌':acts.length?d?.kind==='monster'?'前排召唤 · 松手完成放置':'后排盖放 · 拖向目标发动':'当前时机不能打出此卡':'轻点查看详情，向上拖动直接出牌'}</p>
  {!drag&&legal.some((a:any)=>a.kind==='summon')&&<div className="drag-position-toggle" aria-label="拖拽召唤表示"><button aria-pressed={position==='attack'} className={position==='attack'?'selected':''} onClick={()=>onPosition('attack')}><Sword size={16}/>攻击召唤</button><button aria-pressed={position==='defense'} className={position==='defense'?'selected':''} onClick={()=>onPosition('defense')}><Shield size={16}/>守备盖放</button></div>}
  {activate&&<div className={'spell-activation-pad '+(drag.valid&&drag.site?.type==='activate'?'is-hovered':'')} data-drop-activate="true"><Lightning size={25}/><b>释放发动</b><small>需要目标时会继续选择</small></div>}
  {!drag&&<small className="drag-keyboard-hint"><ArrowUp size={12}/>拖出手牌 · 放错位置自动回手</small>}
 </aside>;
}
