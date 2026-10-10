import type {GameConnection} from './gameConnection';
type Dependencies={offline:GameConnection,available:boolean,unavailableReason?:string,open:()=>Promise<GameConnection>,restore?:boolean,modeChanged?:(online:boolean)=>void};
// The Toy archive stays mounted and intact. Entering/leaving online mode switches
// whole profiles, never imports client-authored card ownership into PK.
export function createHybridConnection({offline,available,unavailableReason='联机服务尚未配置，可继续人机决斗',open,restore=false,modeChanged=()=>{}}:Dependencies):GameConnection{
 const listeners=new Map<string,Array<(...args:any[])=>void>>();let active=offline,remote:GameConnection|null=null,latest:any=null,offlineState:any=null,opening=false,disposed=false;
 const emit=(event:string,...args:any[])=>{for(const fn of listeners.get(event)||[])fn(...args);};
 function state(s:GameConnection,v:any){if(s===offline)offlineState=v;if(s!==active)return;latest=v;emit('state',{...v,online:{available,active:s!==offline,...(!available?{message:unavailableReason}:{})},storage:s===offline?v.storage:{...v.storage,cloudPassport:(s as any).cloudPassport,message:(s as any).cloudPassport?'联机收藏已存至服务器 · B站云凭证':'联机收藏已存至服务器 · 当前页面身份'}});}
 function wire(s:GameConnection){s.on('state',v=>state(s,v));for(const event of ['connect','disconnect','notice','connect_error'])s.on(event,(...args)=>{if(s===active)emit(event,...args);});}
 wire(offline);
 const connection:GameConnection={get connected(){return active.connected&&!opening;},get auth(){return active.auth;},set auth(v){active.auth=v;},on(event,fn){listeners.set(event,[...(listeners.get(event)||[]),fn]);return this;},timeout(ms){return {emitWithAck:async(event,m)=>{
  if(m.type==='online-open'){
   if(!available)return {ok:false,error:unavailableReason};
   if(latest?.game||latest?.room||latest?.queue)return {ok:false,error:'请先返回大厅再切换联机身份'};
   if(active!==offline)return {ok:true};if(opening)return {ok:false,error:'正在连接联机服务'};opening=true;
   try{const s=await open();if(disposed){s.disconnect();throw Error('连接已关闭');}remote=s;wire(s);active=s;latest=(s as any).initialState;modeChanged(true);emit('connect');state(s,latest);return {ok:true,customAvailable:!!latest?.profile?.customDeck,resumed:!!(latest?.game||latest?.room||latest?.queue)};}
   catch(e:any){return {ok:false,error:e.message||'联机服务暂时不可用，请稍后重试'};}finally{opening=false;}
  }
  if(m.type==='online-close'){
   if(latest?.game||latest?.room||latest?.queue)return {ok:false,error:'请先退出对局、房间或匹配再返回 Toy 存档'};
   active=offline;remote?.disconnect();remote=null;modeChanged(false);latest=offlineState;emit('connect');if(latest)state(offline,latest);return {ok:true};
  }
  return active.timeout(ms).emitWithAck(event,m);
 }};},disconnect(){disposed=true;remote?.disconnect();offline.disconnect();listeners.clear();}};
 if(restore&&available)setTimeout(()=>{if(!disposed)void connection.timeout(12000).emitWithAck('command',{type:'online-open'}).then(r=>{if(!r.ok)emit('notice','联机恢复失败：'+r.error);});},0);
 return connection;
}
