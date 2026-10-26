import {useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,BookOpen,CaretDown,Check,CloudCheck,Gear,List,SpeakerHigh,SpeakerSlash,Sparkle,Stack,Sword,Trophy,Users,X} from '@phosphor-icons/react';
import LobbyShowcase from './LobbyShowcase';
import './DuelLobby.css';

export type DuelLobbyProps={
 profile:any;
 decks:Array<{id:string;name:string;subtitle?:string;description?:string;ace:string;era?:string}>;
 catalog:Record<string,any>;
 deckId:string;
 heroId:string;
 companions:string[];
 connected:boolean;
 busy:boolean;
 blocked:boolean;
 onlineUnavailable:boolean;
 toyArchive:boolean;
 storageMode?:string;
 settings:any;
 progress:{done:number;total:number;nextName:string};
 onDeck:(id:string)=>void;
 onOpen:(panel:string)=>void;
 onMode:(mode:'journey'|'practice'|'pvp')=>void;
 onSettings:(patch:Record<string,any>)=>void;
};

/** A quiet staging area: the cards are the hero, and the next duel is one decision away. */
export default function DuelLobby(props:DuelLobbyProps){
 const {profile,decks,catalog,deckId,heroId,companions,connected,busy,blocked,onlineUnavailable,toyArchive,storageMode,settings,progress,onDeck,onOpen,onMode,onSettings}=props;
 const [drawer,setDrawer]=useState<'decks'|'tools'|null>(null);
 const drawerRef=useRef<HTMLElement|null>(null),returnFocus=useRef<HTMLElement|null>(null);
 const drawerTitle=useId();
 const activeDeck=decks.find(d=>d.id===deckId)||decks[0];
 const hero=catalog[heroId]||catalog[activeDeck?.ace];
 const reduced=settings.reduced===true||settings.effects===false;
 const locked=!connected||busy||blocked;
 const progressValue=progress.total>0?Math.max(0,Math.min(100,progress.done/progress.total*100)):0;
 const archiveLabel=!connected?'正在连接':storageMode==='cloud'?'Toy 云存档':storageMode==='temporary'?'本次试玩':storageMode==='local'?'本机存档':toyArchive?'Toy 账号存档':'决斗存档';
 const openDrawer=(next:'decks'|'tools')=>{returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setDrawer(next);};
 const openPanel=(panel:string)=>{setDrawer(null);onOpen(panel);};

 useEffect(()=>{
  if(!drawer)return;
  const element=drawerRef.current;
  const frame=requestAnimationFrame(()=>element?.querySelector<HTMLElement>('button:not(:disabled)')?.focus());
  return()=>{cancelAnimationFrame(frame);if(document.activeElement===document.body||element?.contains(document.activeElement))returnFocus.current?.focus();};
 },[drawer]);
 function drawerKeys(event:React.KeyboardEvent<HTMLElement>){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setDrawer(null);return;}
  if(event.key!=='Tab')return;
  const focusable=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')||[]);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }

 return <section className={`duel-lobby ${reduced?'is-still':''}`} aria-label="决斗大厅">
  <div className="dl-mural" aria-hidden="true"/><div className="dl-atmosphere" aria-hidden="true"/>
  <header className="dl-header">
   <div className="dl-brand"><span className="dl-crest" aria-hidden="true"><Sword size={26} weight="light"/></span><div><span>YU-GI-OH! · RUINS DUEL</span><h1>游戏王<span>遗迹决斗</span></h1></div></div>
   <div className="dl-account">
    <button className="dl-summon" onClick={()=>onOpen('summon')} disabled={locked} aria-label={`秘藏召唤，召唤券 ${profile?.tickets??0} 张`}><Sparkle size={21}/><span>秘藏召唤</span><b>{profile?profile.tickets??0:'—'}</b></button>
    <button className="dl-profile" onClick={()=>onOpen('profile')} disabled={!profile||blocked} aria-label={`玩家资料 ${profile?.name||'连接中'}`}><img src="/game-assets/duelist-player.png" alt=""/><span><b>{profile?.name||'连接中'}</b><small>{profile?`${profile.wins||0} 胜 · ${profile.losses||0} 负`:'决斗服务连接中'}</small></span></button>
    <button className="dl-square" aria-label="打开大厅菜单" aria-haspopup="dialog" aria-expanded={drawer==='tools'} onClick={()=>openDrawer('tools')}><List size={24}/></button>
   </div>
  </header>

  <div className="dl-stage-label"><span className="dl-engraving">DUEL SANCTUARY</span><span>卡组已就位</span></div>
  {hero&&<LobbyShowcase heroId={heroId} companions={companions.filter(id=>!!catalog[id])} reduced={reduced} onInspect={()=>onOpen('hero')}/>}
  <div className="dl-feature-caption"><span>{activeDeck?.era==='GX'?'GX · 融合之力':'DM · 经典战术'}</span><h2>{hero?.name||'你的决斗王牌'}</h2><button onClick={()=>onOpen('hero')} disabled={!hero} aria-label={`查看${hero?.name||'代表卡'}卡面与详情`}>查看卡面 <ArrowRight size={15}/></button></div>

  <nav className="dl-modes" aria-label="选择游戏模式">
   <div className="dl-modes-heading"><span>下一场决斗</span><i aria-hidden="true"/></div>
   <button className="dl-mode dl-journey" onClick={()=>onMode('journey')} disabled={locked}>
    <span className="dl-mode-art" aria-hidden="true"/><span className="dl-mode-mark" aria-hidden="true">✦</span>
    <span className="dl-mode-copy"><small>SOLO ADVENTURE</small><b>王国试炼</b><span>{progress.done>=progress.total&&progress.total>0?'重温已完成的试炼':progress.nextName||'从第一次召唤开始'}</span></span><ArrowRight className="dl-mode-arrow" size={24}/>
    <span className="dl-progress"><span className="dl-progress-track"><i style={{width:`${progressValue}%`}}/></span><small>{progress.done} / {progress.total}</small></span>
   </button>
   <button className="dl-mode dl-practice" onClick={()=>onMode('practice')} disabled={locked}><Sword className="dl-mode-symbol" size={29} weight="light"/><span className="dl-mode-copy"><b>自由决斗</b><span>选择对手，磨炼你的卡组</span></span><ArrowRight className="dl-mode-arrow" size={21}/></button>
   <button className={`dl-mode dl-pvp ${onlineUnavailable?'is-unavailable':''}`} onClick={()=>onMode('pvp')} disabled={locked}><Users className="dl-mode-symbol" size={29} weight="light"/><span className="dl-mode-copy"><b>玩家对战</b><span>{onlineUnavailable?'联机服务暂未开放':'在线匹配 · 好友切磋'}</span></span><ArrowRight className="dl-mode-arrow" size={21}/></button>
  </nav>

  <section className="dl-deck-bench" aria-label="当前出战卡组">
   <div className="dl-deck-mini" aria-hidden="true"><img src={catalog[activeDeck?.ace]?.face||'/game-assets/card-back.png'} alt="" draggable={false}/></div>
   <div className="dl-deck-name"><small>出战卡组 <span>{activeDeck?.era==='GX'?'GX':activeDeck?.id==='custom'?'CUSTOM':'DM'}</span></small><b title={activeDeck?.name}>{activeDeck?.name||'选择卡组'}</b><span>{activeDeck?.subtitle||'自由组建你的战术'}</span></div>
   <button className="dl-change-deck" disabled={busy||blocked} onClick={()=>openDrawer('decks')}>切换卡组 <CaretDown size={15}/></button>
   <button className="dl-edit-deck" onClick={()=>onOpen('deckEditor')} disabled={!profile||locked}><Stack size={18}/><span>卡组工坊</span><ArrowRight size={16}/></button>
  </section>

  <footer className="dl-status"><button onClick={()=>onOpen('cloud')} disabled={!profile||blocked} aria-label={`账号与存档，${archiveLabel}`}><CloudCheck size={17}/><span>{archiveLabel}</span><i className={connected?'is-connected':''} aria-hidden="true"/></button><button className="dl-square" aria-label={settings.music===false?'开启背景音乐':'关闭背景音乐'} aria-pressed={settings.music!==false} onClick={()=>onSettings({music:settings.music===false})}>{settings.music===false?<SpeakerSlash size={20}/>:<SpeakerHigh size={20}/>}</button></footer>

  {drawer&&<div className="dl-drawer-backdrop" onClick={()=>setDrawer(null)}>
   <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={drawerTitle} className={`dl-drawer dl-drawer-${drawer}`} onClick={event=>event.stopPropagation()} onKeyDown={drawerKeys}>
    <header><div><span>{drawer==='decks'?'DECK ARMORY':'DUELIST ARCHIVE'}</span><h2 id={drawerTitle}>{drawer==='decks'?'选择出战卡组':'决斗者档案'}</h2></div><button className="dl-square" aria-label={drawer==='decks'?'关闭卡组选择':'关闭大厅菜单'} onClick={()=>setDrawer(null)}><X size={22}/></button></header>
    {drawer==='decks'?<><div className="dl-deck-grid">{decks.map(item=><button key={item.id} className={`dl-deck-choice ${item.id===deckId?'is-selected':''}`} aria-pressed={item.id===deckId} disabled={busy||blocked||(item.id==='custom'&&!profile?.customDeck)} onClick={()=>{onDeck(item.id);setDrawer(null);}}><img src={catalog[item.ace]?.face||'/game-assets/card-back.png'} alt="" draggable={false}/><span><small>{item.era==='GX'?'GX':item.id==='custom'?'自由构筑':'DM'}</small><b>{item.name}</b><span>{item.id==='custom'&&!profile?.customDeck?'在卡组工坊创建':item.subtitle||'自定义战术'}</span></span>{item.id===deckId&&<Check size={18}/>}</button>)}</div><footer><span>八套免费预组 · 收藏卡牌可自由构筑</span><button onClick={()=>openPanel('deckEditor')} disabled={!profile||locked}>进入卡组工坊 <ArrowRight size={18}/></button></footer></>:<><div className="dl-tools"><button onClick={()=>openPanel('profile')} disabled={!profile||blocked}><Users size={24}/><span>玩家资料<small>{profile?.name||'连接中'}</small></span><ArrowRight size={18}/></button><button onClick={()=>openPanel('collection')} disabled={!profile||blocked}><Stack size={24}/><span>我的收藏<small>获得的卡牌与外观</small></span><ArrowRight size={18}/></button><button onClick={()=>openPanel('library')}><BookOpen size={24}/><span>卡牌图鉴<small>DM / GX 卡池与效果</small></span><ArrowRight size={18}/></button><button onClick={()=>openPanel('ranking')} disabled={!profile||blocked}><Trophy size={24}/><span>决斗排行<small>查看玩家对战记录</small></span><ArrowRight size={18}/></button><button onClick={()=>openPanel('cloud')} disabled={!profile||blocked}><CloudCheck size={24}/><span>账号与存档<small>{archiveLabel}</small></span><ArrowRight size={18}/></button><button onClick={()=>openPanel('settings')}><Gear size={24}/><span>游戏设置<small>画质、场景与声音</small></span><ArrowRight size={18}/></button></div><footer><span>游戏王：遗迹决斗</span><small>GX 第一弹</small></footer></>}
   </aside>
  </div>}
 </section>;
}
