// Verified against https://www.bilibili.com/toy/publish/sdk (2026-10-10).
export type RankRow={rank:number,score:number,nickname:string,avatar:string};
export type RankResult={rows:RankRow[],my:{ranked:boolean,rank:number,score:number}|null};
export type ToyAPI={
 isSupport:(ability:string)=>Promise<boolean>;
 getUserProfile:()=>Promise<{nickname:string,avatar:string,toyOpenId?:string}>;
 getCloudStorage:(keys?:string[])=>Promise<Record<string,string>>;
 setCloudStorage:(items:Record<string,string>)=>Promise<void>;
 submitScore:(req:{board?:number,score:number})=>Promise<{score:number}>;
 getRankList:(req?:{board?:number,period?:'all'|'week',limit?:number})=>Promise<RankRow[]>;
 getMyRank:(req?:{board?:number,period?:'all'|'week'})=>Promise<{ranked:boolean,rank:number,score:number}>;
 requestMicrophone:()=>Promise<MediaStream>;
 stopMedia:(stream:MediaStream)=>Promise<void>;
};
declare global {interface Window {toy?:ToyAPI}}
export const TOY_SDK_URL='https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js';
// Toy embeds the game on www.bilibilitoy.com; the parent page uses bilibili.com.
// This selects the platform adapter only. SDK/account authorization remains separate.
export function inToyContext(context:Pick<Location,'hostname'|'pathname'>=location){
 return (/^(?:www\.)?bilibilitoy\.com$/i.test(context.hostname)||/(^|\.)bilibili\.com$/i.test(context.hostname))&&/^\/toy\//.test(context.pathname);
}
export function inToyPreviewContext(context:Pick<Location,'hostname'|'pathname'>=location){return inToyContext(context)&&/^\/toy\/preview\//.test(context.pathname);}
let loading:Promise<ToyAPI>|null=null;
export function loadToySDK():Promise<ToyAPI>{
 if(window.toy)return Promise.resolve(window.toy);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=TOY_SDK_URL;script.async=true;
  const timer=setTimeout(()=>{script.remove();loading=null;reject(Error('B站能力加载超时，请重试'));},10000);
  script.onload=()=>{clearTimeout(timer);if(window.toy)resolve(window.toy);else {loading=null;reject(Error('B站能力初始化失败'));}};
  script.onerror=()=>{clearTimeout(timer);script.remove();loading=null;reject(Error('B站能力暂时无法加载'));};document.head.append(script);
 });return loading;
}
export function platformMessage(error:any){
 if(error?.code===307044)return 'B站请求繁忙，已暂停请求，请稍后重试';
 if(error?.type==='unauthorized'||error?.code===-101)return '请先登录 B站，再连接云存档';
 if(['denied','user_denied','permission_denied'].includes(error?.type)||error?.name==='NotAllowedError')return '授权未开启，你可以继续游玩，或重新连接';
 if(error?.type==='unsupported'||error?.type==='toy_context_unavailable')return '请在 B站 Toy 页面使用此能力';
 return error?.message?.startsWith('[ToySDK]')?'B站服务暂时不可用，请稍后重试':error?.message||'连接失败，请稍后重试';
}
