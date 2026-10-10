const aliases:Record<string,string[]>={blue_eyes:['青眼白龍','青眼百龙'],dark_magician:['黑魔导士','黑魔導','黑魔术师'],red_eyes:['真红眼黑龍','真红眼'],summoned_skull:['恶魔召唤','惡魔的召喚'],battle_ox:['牛头人'],celtic_guardian:['精靈劍士'],mystical_elf:['神秘精灵'],giant_soldier:['岩石巨兵'],kuriboh:['栗子球']};
const clean=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function voiceHand(game:any,catalog:Record<string,any>){return [...(game?.players?.[game.you]?.hand||[]),...(game?.players?.[game.you]?.extraDeck||[])].filter((c:any)=>catalog[c.id]?.kind==='monster');}
export function planVoiceSummon(game:any,catalog:Record<string,any>,request:{text?:string,uid?:string,position?:string}){
 if(!game||game.result||game.paused||game.window||game.active!==game.you||!['main1','main2'].includes(game.phase))return {error:'现在不是我方可召唤的主要阶段'};
 const text=clean(request.text||'');let hand=voiceHand(game,catalog);
 if(request.uid)hand=hand.filter((c:any)=>c.uid===request.uid);
 else {
  const ids=new Set(hand.filter((c:any)=>[catalog[c.id].name,...aliases[c.id]||[]].some(name=>text.includes(clean(name)))).map((c:any)=>c.id));
  if(ids.size>1)return {error:'听到了多个卡名，请一次只说一只怪兽'};
  hand=hand.filter((c:any)=>ids.has(c.id));
 }
 if(!hand.length)return {error:request.uid?'这张卡已不在手牌中':'没有匹配到手牌怪兽，请说完整卡名'};
 const card=hand[0],position=request.position||(/守备|守備|盖放|蓋放/.test(text)?'defense':'attack');
 const type=catalog[card.id].summonType;
 let actions=(game.legal||[]).filter((a:any)=>a.position===position&&(type==='fusion'?a.fusionId===card.id:type==='ritual'?a.ritualUid===card.uid:a.kind==='summon'&&a.cardUid===card.uid));
 if(actions.length)actions=actions.filter((a:any)=>a.cardUid===actions[0].cardUid);
 if(!actions.length)return {error:'这张怪兽当前无法召唤，请检查次数、落点、配套魔法与素材'};
 const zones=[...new Set<number>(actions.map((a:any)=>a.zone))].sort((a,b)=>Math.abs(a-2)-Math.abs(b-2)||a-b);
 actions=actions.filter((a:any)=>a.zone===zones[0]);
 return {uid:actions[0].cardUid,name:catalog[card.id].name,actions,zone:zones[0],position,id:game.id,version:game.version,needsChoice:actions.some((a:any)=>a.tributes?.length>0||a.materialUids?.length>0||a.fusionId||a.ritualUid)};
}
/** Noise-calibrated sustained amplitude; never claims to recognize spoken words. */
export class VoiceEnergyGate {
 private noise:number[]=[];private above=0;private last:number|null=null;private done=false;
 sample(rms:number,time:number){
  if(this.done)return false;
  if(time<650){this.noise.push(Math.max(0,rms));this.last=time;return false;}
  const base=this.noise.length?[...this.noise].sort((a,b)=>a-b)[Math.floor(this.noise.length/2)]:.01;
  const delta=this.last===null?0:Math.min(80,Math.max(0,time-this.last));this.last=time;
  this.above=rms>Math.max(.07,base*3.2)?this.above+delta:0;
  if(this.above>=300){this.done=true;return true;}return false;
 }
}
