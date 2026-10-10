// DM named-material fusion and designated ritual spells. Only the controller's
// own hand, field and Extra Deck are read here, including their own set cards.
export function materialGroups(me,definition){
 const candidates=[...me.hand,...me.field.filter(Boolean)];const result=[];
 function visit(index,chosen){
  if(index===definition.materials.length){result.push(chosen.map(c=>c.uid));return;}
  for(const c of candidates)if(c.id===definition.materials[index]&&!chosen.some(x=>x.uid===c.uid))visit(index+1,[...chosen,c]);
 }
 visit(0,[]);return [...new Map(result.map(uids=>[[...uids].sort().join(','),uids])).values()];
}
export function ritualGroups(me,target,catalog){
 const candidates=[...me.hand,...me.field.filter(Boolean)].filter(c=>c.uid!==target.uid&&catalog[c.id]?.kind==='monster');const needed=catalog[target.id].level,result=[];
 function visit(start,chosen,total){
  if(total>=needed){if(chosen.every(c=>total-catalog[c.id].level<needed))result.push(chosen.map(c=>c.uid));return;}
  for(let i=start;i<candidates.length;i++)visit(i+1,[...chosen,candidates[i]],total+catalog[candidates[i].id].level);
 }
 visit(0,[],0);return result;
}
const zones=(me,uids)=>me.field.flatMap((c,i)=>!c||uids.includes(c.uid)?[i]:[]);
export function specialSpellActions(me,spell,base,catalog){
 if(spell.id==='polymerization'){
  const unique=[...new Map((me.extraDeck||[]).map(c=>[c.id,c])).values()];
  return unique.flatMap(c=>materialGroups(me,catalog[c.id]).flatMap(materialUids=>zones(me,materialUids).flatMap(zone=>['attack','defense'].map(position=>({...base,fusionId:c.id,materialUids,zone,position})))));
 }
 const targetId=catalog[spell.id].ritualFor;
 if(targetId)return me.hand.filter(c=>c.id===targetId).flatMap(c=>ritualGroups(me,c,catalog).flatMap(tributes=>zones(me,tributes).flatMap(zone=>['attack','defense'].map(position=>({...base,ritualUid:c.uid,tributes,zone,position})))));
 return null;
}
export function canRevive(card,catalog){return catalog[card?.id]?.kind==='monster'&&(!catalog[card.id].summonType||card.properSummoned===true);}
/** Resolve atomically: do not consume partial materials if a chain changed them. */
export function resolveSpecialSpell(g,e,catalog,{locate,remove,bury,event,log}){
 const me=g.players[e.player],fusion=e.id==='polymerization';if(!fusion&&!catalog[e.id].ritualFor)return false;
 const target=fusion?(me.extraDeck||[]).find(c=>c.id===e.fusionId):me.hand.find(c=>c.uid===e.ritualUid&&c.id===catalog[e.id].ritualFor);
 if(!target)return true;
 const uids=fusion?e.materialUids:e.tributes;
 const valid=fusion?materialGroups(me,catalog[target.id]):ritualGroups(me,target,catalog);
 if(!valid.some(list=>list.length===uids.length&&list.every(uid=>uids.includes(uid)))||!zones(me,uids).includes(e.zone))return true;
 for(const uid of uids)bury(g,uid);
 if(fusion)me.extraDeck.splice(me.extraDeck.indexOf(target),1);else remove(g,locate(g,target.uid));
 Object.assign(target,{faceUp:true,position:e.position,properSummoned:true,summonedTurn:g.turn,placedTurn:g.turn,attacked:false,bonus:0});
 me.field[e.zone]=target;log(g,me.name+(fusion?'融合召唤 ':'仪式召唤 ')+catalog[target.id].name);
 event(g,'summon',{uid:target.uid,player:e.player,id:target.id,summonType:fusion?'fusion':'ritual',materialIds:uids.map(uid=>locate(g,uid)?.card.id).filter(Boolean)});
 return true;
}
