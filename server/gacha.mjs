import {randomInt,randomUUID} from 'node:crypto';
import {CARDS} from './engine.mjs';
export const POOL=Object.values(CARDS).filter(c=>c.hiddenPool);
export const RATES={N:60,R:28,SR:10,UR:2};
const DUST={N:2,R:5,SR:20,UR:80};
export function initCollection(p){p.collection||={};p.tickets??=30;p.dust??=0;p.pity??=0;p.drawHistory||=[];p.claimedDate??=null;p.customDeck??=null;}
export function owned(p,id){return CARDS[id]?(CARDS[id].hiddenPool?(p.collection?.[id]||0):3):0;}
export function validateCustom(p,list){initCollection(p);if(!Array.isArray(list)||list.length!==40)throw new Error('卡组必须包含 40 张卡牌');const counts={};for(const id of list){if(typeof id!=='string'||!CARDS[id])throw new Error('包含未知卡牌');counts[id]=(counts[id]||0)+1;if(counts[id]>3)throw new Error('同一种卡最多加入 3 张');if(counts[id]>owned(p,id))throw new Error('卡牌持有数量不足');}return [...list];}
export function pull(p,count,requestId,roll=randomInt,now=Date.now()){
 initCollection(p);const previous=p.drawHistory.find(d=>d.requestId===requestId);if(previous)return previous;
 if(![1,10].includes(count))throw new Error('仅支持单抽或十连召唤');if(p.tickets<count)throw new Error('召唤券不足，可领取每日补给或完成教学／挑战');
 if(!POOL.length)throw new Error('秘藏卡池暂不可用');
 p.tickets-=count;const results=[];let high=false;
 for(let i=0;i<count;i++){
  const chance=roll(10000);let rarity=chance<6000?'N':chance<8800?'R':chance<9800?'SR':'UR';let guaranteed=null;
  if(p.pity>=49){rarity='UR';guaranteed='pity';}
  else if(count===10&&i===9&&!high&&!['SR','UR'].includes(rarity)){rarity='SR';guaranteed='ten';}
  const bucket=POOL.filter(c=>c.rarity===rarity);const c=bucket[roll(bucket.length)];const before=p.collection[c.id]||0;
  p.collection[c.id]=Math.min(3,before+1);const dust=before>=3?DUST[rarity]:0;p.dust+=dust;p.pity=rarity==='UR'?0:p.pity+1;
  high ||= ['SR','UR'].includes(rarity);results.push({cardId:c.id,rarity,isNew:before===0,copy:p.collection[c.id],dust,guaranteed});
 }
 const batch={id:randomUUID(),requestId,at:now,count,results,ticketsAfter:p.tickets,pityAfter:p.pity};p.drawHistory.unshift(batch);p.drawHistory=p.drawHistory.slice(0,100);return batch;
}
export function claimDaily(p,now=Date.now()){initCollection(p);const today=new Date(now+8*3600000).toISOString().slice(0,10);if(p.claimedDate===today)throw new Error('今日补给已领取，明天再来');p.claimedDate=today;p.tickets+=10;return 10;}
export function collectionView(p){initCollection(p);return {cardCatalog:Object.fromEntries(Object.keys(p.collection).filter(id=>CARDS[id]?.hiddenPool).map(id=>[id,CARDS[id]])),collection:p.collection,tickets:p.tickets,dust:p.dust,pity:p.pity,claimedDate:p.claimedDate,customDeck:p.customDeck,lastDraw:p.drawHistory[0]||null,drawHistory:p.drawHistory.slice(0,5),rates:RATES,poolSize:POOL.length};}
