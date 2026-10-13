import {useState} from 'react';
export default function BattleGraveyard({game,catalog,initialPlayer,onRead}:{game:any,catalog:Record<string,any>,initialPlayer:number,onRead:(id:string,player:number)=>void}){
 const [player,setPlayer]=useState(initialPlayer),cards=game.players[player].grave;
 return <section className="battle-graveyard" aria-label="公开墓地">
  <nav className="tabs">{[game.you,1-game.you].map(p=><button key={p} aria-pressed={player===p} className={player===p?'active':''} onClick={()=>setPlayer(p)}>{p===game.you?'我方墓地':'对方墓地'} · {game.players[p].grave.length}</button>)}</nav>
  <p>墓地卡牌公开可查看。发动死者苏生后，可在目标面板选择任一墓地的合法怪兽。</p>
  {cards.length?<div className="graveyard-grid">{[...cards].reverse().map((c:any)=>{const d=catalog[c.id];return <button key={c.uid} onClick={()=>onRead(c.id,player)} aria-label={`查看${d?.name}的卡面与说明`}><img src={d?.face} alt=""/><b>{d?.name}</b><small>{d?.kind==='monster'?`★${d.level} · ${d.atk} / ${d.def}`:d?.kind==='spell'?'魔法':'陷阱'}</small></button>;})}</div>:<div className="empty-graveyard"><b>墓地暂无卡牌</b><p>使用过的魔法、陷阱和被破坏或解放的怪兽会出现在这里。</p></div>}
 </section>;
}
