import {ArrowUpRight} from '@phosphor-icons/react';
import {cards} from './cardRegistry';
import './LobbyShowcase.css';

/** Reuses the original illustrated presentation; card faces stay intact and readable. */
export default function LobbyShowcase({heroId,companions,onInspect,reduced}:{heroId:string,companions:string[],onInspect:()=>void,reduced:boolean}){
 const hero=cards[heroId];
 const cutout=heroId==='blue_eyes'||heroId==='dark_magician';
 const art=cutout?`/game-assets/${heroId==='blue_eyes'?'blue-eyes':'dark-magician'}.png`:hero.art;
 return <section className={`lobby-showcase ${reduced?'is-still':''}`} aria-label="当前卡组代表卡展示">
  <div className="showcase-scene" key={heroId}>
   <div className="showcase-aura" aria-hidden="true"/>
   <div className={`showcase-art ${cutout?'is-cutout':''}`} aria-hidden="true"><img src={art} alt="" draggable={false}/></div>
   <img className="showcase-circle" src="/game-assets/summon-circle.png" alt="" draggable={false}/>
   <div className="showcase-fan">
    {companions.slice(0,2).map((id,i)=><img key={id} className={`showcase-companion companion-${i}`} src={cards[id].face} alt="" aria-hidden="true" draggable={false}/>)}
    <button className="showcase-card" onClick={onInspect} aria-label={`查看${hero.name}完整卡面与详情`}>
     <img src={hero.face} alt={hero.name} draggable={false}/><span className="card-foil" aria-hidden="true"/>
     <span className="showcase-inspect">查看卡牌 <ArrowUpRight size={14}/></span>
    </button>
   </div>
  </div>
 </section>;
}
