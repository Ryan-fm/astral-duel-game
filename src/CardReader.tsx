import {ArrowLeft} from '@phosphor-icons/react';

export default function CardReader({card,effectText,large,onLarge,onBack,backLabel}:{card:any,effectText:string,large:boolean,onLarge:(large:boolean)=>void,onBack:()=>void,backLabel:string}){
 return <div className={'card-reader'+(large?' large-text':'')}>
  <div className="reader-art"><img src={card?.face||'/game-assets/card-back.png'} alt={card?.name||'尚未公开的卡牌'} draggable={false}/></div>
  <section className="reader-copy" aria-label="中文卡牌说明">
   <div className="reader-heading"><span>{card?.kind==='spell'?'魔法卡':card?.kind==='trap'?'陷阱卡':card?.kind==='monster'?'怪兽卡':'隐藏卡牌'}</span><h2>{card?.name||'未知盖牌'}</h2>{card?.kind==='monster'&&<div className="reader-stats">★ {card.level} · ATK {card.atk} / DEF {card.def}</div>}</div>
   <div className="reader-text-controls" aria-label="说明字号"><button aria-pressed={!large} onClick={()=>onLarge(false)}>标准字</button><button aria-pressed={large} onClick={()=>onLarge(true)}>大字</button></div>
   <div className="reader-effect"><h3>卡牌说明</h3><p>{effectText}</p></div>
   <button className="soft-btn reader-back" onClick={onBack}><ArrowLeft/>{backLabel}</button>
  </section>
 </div>;
}
