import {useState} from 'react';
import {Eye,Stack,ArrowRight} from '@phosphor-icons/react';
import {visiblePileCards,type PublicPile} from './graveyardModel';
import './BattleGraveyard.css';
export default function BattleGraveyard({game,catalog,initialPlayer,initialArea='grave',initialUid='',effectText,onRead}:{game:any,catalog:Record<string,any>,initialPlayer:number,initialArea?:PublicPile,initialUid?:string,effectText:(id:string)=>string,onRead:(id:string,player:number,area:PublicPile,uid:string)=>void}){
 const [player,setPlayer]=useState(initialPlayer),[area,setArea]=useState<PublicPile>(initialArea),[kind,setKind]=useState('all'),[selected,setSelected]=useState(initialUid);
 const cards=visiblePileCards(game,player,area),filtered=cards.filter((c:any)=>kind==='all'||catalog[c.id]?.kind===kind),card=filtered.find((c:any)=>c.uid===selected)||filtered[0],def=catalog[card?.id];
 function switchPlayer(p:number){setPlayer(p);setSelected('');}
 return <section className="battle-graveyard" aria-label="公开墓地">
  <header className="pile-browser-header"><span className="pile-eyebrow">PUBLIC CARD ARCHIVE</span><nav className="pile-owner-tabs" aria-label="墓地所属玩家">{[game.you,1-game.you].map(p=><button key={p} aria-pressed={player===p} onClick={()=>switchPlayer(p)}><span>{p===game.you?'我方':'对方'}</span><b>{game.players[p].name}</b></button>)}</nav></header>
  <nav className="pile-area-tabs" aria-label="公开卡牌区域">{(['grave','banished'] as const).map(key=><button key={key} aria-pressed={area===key} onClick={()=>{setArea(key);setSelected('');}}><Stack size={17}/>{key==='grave'?'墓地':'除外区'}<b>{(game.players[player][key]||[]).length}</b></button>)}</nav>
  <div className="pile-browser-body">
   <aside className="pile-detail" aria-label="墓地卡牌预览">{def?<><button className="pile-card-preview" aria-label={`放大查看${def.name}`} onClick={()=>onRead(card.id,player,area,card.uid)}><img src={def.face} alt={def.name} draggable={false}/><span><Eye size={15}/> 放大卡面</span></button><div className="pile-card-copy"><small>{def.kind==='monster'?`怪兽 / ★ ${def.level}`:def.kind==='spell'?'魔法卡':'陷阱卡'}</small><h3>{def.name}</h3>{def.kind==='monster'&&<strong>ATK {def.atk} <i>/</i> DEF {def.def}</strong>}<p>{effectText(card.id)}</p><button className="pile-read-more" onClick={()=>onRead(card.id,player,area,card.uid)}>完整说明 <ArrowRight size={15}/></button></div></>:<div className="pile-empty-preview"><Stack size={40}/><span>等待卡牌进入{area==='grave'?'墓地':'除外区'}</span></div>}</aside>
   <div className="pile-library"><div className="pile-list-heading"><b>{area==='grave'?'墓地档案':'除外档案'} <small>{filtered.length}</small></b><span>最近进入的卡在前</span></div>
    <nav className="pile-kind-tabs" aria-label="墓地卡牌类型">{[['all','全部'],['monster','怪兽'],['spell','魔法'],['trap','陷阱']].map(([v,label])=><button key={v} aria-pressed={kind===v} onClick={()=>{setKind(v);setSelected('');}}>{label}</button>)}</nav>
    {filtered.length?<div className="pile-card-grid">{filtered.map((c:any,i:number)=>{const d=catalog[c.id];return <button key={c.uid} className={c.uid===card?.uid?'is-selected':''} aria-pressed={c.uid===card?.uid} aria-label={`查看${d?.name||'卡牌'}的卡面与说明`} onClick={()=>setSelected(c.uid)}><span className="pile-card-index">{String(i+1).padStart(2,'0')}</span><img src={d?.face} alt="" draggable={false}/><b>{d?.name}</b><small>{c.uid===cards[0]?.uid?'最近进入':d?.kind==='monster'?`★ ${d.level}`:d?.kind==='spell'?'魔法':'陷阱'}</small></button>})}</div>:<div className="pile-empty"><Stack size={32}/><b>{cards.length?'没有此类型的卡牌':area==='grave'?'墓地暂无卡牌':'除外区暂无卡牌'}</b><p>{area==='grave'?'被破坏、解放或使用后的卡牌会出现在这里。':'被除外的卡牌会单独保存在这里。'}</p></div>}
   </div>
  </div>
  <footer className="pile-browser-footer"><span>公开区域 · 双方均可查看</span><small>{area==='grave'?'苏生与融合仍需通过合法效果选择目标':'除外卡不能直接作为墓地卡使用'}</small></footer>
 </section>;
}
