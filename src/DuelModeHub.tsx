import {useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Compass,Flag,Gift,Lightning,Shield,Signpost,Sparkle,Sword,Users,WifiHigh,WifiSlash} from '@phosphor-icons/react';
import ArenaPicker from './ArenaPicker';
import {completedJourneyStages,JOURNEY_CHAPTERS,JOURNEY_STAGES,journeyProgress,type DuelHubMode} from './duelJourneyModel';
import './DuelModeHub.css';

export type DuelModeHubProps={
 initialMode:DuelHubMode;profile:any;deckName:string;decks:Array<{id:string;name:string}>;
 difficulty:string;opponentDeck:string;scene:string;busy:boolean;connected:boolean;onlineUnavailable:boolean;
 onDifficulty:(id:string)=>void;onOpponentDeck:(id:string)=>void;onScene:(id:string)=>void;
 onStart:(scenario?:string)=>void;onOnline:(intent:'queue'|'friend')=>void;onClose:()=>void;
};
const modes=[
 {id:'journey' as const,name:'王国试炼',subtitle:'重走决斗之路',Icon:Compass},
 {id:'practice' as const,name:'自由决斗',subtitle:'磨炼你的卡组',Icon:Sword},
 {id:'pvp' as const,name:'玩家对战',subtitle:'迎接真实对手',Icon:Users},
];
const difficulties=[{id:'easy',name:'简单',description:'直观出牌，熟悉卡组'},{id:'normal',name:'普通',description:'攻击收益与基础连锁'},{id:'hard',name:'困难',description:'保留资源，预判反击'}];

export default function DuelModeHub(props:DuelModeHubProps){
 const {initialMode,profile,deckName,decks,difficulty,opponentDeck,scene,busy,connected,onlineUnavailable,onDifficulty,onOpponentDeck,onScene,onStart,onOnline,onClose}=props;
 const [mode,setMode]=useState<DuelHubMode>(initialMode),progress=journeyProgress(profile?.completed),done=completedJourneyStages(profile?.completed);
 const [stageId,setStageId]=useState(()=>progress.nextId||JOURNEY_STAGES[0].id),selected=JOURNEY_STAGES.find(stage=>stage.id===stageId)||JOURNEY_STAGES[0];
 const chapter=JOURNEY_CHAPTERS.find(item=>item.id===selected.chapterId)!,cleared=done.has(selected.id),unavailable=busy||!connected;
 const titleId=useId(),contentId=useId(),backRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{backRef.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{setMode(initialMode);},[initialMode]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy){event.preventDefault();onClose();}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[busy,onClose]);
 function chooseMode(next:DuelHubMode){if(!busy)setMode(next);}
 return <section className={`duel-mode-hub is-${mode}`} aria-labelledby={titleId}>
  <div className="dmh-world" aria-hidden="true"/><div className="dmh-engraving" aria-hidden="true"/>
  <header className="dmh-header">
   <button type="button" className="dmh-back" ref={backRef} disabled={busy} onClick={onClose}><ArrowLeft size={20}/><span>返回大厅</span></button>
   <div className="dmh-title"><span>RUINS DUEL</span><h1 id={titleId}>决斗之门</h1></div>
   <div className={`dmh-connection ${connected?'':'is-offline'}`} role="status">{connected?<WifiHigh size={17}/>:<WifiSlash size={17}/>}<span>{connected?'决斗服务已连接':'正在恢复连接'}</span></div>
  </header>
  <div className="dmh-layout">
   <aside className="dmh-sidebar">
    <nav className="dmh-modes" aria-label="决斗模式">{modes.map(({id,name,subtitle,Icon})=><button type="button" key={id} className={mode===id?'is-active':''} aria-pressed={mode===id} aria-controls={contentId} disabled={busy} onClick={()=>chooseMode(id)}><Icon size={25} weight={mode===id?'duotone':'regular'}/><span><b>{name}</b><small>{subtitle}</small></span><ArrowRight className="dmh-mode-arrow" size={15}/></button>)}</nav>
    <div className="dmh-equipped"><Shield size={19}/><span>出战卡组<b title={deckName}>{deckName}</b></span></div>
    <div className="dmh-sidebar-seal" aria-hidden="true"><span>✦</span><i/></div>
   </aside>
   <div className="dmh-content" id={contentId}>
   {mode==='journey'?<>
    <div className="dmh-intro"><div><span className="dmh-overline">KINGDOM TRIALS</span><h2>王国试炼</h2></div><div className="dmh-progress"><span>试炼印记 <b>{progress.done}<i> / {progress.total}</i></b></span><div role="progressbar" aria-label="已完成试炼" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><i style={{width:`${progress.done/progress.total*100}%`}}/></div></div></div>
    <div className="dmh-journey-body">
     <div className="dmh-map" aria-label="王国试炼章节地图"><div className="dmh-map-note"><Signpost size={16}/><span>自由选择任意试炼；金色印记为已通关。</span>{progress.nextId&&<button type="button" disabled={busy} onClick={()=>setStageId(progress.nextId!)}>前往推荐关卡 <ArrowRight size={14}/></button>}</div>
      {JOURNEY_CHAPTERS.map(item=>{const completed=item.stageIds.filter(id=>done.has(id)).length;return <section className={`dmh-chapter ${item.id===chapter.id?'is-current':''}`} key={item.id} aria-label={item.name}><div className="dmh-chapter-title"><span className="dmh-roman">{item.sigil}</span><div><h3>{item.name}</h3><small>{item.theme}</small></div><span className="dmh-chapter-count" aria-label={`${completed} / 3 已完成`}>{completed}/3</span></div><div className="dmh-chapter-nodes">{item.stageIds.map((id,index)=>{const stage=JOURNEY_STAGES.find(s=>s.id===id)!,complete=done.has(id),recommend=progress.nextId===id;return <button type="button" key={id} disabled={busy} aria-pressed={selected.id===id} className={`dmh-node ${selected.id===id?'is-selected':''} ${complete?'is-complete':''} ${recommend?'is-recommended':''}`} onClick={()=>setStageId(id)} aria-label={`${stage.name}，${stage.kind==='lesson'?'教学':'挑战'}，${complete?'已通关':recommend?'推荐下一关':'未通关'}`}><span className="dmh-node-mark">{complete?<Check size={17} weight="bold"/>:stage.kind==='lesson'?<Flag size={17}/>:<Lightning size={17}/>}</span><span className="dmh-node-text"><small>{stage.kind==='lesson'?'教学':'挑战'}{recommend&&' · 推荐'}</small><b>{stage.name}</b></span><span className="dmh-node-step" aria-hidden="true">{index+1}</span></button>;})}</div></section>;})}
     </div>
     <aside className="dmh-stage-detail" aria-label="所选试炼详情">
      <div className="dmh-stage-scroll"><span className="dmh-overline">{chapter.name}</span><div className={`dmh-large-seal ${cleared?'is-complete':''}`} aria-hidden="true">{cleared?<Check weight="bold"/>:selected.kind==='lesson'?<Flag/>:<Lightning/>}</div><div className="dmh-stage-kind">{selected.kind==='lesson'?'基础教学':'实战挑战'}<span>{cleared?'已通关':'待挑战'}</span></div><h3>{selected.name}</h3><div className="dmh-objective"><b>试炼目标</b><p>{selected.objective}</p></div><div className="dmh-reward"><Gift size={20}/><div><b>{cleared?'首通奖励已领取':'首次通关奖励'}</b><span>{cleared?'重复挑战不重复发放首通奖励。':`胜利卡包 × ${selected.packs} · 召唤券 +${selected.tickets}`}</span></div></div><p className="dmh-scenario-note">使用预设局面练习；卡牌目标与素材由你亲自选择。</p></div>
      <button type="button" className="dmh-primary" disabled={unavailable} onClick={()=>onStart(selected.id)}><span>{busy?'准备决斗中…':cleared?'重温试炼':'进入试炼'}</span><ArrowRight size={21}/></button>
     </aside>
    </div>
   </>:mode==='practice'?<>
    <div className="dmh-intro"><div><span className="dmh-overline">FREE DUEL</span><h2>自由决斗</h2></div><span className="dmh-intro-note">尝试组合，掌握自己的节奏</span></div>
    <div className="dmh-setup-body"><div className="dmh-setup-scroll"><fieldset className="dmh-difficulties"><legend>对手强度</legend>{difficulties.map(item=><button type="button" key={item.id} aria-pressed={difficulty===item.id} disabled={busy} onClick={()=>onDifficulty(item.id)}><span className="dmh-choice-mark">{difficulty===item.id?<Check size={16}/>:<i/>}</span><span><b>{item.name}</b><small>{item.description}</small></span></button>)}</fieldset><label className="dmh-select">对方卡组<select value={opponentDeck} disabled={busy} onChange={event=>onOpponentDeck(event.target.value)}>{decks.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><ArenaPicker value={scene} disabled={busy} onChange={onScene}/></div>
     <aside className="dmh-duel-ready"><div className="dmh-ready-copy"><div className="dmh-large-seal" aria-hidden="true"><Sword/></div><span className="dmh-overline">YOUR DECK</span><h3>{deckName}</h3><div className="dmh-versus" aria-label="对阵">VS</div><p>{decks.find(item=>item.id===opponentDeck)?.name||'对手卡组'}</p><div className="dmh-reward"><Gift size={20}/><div><b>每次获胜 · 胜利卡包 × 1</b><span>每包 3 张卡，至少一张 R。</span></div></div><p className="dmh-scenario-note">难度只改变 AI 决策。不计玩家匹配胜败。</p></div><button type="button" className="dmh-primary" disabled={unavailable} onClick={()=>onStart()}><span>{busy?'准备决斗中…':'开始决斗'}</span><ArrowRight size={21}/></button></aside>
    </div>
   </>:<>
    <div className="dmh-intro"><div><span className="dmh-overline">PLAYER DUEL</span><h2>玩家对战</h2></div><span className="dmh-intro-note">让战术接受真正的考验</span></div>
    <div className="dmh-pvp-scroll"><div className={`dmh-service ${onlineUnavailable?'is-unavailable':''}`} role="status">{onlineUnavailable?<WifiSlash size={20}/>:<WifiHigh size={20}/>}<div><b>{onlineUnavailable?'当前试玩未开放实时对战':connected?'实时对战服务可用':'等待服务连接'}</b><p>{onlineUnavailable?'王国试炼和自由决斗仍可正常游玩。':connected?'选择一种对战方式，前往联机准备。':'恢复连接后即可进入对战。'}</p></div></div><div className="dmh-pvp-choices"><section><div className="dmh-pvp-sigil" aria-hidden="true"><Sword/></div><span className="dmh-overline">MATCH DUEL</span><h3>在线匹配</h3><p>寻找一位实时对手，以当前卡组进行一对一决斗。</p><ul><li>记录匹配胜败</li><li>暂不开段位与赛季</li></ul><button type="button" className="dmh-primary" disabled={unavailable||onlineUnavailable} onClick={()=>onOnline('queue')}><span>{busy?'正在进入…':'前往匹配'}</span><ArrowRight size={20}/></button></section><section><div className="dmh-pvp-sigil" aria-hidden="true"><Users/></div><span className="dmh-overline">FRIEND DUEL</span><h3>好友切磋</h3><p>创建或加入房间，用房间码邀请好友，再准备开战。</p><ul><li>不影响匹配战绩</li><li>房主选择竞技场</li></ul><button type="button" className="dmh-secondary" disabled={unavailable||onlineUnavailable} onClick={()=>onOnline('friend')}><span>{busy?'正在进入…':'进入好友房间'}</span><ArrowRight size={20}/></button></section></div>{onlineUnavailable&&<button type="button" className="dmh-offline-link" onClick={()=>chooseMode('practice')}>先进行自由决斗 <ArrowRight size={17}/></button>}</div>
   </>}
   </div>
  </div>
  <footer className="dmh-footer"><Sparkle size={14}/><span>{mode==='journey'?'每一次选择，都成为你的决斗印记。':mode==='practice'?'卡牌数值相同，胜负取决于你的判断。':'公平规则 · 服务器判定 · 隐藏手牌'}</span></footer>
 </section>;
}
