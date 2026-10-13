import {findVisibleCard} from './battleModel';
import {materialChoice,type ActionSelection} from './actionChoices';
const names:Record<string,string>={position:'表示',zone:'区域',tributes:'选择祭品',targetUid:'选择目标',fusionId:'选择融合怪兽',ritualUid:'选择仪式怪兽',materialUids:'选择融合素材'};
export default function ActionChoiceGroup({selection:s,index,game,catalog,label,onChoice}:{selection:ActionSelection,index:number,game:any,catalog:Record<string,any>,label:(key:string,value:string)=>string,onChoice:(index:number,value:string)=>void}){
 const material=['tributes','materialUids'].includes(s.key),selected=material?JSON.parse(s.value||'[]') as string[]:[];
 const groups=material?s.options.map(v=>JSON.parse(v) as string[]):[];
 const uids=[...new Set(groups.flat())],total=selected.reduce((sum,uid)=>sum+(catalog[findVisibleCard(game,uid)?.card.id]?.level||0),0);
 return <section className={'choice-group choice-'+s.key} aria-label={names[s.key]}>
  <div><span>{names[s.key]}</span><small>{!s.enabled?'先完成上一步选择':material?`已选 ${selected.length} 张 · 等级合计 ${total}`:s.required&&!s.complete?'请点选，不会自动决定':s.complete&&s.required?'已选择':''}</small></div>
  <div className={'choice-buttons '+(s.required?'visual-choices':'')}>
   {material?uids.map(uid=>{const loc=findVisibleCard(game,uid),d=catalog[loc?.card.id],next=materialChoice(s,uid),checked=selected.includes(uid);return <button key={uid} className={'choice-card '+(checked?'selected':'')} aria-pressed={checked} disabled={!s.enabled||!checked&&next===s.value} onClick={()=>onChoice(index,next)}><img src={d?.face} alt=""/><span><b>{d?.name}</b><small>{loc?.area==='hand'?'手牌':'场上'} · ★{d?.level}</small></span></button>;}):s.options.map(v=>{const value=JSON.parse(v),loc=s.key==='fusionId'?null:findVisibleCard(game,value),d=s.key==='fusionId'?catalog[value]:catalog[loc?.card.id],visual=s.required&&d;return <button key={v} className={(visual?'choice-card ':'')+(s.value===v?'selected':'')} aria-pressed={s.value===v} disabled={!s.enabled} onClick={()=>onChoice(index,v)}>{visual&&<img src={d.face} alt=""/>}<span>{label(s.key,v)}</span></button>;})}
  </div>
  {material&&s.value&&<p className="material-status">{s.complete?'素材已满足 · 点击下方确认发动':'继续点选素材；未确认前不会送入墓地'}{selected.length>0&&<button className="text-btn" onClick={()=>onChoice(index,'[]')}>清空选择</button>}</p>}
 </section>;
}
