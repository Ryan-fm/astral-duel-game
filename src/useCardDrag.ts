import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent,type RefObject} from 'react';
import {actionsAtDrop,automaticPreviewSite,cardDropSites,dragStillCurrent,dropNeedsChoice,isPulledIntoPlay,type ArenaDropApi,type CardDrag,type DropPoint,type DropSite,type PlayArea} from './cardDrop';

type Session={uid:string,cardId:string,id:string,version:number,position:string,intent:'play'|'set',origin:DropPoint,start:DropPoint,height:number,pointerId:number,element:HTMLButtonElement,active:boolean,keyboard?:boolean,index?:number};
export function useCardDrag({game,position,intent='play',intentUid=null,busy,connected,arena,onStart,onDrop,onCancel}:{game:any,position:string,intent?:'play'|'set',intentUid?:string|null,busy:boolean,connected:boolean,arena:RefObject<ArenaDropApi|null>,onStart:()=>void,onDrop:(uid:string,actions:any[],site:DropSite,version:number)=>void,onCancel:(text:string)=>void}){
 const [drag,setDrag]=useState<CardDrag|null>(null),session=useRef<Session|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),suppressClick=useRef<string|null>(null);
 const latest=useRef({game,position,intent,intentUid,busy,connected,onStart,onDrop,onCancel});latest.current={game,position,intent,intentUid,busy,connected,onStart,onDrop,onCancel};
 function stopTimer(){if(timer.current){clearTimeout(timer.current);timer.current=null;}}
 function valid(s:Session){const l=latest.current;return l.connected&&!l.busy&&dragStillCurrent(l.game,s);}
 function areaFor(s:Session):PlayArea{
  const root=s.element.closest('.duel-app')!.getBoundingClientRect();
  return {left:root.left+Math.max(58,root.width*.12),right:root.right-Math.max(78,root.width*.2),top:root.top+Math.max(86,root.height*.2),bottom:root.bottom-s.height*.88-20};
 }
 function hit(s:Session,point:DropPoint){
  if(!isPulledIntoPlay(point,s.start,areaFor(s),Math.min(54,Math.max(28,s.height*.23))))return null;
  const element=document.elementFromPoint(point.x,point.y);
  if(element?.closest('button,a,input,select,textarea,.modal-backdrop,.battle-inspector,.battle-header,.card-drag-guide')&&!element.closest('.field-card-control'))return null;
  const exact=arena.current?.hitTest(point.x,point.y);
  // A player may aim a targeted spell directly. Ordinary summons never require a slot hit.
  if(s.intent!=='set'&&exact?.type==='zone'&&exact.uid&&actionsAtDrop(latest.current.game,s.uid,exact,s.position).some(a=>a.kind==='activate'&&a.targetUid===exact.uid))return exact;
  return {type:'play',intent:s.intent} as DropSite;
 }
 function move(point:DropPoint,site?:DropSite|null){const s=session.current;if(!s||!valid(s))return;
  const target=site===undefined?hit(s,point):site;
  setDrag({uid:s.uid,cardId:s.cardId,intent:s.intent,...point,site:target,area:areaFor(s),valid:actionsAtDrop(latest.current.game,s.uid,target,s.position).length>0,keyboard:s.keyboard,tilt:Math.max(-9,Math.min(9,(point.x-s.start.x)/28))});
 }
 function cancel(message='',animate=true){const s=session.current;session.current=null;stopTimer();
  if(s?.active){suppressClick.current=s.uid;if(animate){setDrag(current=>current?{...current,...s.origin,site:null,valid:false,returning:true}:null);timer.current=setTimeout(()=>{setDrag(null);timer.current=null;},240);}else setDrag(null);}else setDrag(null);
  if(message)latest.current.onCancel(message);
 }
 function release(point?:DropPoint,site?:DropSite|null){const s=session.current;if(!s)return;
  if(!s.active){session.current=null;return;}suppressClick.current=s.uid;
  if(!valid(s)){cancel('局面已变化，卡牌已回到手牌');return;}
  const l=latest.current,target=site===undefined?(point?hit(s,point):null):site,actions=actionsAtDrop(l.game,s.uid,target,s.position);
  if(!target||!actions.length){cancel(target?'当前无法打出此卡':'');return;}
  session.current=null;stopTimer();
  const landing=automaticPreviewSite(l.game,actions),center=dropNeedsChoice(actions,target)?null:arena.current?.center(landing||target);
  setDrag(current=>current?{...current,...(center||point),launching:true,valid:true,site:target}:null);
  timer.current=setTimeout(()=>{setDrag(null);timer.current=null;},240);
  l.onDrop(s.uid,actions,target,s.version);
 }
 function begin(uid:string,element:HTMLButtonElement,start:DropPoint,pointerId:number,keyboard=false){
  const l=latest.current,card=l.game?.players[l.game.you].hand.find((c:any)=>c.uid===uid);if(!card)return null;
  stopTimer();setDrag(null);suppressClick.current=null;const rect=element.getBoundingClientRect();
  const s:Session={uid,cardId:card.id,id:l.game.id,version:l.game.version,position:l.position,intent:!l.intentUid||l.intentUid===uid?l.intent:'play',origin:{x:rect.left+rect.width/2,y:rect.top+rect.height*.82},start,height:element.offsetHeight,pointerId,element,active:keyboard,keyboard,index:0};session.current=s;return s;
 }
 function pointerDown(uid:string,event:ReactPointerEvent<HTMLButtonElement>){const l=latest.current;if(event.button!==0||!event.isPrimary||l.busy||!l.connected||!l.game||l.game.paused||l.game.result||session.current)return;
  begin(uid,event.currentTarget,{x:event.clientX,y:event.clientY},event.pointerId);event.currentTarget.setPointerCapture(event.pointerId);
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
 function keyboardSites(s:Session):DropSite[]{return [{type:'play',intent:s.intent},...cardDropSites(latest.current.game,s.uid,s.position)];}
 function keyboardStart(uid:string,element:HTMLButtonElement){const l=latest.current;if(l.busy||!l.connected||!cardDropSites(l.game,uid,l.position).length)return;
  const rect=element.getBoundingClientRect(),s=begin(uid,element,{x:rect.left+rect.width/2,y:rect.bottom},-1,true);if(!s)return;suppressClick.current=uid;l.onStart();
  requestAnimationFrame(()=>{if(session.current!==s)return;const area=areaFor(s);move({x:(area.left+area.right)/2,y:(area.top+area.bottom)/2},keyboardSites(s)[0]);});
 }
 useEffect(()=>{const s=session.current;if(s&&!valid(s))cancel('局面已变化，卡牌已回到手牌');},[game?.id,game?.version,game?.paused,game?.result,connected,busy]);
 useEffect(()=>{
  const blur=()=>cancel('',false),visibility=()=>{if(document.hidden)cancel('',false);};
  const key=(event:KeyboardEvent)=>{const s=session.current;if(!s)return;
   if(event.key==='Escape'){event.preventDefault();cancel();return;}
   if(!s.active||!s.keyboard)return;const sites=keyboardSites(s);
   if(event.key==='Enter'){event.preventDefault();release(undefined,sites[s.index||0]);return;}
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();s.index=((s.index||0)+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+sites.length)%sites.length;
    const site=sites[s.index],area=areaFor(s),center=arena.current?.center(site)||{x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};move(center,site);
   }
  };
  window.addEventListener('blur',blur);window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);stopTimer();session.current=null;};
 },[]);
 const live=drag&&!drag.returning&&!drag.launching,options=live?actionsAtDrop(game,drag.uid,drag.site||{type:'play',intent:session.current?.intent},session.current?.position||position):[];
 const preview=automaticPreviewSite(game,options),targets=live?cardDropSites(game,drag.uid,position).filter(s=>s.type==='zone'&&s.uid):[];
 return {drag,sites:preview?[preview,...targets]:targets,hoverSite:drag?.valid?(drag.site?.type==='play'?preview:drag.site):null,bindings:(uid:string)=>({
  onPointerDown:(e:ReactPointerEvent<HTMLButtonElement>)=>pointerDown(uid,e),onPointerMove:pointerMove,onPointerUp:pointerUp,
  onPointerCancel:()=>cancel(),onLostPointerCapture:()=>{if(session.current?.uid===uid)cancel();},
  onKeyDown:(e:React.KeyboardEvent<HTMLButtonElement>)=>{if(e.key===' '){e.preventDefault();if(!session.current)keyboardStart(uid,e.currentTarget);}},
  onClickCapture:(e:React.MouseEvent<HTMLButtonElement>)=>{if(suppressClick.current===uid){e.preventDefault();e.stopPropagation();suppressClick.current=null;}}
 })};
}
