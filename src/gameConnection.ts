import {io} from 'socket.io-client';
import {onlineEndpoint,onlinePath,checkOnlineAvailability} from './onlineConfig';
import {onlinePassport} from './onlinePassport';
import {createHybridConnection} from './hybridConnection';
export const IS_TOY=import.meta.env.VITE_TOY_MODE==='1';
export type GameConnection={connected:boolean;auth:any;on:(event:string,listener:(...args:any[])=>void)=>any;timeout:(ms:number)=>{emitWithAck:(event:string,message:any)=>Promise<any>};disconnect:()=>void};
export async function connectGame():Promise<GameConnection>{
 const solo=import.meta.env.VITE_DUEL_ONLINE_ENABLED==='0',endpoint=solo?null:onlineEndpoint(import.meta.env.VITE_DUEL_SERVER_URL);
 if(IS_TOY||solo){const {createToyConnection}=await import('./toyConnection');const offline=await createToyConnection();return createHybridConnection({offline,available:!!endpoint,unavailableReason:solo?'当前为单人版，人机、召唤与组卡可正常游玩':'联机服务尚未开放，可继续人机决斗',open:()=>openOnline(endpoint!),restore:!solo&&sessionStorage.getItem('duel-online-mode')==='1',modeChanged:online=>sessionStorage.setItem('duel-online-mode',online?'1':'0')});}
 return io(endpoint||undefined,{path:import.meta.env.VITE_DUEL_SOCKET_PATH||(location.hostname.endsWith('vercel.app')?'/api/duel/socket.io':'/socket.io'),transports:['websocket'],auth:{token:sessionStorage.getItem('duel-token')},reconnection:true,reconnectionDelay:500}) as GameConnection;
}
async function openOnline(endpoint:string):Promise<GameConnection>{
 // Check the kill switch before loading/creating an online identity.
 await checkOnlineAvailability(endpoint);
 const passport=await onlinePassport(endpoint),s=io(endpoint,{autoConnect:false,path:onlinePath(import.meta.env.VITE_DUEL_SOCKET_PATH),transports:['websocket'],auth:{token:passport.token},reconnection:true,reconnectionDelay:500,reconnectionDelayMax:3000});
 return new Promise((resolve,reject)=>{
  let token=passport.token,state:any=null,done=false,saving=false;
  const timer=setTimeout(()=>fail(Error('联机连接超时，请稍后重试')),12000);
  function fail(error:Error){if(done)return;done=true;clearTimeout(timer);s.disconnect();reject(error);}
  async function ready(){if(done||saving||!token||!state)return;saving=true;try{await passport.save(token);if(done)return;done=true;clearTimeout(timer);Object.assign(s,{initialState:state,cloudPassport:passport.cloud});s.off('state',receive);s.off('connect_error',fail);resolve(s as GameConnection);}catch(e:any){fail(Error('联机凭证保存失败，原存档未覆盖：'+e.message));}}
  function receive(v:any){state=v;void ready();}
  s.on('session',v=>{token=v.token;s.auth={token};void ready();});s.on('state',receive);s.on('connect_error',fail);s.connect();
 });
}
