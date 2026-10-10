import {useEffect,useRef,useState} from 'react';
import {Stack,Lightning} from '@phosphor-icons/react';
import '@fontsource/roboto/latin-900-italic.css';

export function DuelIdentity({player,opponent=false,reduced=false}:{player:any,opponent?:boolean,reduced?:boolean}){
 const [displayLp,setDisplayLp]=useState(player.lp),[loss,setLoss]=useState(false),shown=useRef(player.lp);
 useEffect(()=>{
  const from=shown.current,to=player.lp;setLoss(to<from);
  if(reduced||matchMedia('(prefers-reduced-motion: reduce)').matches){shown.current=to;setDisplayLp(to);setLoss(false);return;}
  const start=performance.now();let frame=0;const tick=(now:number)=>{const t=Math.min(1,(now-start)/420);shown.current=Math.round(from+(to-from)*(1-Math.pow(1-t,3)));setDisplayLp(shown.current);if(t<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);const timer=setTimeout(()=>setLoss(false),600);return()=>{cancelAnimationFrame(frame);clearTimeout(timer);};
 },[player.lp,reduced]);
 return <div className={'duel-identity '+(opponent?'rival':'player')} aria-label={`${opponent?'对方':'我方'} ${player.name}，生命值 ${player.lp}`}>
  <img className="duel-hud-art" src="/game-assets/duel-hud-frame.png" alt=""/>
  <img className="duelist-portrait" src={opponent?'/game-assets/duelist-rival.png':'/game-assets/duelist-player.png'} alt=""/>
  <div className="duel-identity-copy"><span>{player.name}</span><div className={"duel-lp"+(loss&&!reduced?" has-loss":"")}><small>LP</small><strong aria-hidden="true">{displayLp}</strong></div><div className="duel-resource"><Stack size={12}/>牌组 {player.deckCount}<span>墓地 {player.grave.length}</span></div></div>
  <div className="duel-life-track"><i style={{width:`${Math.min(100,Math.max(0,player.lp/80))}%`}}/></div>
 </div>;
}
export function BattleCardSpotlight({game,catalog,enabled,skip=0,interacting=false}:{game:any,catalog:Record<string,any>,enabled:boolean,skip?:number,interacting?:boolean}){
 const [spotlight,setSpotlight]=useState<any>(null),seen=useRef(new Set<string>());
 const event=game.events?.filter((e:any)=>e.id&&e.type==='summon').at(-1),eventKey=event?.eventId||event?.id;
 useEffect(()=>{
  setSpotlight(null);if(!event||!enabled||seen.current.has(eventKey)||!catalog[event.id])return;
  seen.current.add(eventKey);setSpotlight({card:catalog[event.id],type:event.type,summonType:event.summonType});const timer=setTimeout(()=>setSpotlight(null),1250);return()=>clearTimeout(timer);
 },[game.id,eventKey,enabled,skip]);
 if(!spotlight||interacting)return null;
 return <div className={'battle-card-spotlight '+spotlight.type} aria-hidden="true"><div className="spotlight-copy"><Lightning size={16}/><span>{spotlight.summonType==='fusion'?'融合召唤':spotlight.summonType==='ritual'?'仪式召唤':spotlight.type==='summon'?'召唤登场':'效果发动'}</span><b>{spotlight.card.name}</b></div><img src={spotlight.card.face} alt="" draggable={false}/></div>;
}
