import {randomInt,randomUUID} from 'node:crypto';
import {CARDS} from './engine.mjs';
import {assertDeckLimits} from './deckLimits.mjs';
export const POOL=Object.values(CARDS).filter(c=>c.hiddenPool&&['DM','GX'].includes(c.era));
export const RATES={N:60,R:28,SR:10,UR:2};
const DUST={N:2,R:5,SR:20,UR:80};
export function initCollection(p){p.collection||={};p.tickets??=30;p.rewardPacks??=0;p.dust??=0;p.pity??=0;p.drawHistory||=[];p.claimedDate??=null;p.customDeck??=null;p.customExtra??=null;}
export function owned(p,id){return CARDS[id]?(CARDS[id].hiddenPool?(p.collection?.[id]||0):3):0;}
export function validateCustom(p,list,{allowLegacyRestrictions=false}={}){initCollection(p);if(!Array.isArray(list)||list.length!==40)throw new Error('卡组必须包含 40 张卡牌');const counts={};for(const id of list){if(typeof id!=='string'||!CARDS[id])throw new Error('包含未知卡牌');if(CARDS[id].summonType==='fusion')throw new Error('融合怪兽只能加入额外卡组');counts[id]=(counts[id]||0)+1;if(counts[id]>3)throw new Error('同一种卡最多加入 3 张');if(counts[id]>owned(p,id))throw new Error('卡牌持有数量不足');}if(!allowLegacyRestrictions)assertDeckLimits(list,CARDS);return [...list];}
export function validateExtra(p,list=[]){initCollection(p);if(!Array.isArray(list)||list.length>15)throw new Error('额外卡组最多 15 张');const counts={};for(const id of list){if(typeof id!=='string'||CARDS[id]?.summonType!=='fusion')throw new Error('本版额外卡组只接受融合怪兽');counts[id]=(counts[id]||0)+1;if(counts[id]>3||counts[id]>owned(p,id))throw new Error('额外卡牌超过持有数量或 3 张上限');}return [...list];}
export function pull(p,count,requestId,roll=randomInt,now=Date.now()){
 initCollection(p);const previous=p.drawHistory.find(d=>d.requestId===requestId);if(previous)return previous;
 if(![1,10].includes(count))throw new Error('仅支持单抽或十连召唤');if(p.tickets<count)throw new Error('召唤券不足，可领取每日补给或完成教学／挑战');
 if(!POOL.length)throw new Error('秘藏卡池暂不可用');
 p.tickets-=count;return drawCards(p,count,requestId,roll,now,'tickets');
}
export function openRewardPack(p,requestId,roll=randomInt,now=Date.now()){
 initCollection(p);const previous=p.drawHistory.find(d=>d.requestId===requestId);if(previous)return previous;
 if(p.rewardPacks<1)throw Error('暂无胜利卡包，击败自由练习 AI 或首次通关教学／挑战可获得');
 if(!POOL.length)throw Error('秘藏卡池暂不可用');
 p.rewardPacks--;return drawCards(p,3,requestId,roll,now,'victory-pack');
}
function drawCards(p,count,requestId,roll,now,source){
 const results=[];let high=false,rare=false;
 for(let i=0;i<count;i++){
  const chance=roll(10000);let rarity=chance<6000?'N':chance<8800?'R':chance<9800?'SR':'UR';let guaranteed=null;
  if(p.pity>=49){rarity='UR';guaranteed='pity';}
  else if(count===10&&i===9&&!high&&!['SR','UR'].includes(rarity)){rarity='SR';guaranteed='ten';}
  else if(source==='victory-pack'&&i===2&&!rare&&rarity==='N'){rarity='R';guaranteed='pack';}
  const bucket=POOL.filter(c=>c.rarity===rarity);const c=bucket[roll(bucket.length)];const before=p.collection[c.id]||0;
  p.collection[c.id]=Math.min(3,before+1);const dust=before>=3?DUST[rarity]:0;p.dust+=dust;p.pity=rarity==='UR'?0:p.pity+1;
  high ||= ['SR','UR'].includes(rarity);rare ||= rarity!=='N';results.push({cardId:c.id,rarity,isNew:before===0,copy:p.collection[c.id],dust,guaranteed});
 }
 const batch={id:randomUUID(),requestId,at:now,count,source,results,ticketsAfter:p.tickets,packsAfter:p.rewardPacks,pityAfter:p.pity};p.drawHistory.unshift(batch);p.drawHistory=p.drawHistory.slice(0,100);return batch;
}
export function claimDaily(p,now=Date.now()){initCollection(p);const today=new Date(now+8*3600000).toISOString().slice(0,10);if(p.claimedDate===today)throw new Error('今日补给已领取，明天再来');p.claimedDate=today;p.tickets+=10;return 10;}
export function collectionView(p){initCollection(p);return {cardCatalog:Object.fromEntries(Object.keys(p.collection).filter(id=>CARDS[id]?.hiddenPool).map(id=>[id,CARDS[id]])),collection:p.collection,tickets:p.tickets,rewardPacks:p.rewardPacks,dust:p.dust,pity:p.pity,claimedDate:p.claimedDate,customDeck:p.customDeck,customExtra:p.customExtra,poolEra:'DM / GX',cardPoolVersion:'gx-1',poolOwned:POOL.filter(c=>p.collection[c.id]>0).length,legacyOwned:Object.keys(p.collection).filter(id=>CARDS[id]?.hiddenPool&&!['DM','GX'].includes(CARDS[id].era)).length,baseSize:Object.values(CARDS).filter(c=>!c.hiddenPool).length,lastDraw:p.drawHistory[0]||null,drawHistory:p.drawHistory.slice(0,5),rates:RATES,poolSize:POOL.length};}
