import {useState} from 'react';
export default function BattleGraveyard({game,catalog,initialPlayer,onRead}:{game:any,catalog:Record<string,any>,initialPlayer:number,onRead:(id:string,player:number)=>void}){
 const [player,setPlayer]=useState(initialPlayer),[area,setArea]=useState<'grave'|'banished'>('grave'),cards=game.players[player][area]||[];
 return <section className="battle-graveyard" aria-label="公开墓地">
  <nav className="tabs">{[game.you,1-game.you].map(p=><button key={p} aria-pressed={player===p} className={player===p?'active':''} onClick={()=>setPlayer(p)}>{p===game.you?'我方':'对方'} · {(game.players[p][area]||[]).length}</button>)}</nav>
  <nav className="tabs" aria-label="公开卡牌区域">{(['grave','banished'] as const).map(key=><button key={key} aria-pressed={area===key} className={area===key?'active':''} onClick={()=>setArea(key)}>{key==='grave'?'墓地':'除外区'} · {(game.players[player][key]||[]).length}</button>)}</nav>
  <p>{area==='grave'?'墓地卡牌公开可查看。发动死者苏生后，可在目标面板选择任一墓地的合法怪兽。':'奇迹融合使用的素材会被除外。这些卡公开可查看，不能再作为墓地素材或苏生目标。'}</p>
  {cards.length?<div className="graveyard-grid">{[...cards].reverse().map((c:any)=>{const d=catalog[c.id];return <button key={c.uid} onClick={()=>onRead(c.id,player)} aria-label={`查看${d?.name}的卡面与说明`}><img src={d?.face} alt=""/><b>{d?.name}</b><small>{d?.kind==='monster'?`★${d.level} · ${d.atk} / ${d.def}`:d?.kind==='spell'?'魔法':'陷阱'}</small></button>;})}</div>:<div className="empty-graveyard"><b>{area==='grave'?'墓地暂无卡牌':'除外区暂无卡牌'}</b><p>{area==='grave'?'使用过的魔法、陷阱和被破坏或解放的怪兽会出现在这里。':'被奇迹融合除外的素材会出现在这里。'}</p></div>}
 </section>;
}
