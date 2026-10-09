import {useState} from 'react';
import {ArrowRight} from '@phosphor-icons/react';
import Game from './Game';
import './GameEntry.css';

export default function GameEntry(){
 const [entered,setEntered]=useState(false);
 const [reduced]=useState(()=>{
  try{return JSON.parse(localStorage.getItem('duel-settings')||'{}').reduced===true;}catch{return false;}
 });
 if(entered)return <div className={`entry-game${reduced?' entry-reduced':''}`}><Game/></div>;
 return <button type="button" className={`entry-screen${reduced?' entry-reduced':''}`} aria-label="点击进入游戏" onClick={()=>setEntered(true)} autoFocus>
  <span className="entry-ambient" aria-hidden="true"/>
  <span className="entry-stage">
   <img className="entry-art" src="/game-assets/entry-blue-eyes.jpg" alt="" draggable={false} fetchPriority="high"/>
   <span className="entry-logo"><span>YU-GI-OH! · RUINS DUEL</span><strong>游戏王：遗迹决斗</strong></span>
   <span className="entry-action"><span className="entry-action-line"/><span>点击进入游戏</span><ArrowRight size={22}/></span>
  </span>
  <span className="entry-rotate-note">横屏体验更佳</span>
 </button>;
}
