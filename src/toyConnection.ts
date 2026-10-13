import {createOfflineConnection} from './offlineConnection.ts';
import {ToyCloudSave} from './toyCloudSave.ts';
import {inToyContext,inToyPreviewContext,loadToySDK,platformMessage,type ToyAPI} from './toyPlatform.ts';
import {validateCustom,validateExtra} from '../server/gacha.mjs';
import {challengeScore} from '../server/ranking.mjs';
const LEGACY='astral-duel-toy-save-v1';
const memory={getItem:()=>null,setItem:()=>{}};
export async function createToyConnection(api?:ToyAPI){
 const preview=!api&&typeof location!=='undefined'&&inToyPreviewContext();
 let toy=api,cloud:ToyCloudSave|undefined,loaded:any=null,empty=true,notify=()=>{},cooldowns=0,retryAt=0,rankCache:any=null,submitted=-1;
 let legacy:any=null;try{legacy=JSON.parse(localStorage.getItem(LEGACY)||'null');}catch{}
 let storage:any={mode:'temporary',status:'guest',message:preview?'Toy 预览使用临时存档；账号云存档与挑战榜需正式作品页面':'游客试玩 · 本次进度不落盘',blocked:false,legacyAvailable:false,capable:!!api||(!preview&&inToyContext()),sdkReady:!!api};
 const change=(patch:any)=>{storage={...storage,...patch,retryAt};notify();};
 const call=async<T,>(fn:()=>Promise<T>):Promise<T>=>{
  if(Date.now()<retryAt)throw Error('B站请求繁忙，请稍后再重试');
  try{const v=await fn();cooldowns=0;retryAt=0;return v;}catch(e:any){
   if(e.code===307044){retryAt=Date.now()+Math.min(30000,1000*2**Math.min(5,cooldowns++));change({status:'error',message:platformMessage(e)});}
   const error:any=Error(platformMessage(e));if(e.commitUnknown)error.commitUnknown=true;throw error;
  }
 };
 if(api||(!preview&&inToyContext())){
  storage={...storage,mode:'cloud',status:'loading',blocked:true,message:'正在读取 B站云存档'};
  try{
   toy||=await loadToySDK();storage.sdkReady=true;cloud=new ToyCloudSave(toy);loaded=await call(()=>cloud!.load());if(loaded?.customDeck)validateCustom(loaded,loaded.customDeck,{allowLegacyRestrictions:true});if(loaded?.customExtra)validateExtra(loaded,loaded.customExtra);empty=!loaded;
   storage={...storage,status:'ready',blocked:false,message:'B站云存档已连接',legacyAvailable:empty&&!!legacy};
  }catch(e:any){storage={...storage,status:'load-error',message:e.message||platformMessage(e),blocked:true};}
 }
 async function persist(profile:any){
  if(!cloud||storage.mode!=='cloud'){return;}
  if(storage.blocked)throw Error(storage.message);
  change({status:'saving',message:'正在保存至 B站云端'});
  try{await call(()=>cloud!.save(profile));empty=false;change({status:'ready',message:'卡组与进度已存至 B站云端',legacyAvailable:false});}
  catch(e:any){change({status:'error',message:e.message,...(e.commitUnknown?{blocked:true}: {})});throw e;}
 }
 async function submit(profile:any){
  const score=challengeScore(profile);if(!toy||!profile.rankEnabled||score<=submitted)return;
  await call(()=>toy!.submitScore({board:1,score}));submitted=score;rankCache=null;
 }
 return createOfflineConnection(memory,{
  initialProfile:loaded,persist,storageState:()=>storage,subscribe:n=>{notify=n;return()=>{notify=()=>{};};},
  onSettled:async profile=>{try{await submit(profile);}catch(e:any){change({status:'error',message:'存档已保存，排行榜未同步：'+e.message});throw e;}},
  extra:async(m,ctx)=>{
   if(m.type==='cloud-guest'){if(ctx.game)throw Error('请返回大厅再切换存档');change({mode:'temporary',status:'guest',blocked:false,message:'游客试玩 · 进度只在本次页面保留'});return {};}
   if(m.type==='cloud-connect'){
    if(ctx.game)throw Error('请返回大厅再连接云存档');
    if(!toy)throw Error('请在 B站 Toy 页面连接账号；本地试玩不访问你的 B站存档');
    // Invoke before any await: first-time profile authorization requires a user gesture.
    let user;try{user=await toy.getUserProfile();}catch(e:any){throw Error(platformMessage(e));}
    cloud||=new ToyCloudSave(toy);const restored=await call(()=>cloud!.load());if(restored?.customDeck)validateCustom(restored,restored.customDeck,{allowLegacyRestrictions:true});if(restored?.customExtra)validateExtra(restored,restored.customExtra);empty=!restored;
    change({mode:'cloud',status:'ready',blocked:false,message:'B站云存档已连接',user:{nickname:user.nickname,avatar:user.avatar},legacyAvailable:empty&&!!legacy});
    if(restored)ctx.replace({...restored,customExtra:restored.customExtra??null});else {ctx.replace({name:user.nickname});if(!legacy)await ctx.save();}
    return {};
   }
   if(m.type==='cloud-import'){
    if(ctx.game||!cloud||storage.blocked||!empty||!legacy)throw Error('只有空的 B站云存档可以导入旧进度，现有云存档不会被覆盖');
    // Validate using the same cloud reader format and deck validator in the engine.
    if(!Array.isArray(legacy.completed)||!Array.isArray(legacy.cosmetics)||!Number.isSafeInteger(legacy.tickets)||legacy.tickets<0)throw Error('旧进度格式异常，未导入');
    if(legacy.customDeck)validateCustom(legacy,legacy.customDeck,{allowLegacyRestrictions:true});if(legacy.customExtra)validateExtra(legacy,legacy.customExtra);ctx.replace(legacy);await ctx.save();return {};
   }
   if(m.type==='cloud-sync'){
    if(!cloud||storage.blocked)throw Error('请先连接 B站云存档');await ctx.save();await submit(ctx.profile);return {};
   }
   if(m.type==='rank-join'){
    if(!toy||storage.blocked)throw Error('请先连接 B站云存档');
    const score=challengeScore(ctx.profile);await call(()=>toy!.submitScore({board:1,score}));
    submitted=score;ctx.replace({rankEnabled:true});rankCache=null;await ctx.save();return {};
   }
   if(m.type==='leaderboard'){
    if(!toy)throw Error('排行榜将在 B站 Toy 内展示真实玩家，本地不生成虚拟排名');
    if(rankCache&&!m.refresh)return {ranking:rankCache};
    const rows=await call(()=>toy!.getRankList({board:1,period:'all',limit:20}));
    let my=null;let myError='';if(!storage.blocked){try{my=await call(()=>toy!.getMyRank({board:1,period:'all'}));}catch(e:any){myError=e.message;}}
    rankCache={rows,my,myError};return {ranking:rankCache};
   }
   throw Error('不支持此操作');
  }
 });
}
