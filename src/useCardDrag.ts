import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent,type RefObject} from 'react';
import {actionsAtDrop,cardDropSites,dragStillCurrent,type ArenaDropApi,type CardDrag,type DropPoint,type DropSite} from './cardDrop';

type Session={uid:string,id:string,version:number,origin:DropPoint,start:DropPoint,pointerId:number,element:HTMLButtonElement,active:boolean,keyboard?:boolean,index?:number};
export function useCardDrag({game,position,busy,connected,arena,onStart,onDrop,onCancel}:{game:any,position:string,busy:boolean,connected:boolean,arena:RefObject<ArenaDropApi|null>,onStart:()=>void,onDrop:(uid:string,actions:any[],site:DropSite,version:number)=>void,onCancel:(text:string)=>void}){
 const [drag,setDrag]=useState<CardDrag|null>(null),session=useRef<Session|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),suppressClick=useRef<string|null>(null);
 const latest=useRef({game,position,busy,connected,onStart,onDrop,onCancel});latest.current={game,position,busy,connected,onStart,onDrop,onCancel};
 function clear(){session.current=null;setDrag(null);if(timer.current){clearTimeout(timer.current);timer.current=null;}}
 function valid(s:Session){const l=latest.current;return l.connected&&!l.busy&&dragStillCurrent(l.game,s);}
 function hit(point:DropPoint){const element=document.elementFromPoint(point.x,point.y);if(element?.closest('[data-drop-activate]'))return {type:'activate'} as DropSite;return arena.current?.hitTest(point.x,point.y)||null;}
 function move(point:DropPoint,site?:DropSite|null){const s=session.current;if(!s||!valid(s))return;const l=latest.current,target=site===undefined?hit(point):site;
  setDrag({uid:s.uid,...point,site:target,valid:actionsAtDrop(l.game,s.uid,target,l.position).length>0,keyboard:s.keyboard});
 }
 function cancel(message='',animate=true){const s=session.current;session.current=null;if(s?.active){suppressClick.current=s.uid;if(animate){setDrag(current=>current?{...current,...s.origin,site:null,valid:false,returning:true}:null);timer.current=setTimeout(()=>{setDrag(null);timer.current=null;},260);}else setDrag(null);}else setDrag(null);if(message)latest.current.onCancel(message);}
 function release(point?:DropPoint,site?:DropSite|null){const s=session.current;if(!s)return;
  if(!s.active){session.current=null;return;}suppressClick.current=s.uid;
  if(!valid(s)){cancel('局面已变化，卡牌已回到手牌');return;}
  const l=latest.current,target=site===undefined?(point?hit(point):null):site,actions=actionsAtDrop(l.game,s.uid,target,l.position);
  if(!target||!actions.length){cancel('未放入合法区域，卡牌已回到手牌');return;}
  clear();l.onDrop(s.uid,actions,target,s.version);
 }
 function pointerDown(uid:string,event:ReactPointerEvent<HTMLButtonElement>){const l=latest.current;if(event.button!==0||!event.isPrimary||l.busy||!l.connected||!l.game||l.game.paused||l.game.result||session.current)return;
  if(timer.current){clearTimeout(timer.current);timer.current=null;}setDrag(null);suppressClick.current=null;
  const rect=event.currentTarget.getBoundingClientRect();session.current={uid,id:l.game.id,version:l.game.version,origin:{x:rect.left+rect.width/2,y:rect.top+rect.height*.8},start:{x:event.clientX,y:event.clientY},pointerId:event.pointerId,element:event.currentTarget,active:false};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function pointerMove(event:ReactPointerEvent<HTMLButtonElement>){const s=session.current;if(!s||s.keyboard||s.pointerId!==event.pointerId)return;
  if(!valid(s)){cancel('局面已变化，卡牌已回到手牌');return;}
  const point={x:event.clientX,y:event.clientY};if(!s.active){if(Math.hypot(point.x-s.start.x,point.y-s.start.y)<8)return;s.active=true;latest.current.onStart();}
  event.preventDefault();move(point);
 }
 function pointerUp(event:ReactPointerEvent<HTMLButtonElement>){const s=session.current;if(!s||s.keyboard||s.pointerId!==event.pointerId)return;
  const active=s.active;release({x:event.clientX,y:event.clientY});if(active)event.preventDefault();
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function keyboardStart(uid:string,element:HTMLButtonElement){const l=latest.current,sites=cardDropSites(l.game,uid,l.position);if(!sites.length||l.busy||!l.connected)return;
  const rect=element.getBoundingClientRect();session.current={uid,id:l.game.id,version:l.game.version,origin:{x:rect.left+rect.width/2,y:rect.top+rect.height*.8},start:{x:rect.left,y:rect.top},pointerId:-1,element,active:true,keyboard:true,index:0};suppressClick.current=uid;l.onStart();
  setDrag({uid,...session.current.origin,site:sites[0],valid:true,keyboard:true});
  requestAnimationFrame(()=>{if(session.current?.uid!==uid||!session.current.keyboard)return;const center=sites[0].type==='activate'?activationCenter():arena.current?.center(sites[0]);if(center)move(center,sites[0]);});
 }
 function activationCenter(){const rect=document.querySelector('[data-drop-activate]')?.getBoundingClientRect();return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;}
 useEffect(()=>{const s=session.current;if(s&&!valid(s))cancel('局面已变化，卡牌已回到手牌');},[game?.id,game?.version,game?.paused,game?.result,connected,busy]);
 useEffect(()=>{
  const blur=()=>cancel('',false);
  const key=(event:KeyboardEvent)=>{const s=session.current;if(!s)return;
   if(event.key==='Escape'){event.preventDefault();cancel();return;}
   if(!s.active||!s.keyboard)return;const l=latest.current,sites=cardDropSites(l.game,s.uid,l.position);
   if(event.key==='Enter'){event.preventDefault();release(undefined,sites[s.index||0]);return;}
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();s.index=((s.index||0)+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+sites.length)%sites.length;
    const site=sites[s.index],center=site.type==='activate'?activationCenter():arena.current?.center(site);if(center)move(center,site);
   }
  };
  window.addEventListener('blur',blur);window.addEventListener('keydown',key);return()=>{window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);if(timer.current)clearTimeout(timer.current);};
 },[]);
 return {drag,sites:drag&&!drag.returning?cardDropSites(game,drag.uid,position):[],bindings:(uid:string)=>({
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>pointerDown(uid,e),onPointerMove:pointerMove,onPointerUp:pointerUp,
  onPointerCancel:()=>cancel(),onLostPointerCapture:()=>{if(session.current?.uid===uid)cancel();},
  onKeyDown:(e:React.KeyboardEvent<HTMLButtonElement>)=>{if(e.key===' '){e.preventDefault();if(!session.current)keyboardStart(uid,e.currentTarget);}},
  onClickCapture:(e:React.MouseEvent<HTMLButtonElement>)=>{if(suppressClick.current===uid){e.preventDefault();e.stopPropagation();suppressClick.current=null;}}
 })};
}
