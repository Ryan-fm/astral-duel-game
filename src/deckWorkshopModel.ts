import {cardLimit} from '../server/deckLimits.mjs';
export type DeckDraft={main:string[],extra:string[]};
export type DeckArea='main'|'extra';
export function deckSignature(draft:DeckDraft){return JSON.stringify([[...draft.main].sort(),[...draft.extra].sort()]);}
export function deckCapacity(profile:any,id:string,catalog:Record<string,any>){
 const card=catalog[id];if(!card)return 0;
 const owned=card.hiddenPool?(profile.collection?.[id]||0):3;
 return Math.min(owned,cardLimit(id));
}
export function workshopCards(profile:any,catalog:Record<string,any>,filter:{area:DeckArea,era:string,kind:string,query:string}){
 const query=filter.query.normalize('NFKC').toLowerCase().trim();
 return Object.values(catalog).filter(c=>deckCapacity(profile,c.id,catalog)>0&&(filter.area==='extra'?c.summonType==='fusion':c.summonType!=='fusion')&&(filter.era==='all'||c.era===filter.era)&&(filter.kind==='all'||c.kind===filter.kind)&&(!query||`${c.name} ${c.canonical||''}`.normalize('NFKC').toLowerCase().includes(query)));
}
export function editDeckCard(draft:DeckDraft,area:DeckArea,id:string,delta:1|-1,profile:any,catalog:Record<string,any>):DeckDraft{
 const list=draft[area],card=catalog[id],count=list.filter(v=>v===id).length;
 if(delta===1){
  if(!card||list.length>=(area==='main'?40:15)||count>=deckCapacity(profile,id,catalog)||(area==='extra')!==(card.summonType==='fusion'))return draft;
  return {...draft,[area]:[...list,id]};
 }
 if(!count)return draft;const next=[...list];next.splice(next.indexOf(id),1);return {...draft,[area]:next};
}
export function deckDraftIssues(draft:DeckDraft,profile:any,catalog:Record<string,any>){
 const issues:string[]=[];
 if(draft.main.length!==40)issues.push(draft.main.length<40?`主卡组还差 ${40-draft.main.length} 张`:'主卡组超过 40 张');
 if(draft.extra.length>15)issues.push('额外卡组超过 15 张');
 for(const area of ['main','extra'] as const){const counts:Record<string,number>={};for(const id of draft[area])counts[id]=(counts[id]||0)+1;
  for(const [id,n] of Object.entries(counts)){
   const c=catalog[id];if(!c){issues.push('包含未识别卡牌，请移除后重新保存');continue;}
   if((area==='extra')!==(c.summonType==='fusion'))issues.push(`${c.name}应放入${c.summonType==='fusion'?'额外':'主'}卡组`);
   if(n>deckCapacity(profile,id,catalog))issues.push(`${c.name}当前 ${n} 张，可用上限 ${deckCapacity(profile,id,catalog)} 张`);
  }
 }
 return issues;
}

/** Named recipes are a deck-building hint, not an additional legality restriction. */
export function fusionReadiness(draft:DeckDraft,catalog:Record<string,any>){
 const counts:Record<string,number>={};draft.main.forEach(id=>counts[id]=(counts[id]||0)+1);
 return [...new Set(draft.extra)].filter(id=>catalog[id]?.summonType==='fusion').map(id=>{
  const required:Record<string,number>={};(catalog[id].materials||[]).forEach((material:string)=>required[material]=(required[material]||0)+1);
  const materials=Object.entries(required).map(([id,need])=>({id,need,have:counts[id]||0,missing:Math.max(0,need-(counts[id]||0))}));
  const spells=draft.main.includes('polymerization')||catalog[id].archetype==='Elemental HERO'&&draft.main.includes('miracle_fusion');
  return {id,materials,spellReady:spells,ready:spells&&materials.every(m=>!m.missing)};
 });
}
