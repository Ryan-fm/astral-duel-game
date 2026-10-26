import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Camera,ArrowCounterClockwise,Eye,BookOpen,Stack,Gear,SpeakerHigh,SpeakerSlash,Pause,Play,FastForward,Flag,List,X} from '@phosphor-icons/react';

export default function BattleToolDock({view,locked,interacting,paused,online,music,voice,onCamera,onReset,onOpen,onMusic,onPause,onSkip,onSurrender,onExpanded}:{view:string;locked:boolean;interacting:boolean;paused:boolean;online:boolean;music:boolean;voice:ReactNode;onCamera:()=>void;onReset:()=>void;onOpen:(panel:string)=>void;onMusic:()=>void;onPause:()=>void;onSkip:()=>void;onSurrender:()=>void;onExpanded:(open:boolean)=>void}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null);
 useEffect(()=>{if(interacting)setOpen(false);},[interacting]);
 useEffect(()=>{
  onExpanded(open);if(!open)return;
  const frame=requestAnimationFrame(()=>drawer.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  return()=>{cancelAnimationFrame(frame);onExpanded(false);trigger.current?.focus({preventScroll:true});};
 },[open,onExpanded]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 return <>{open&&<button className="studio-tools-scrim" aria-label="收起决斗工具" onClick={close}/>}
  <aside className="battle-tools studio-tool-dock" aria-label="决斗快捷操作">
   <button className="icon-btn camera-toggle" aria-label={view==='tactical'?'切换沉浸视角':'切换战术视角'} title={view==='tactical'?'切换沉浸视角':'切换战术视角'} aria-pressed={view==='tactical'} disabled={locked||open} onClick={onCamera}><Camera/></button>
   {voice}
   {!online&&<button className="icon-btn" title={paused?'继续决斗':'暂停决斗'} aria-label={paused?'继续决斗':'暂停决斗'} disabled={locked} onClick={onPause}>{paused?<Play/>:<Pause/>}</button>}
   <button className="icon-btn studio-more" title="决斗工具" aria-label="打开决斗工具" aria-expanded={open} ref={trigger} disabled={interacting} onClick={()=>setOpen(v=>!v)}>{open?<X/>:<List/>}</button>
   {open&&<section ref={drawer} className="studio-tool-drawer" role="dialog" aria-modal="true" aria-label="决斗工具" onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(drawer.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }}>
    <header><span>决斗工具</span><button className="icon-btn" aria-label="关闭决斗工具" onClick={close}><X size={17}/></button></header>
    <div onClick={event=>{if((event.target as Element).closest('button'))setOpen(false);}}>
     <button disabled={view!=='immersive'||locked} onClick={onReset}><ArrowCounterClockwise/>复位镜头</button>
     <button onClick={()=>onOpen('field')}><Eye/>场上卡牌</button>
     <button onClick={()=>onOpen('log')}><BookOpen/>发动记录</button>
     <button onClick={()=>onOpen('library')}><Stack/>额外与图鉴</button>
     <button onClick={onMusic} aria-pressed={music}>{music?<SpeakerHigh/>:<SpeakerSlash/>}{music?'音乐已开':'音乐已关'}</button>
     <button onClick={()=>onOpen('settings')}><Gear/>游戏设置</button>
     <button onClick={onSkip}><FastForward/>跳过演出</button>
     <button className="studio-surrender" onClick={onSurrender}><Flag/>投降</button>
    </div>
   </section>}
  </aside>
 </>;
}
